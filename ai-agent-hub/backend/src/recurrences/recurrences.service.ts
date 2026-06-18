import { Injectable, Logger } from '@nestjs/common';
import type { Recurrence } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ToolsService } from '../tools/tools.service';
import { MarketplaceClient } from './marketplace.client';
import type { CheckoutDraft, RecurrenceView } from '../ai/agent.types';

export type Cadence = 'daily' | 'weekly';

export interface CreateRecurrenceInput {
  prompt: string;
  label: string;
  marketplace?: string | null;
  drafts: CheckoutDraft[];
  cadence: Cadence;
  weekday?: number | null;
  hour: number;
  minute: number;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Owns recurring agent tasks: the user schedules them through the agent ("order
 * my usual every Friday"), and a once-a-minute cron sweep fires the due ones —
 * re-pricing each stored draft against live inventory, then placing it in the
 * marketplace via the trusted agent service path. Scoped per clerkId.
 */
@Injectable()
export class RecurrencesService {
  private readonly logger = new Logger(RecurrencesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tools: ToolsService,
    private readonly market: MarketplaceClient,
  ) {}

  async create(clerkId: string, input: CreateRecurrenceInput): Promise<RecurrenceView | null> {
    if (!this.prisma.connected) return null;
    const nextRunAt = computeNextRun(input.cadence, input.weekday ?? null, input.hour, input.minute);
    const row = await this.prisma.recurrence.create({
      data: {
        clerkId,
        prompt: input.prompt,
        label: input.label,
        marketplace: input.marketplace ?? null,
        drafts: input.drafts as unknown as object,
        cadence: input.cadence,
        weekday: input.weekday ?? null,
        hour: input.hour,
        minute: input.minute,
        nextRunAt,
      },
    });
    return toView(row);
  }

  async listMine(clerkId: string): Promise<RecurrenceView[]> {
    if (!this.prisma.connected) return [];
    const rows = await this.prisma.recurrence.findMany({
      where: { clerkId },
      orderBy: [{ active: 'desc' }, { nextRunAt: 'asc' }],
    });
    return rows.map(toView);
  }

  /** Cancel (delete) one of the user's recurrences. Returns true if removed. */
  async cancel(clerkId: string, id: string): Promise<boolean> {
    if (!this.prisma.connected) return false;
    const row = await this.prisma.recurrence.findFirst({ where: { id, clerkId } });
    if (!row) return false;
    await this.prisma.recurrence.delete({ where: { id: row.id } });
    return true;
  }

  /**
   * Fire every active recurrence whose nextRunAt has passed. Called by the cron
   * sweep and exposed via the admin endpoint for ops/testing. Returns how many
   * recurrences were processed.
   */
  async runDue(now: Date = new Date()): Promise<number> {
    if (!this.prisma.connected) return 0;
    const due = await this.prisma.recurrence.findMany({
      where: { active: true, nextRunAt: { lte: now } },
      take: 50,
    });
    for (const r of due) {
      try {
        await this.fire(r, now);
      } catch (err) {
        this.logger.error(`Recurrence ${r.id} failed to fire: ${(err as Error).message}`);
      }
    }
    if (due.length) this.logger.log(`Fired ${due.length} due recurrence(s)`);
    return due.length;
  }

  /** Re-price + place each draft of a recurrence, then advance its schedule. */
  private async fire(r: Recurrence, now: Date): Promise<void> {
    const drafts = (r.drafts as unknown as CheckoutDraft[]) ?? [];
    let placed = 0;
    for (const draft of drafts) {
      const fresh = await this.refreshDraft(draft);
      const res = await this.market.place(r.clerkId, fresh);
      if (res.ok) placed += 1;
    }
    const status = drafts.length === 0 ? 'failed' : placed === drafts.length ? 'placed' : placed > 0 ? 'partial' : 'failed';
    await this.prisma.recurrence.update({
      where: { id: r.id },
      data: {
        lastRunAt: now,
        lastStatus: status,
        runCount: { increment: 1 },
        nextRunAt: computeNextRun(r.cadence as Cadence, r.weekday, r.hour, r.minute, now),
      },
    });
    this.logger.log(`Recurrence ${r.id} (${r.label}) → ${status} (${placed}/${drafts.length})`);
  }

  /**
   * Re-resolve a stored draft against live inventory so refIds / menuItemIds are
   * current (e.g. after a re-seed or menu change). Best-effort: if the vendor/
   * listing/class can't be matched, the original draft is returned unchanged and
   * placement will simply fail (surfaced as lastStatus). Totals are recomputed
   * server-side by each marketplace, so only ids/quantities matter here.
   */
  private async refreshDraft(draft: CheckoutDraft): Promise<CheckoutDraft> {
    try {
      if (draft.marketplace === 'eats') return await this.refreshEats(draft);
      if (draft.marketplace === 'stays') return await this.refreshStays(draft);
      return await this.refreshRides(draft);
    } catch (err) {
      this.logger.warn(`refreshDraft failed (${draft.marketplace}): ${(err as Error).message}`);
      return draft;
    }
  }

  private async refreshEats(draft: CheckoutDraft): Promise<CheckoutDraft> {
    const vendors = await this.tools.getEatsVendors();
    const vendor =
      vendors.find((v) => v.id === draft.refId) ||
      vendors.find((v) => v.name.toLowerCase() === draft.title.toLowerCase()) ||
      vendors.find((v) => v.name.toLowerCase().includes(draft.title.toLowerCase()));
    if (!vendor) return draft;
    const items = (draft.items ?? [])
      .map((line) => {
        const mi =
          vendor.items.find((i) => i.id === line.menuItemId) ||
          vendor.items.find((i) => i.name.toLowerCase() === line.name.toLowerCase()) ||
          vendor.items.find((i) => i.name.toLowerCase().includes(line.name.toLowerCase()));
        return mi ? { menuItemId: mi.id, name: mi.name, qty: line.qty, price: mi.price } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (!items.length) return draft;
    return { ...draft, refId: vendor.id, items };
  }

  private async refreshStays(draft: CheckoutDraft): Promise<CheckoutDraft> {
    const listings = await this.tools.getStays();
    const l =
      listings.find((x) => x.id === draft.refId) ||
      listings.find((x) => x.title.toLowerCase() === draft.title.toLowerCase());
    return l ? { ...draft, refId: l.id } : draft;
  }

  private async refreshRides(draft: CheckoutDraft): Promise<CheckoutDraft> {
    const classes = await this.tools.getRides();
    const rc =
      classes.find((c) => c.id === draft.refId) ||
      classes.find((c) => c.name.toLowerCase() === draft.title.toLowerCase());
    return rc ? { ...draft, refId: rc.id } : draft;
  }
}

/**
 * Next firing strictly after `from`. Times are interpreted in the server's local
 * timezone (single-region demo). Daily → today at hour:minute if still ahead,
 * else tomorrow. Weekly → the next matching weekday at hour:minute.
 */
export function computeNextRun(
  cadence: Cadence,
  weekday: number | null,
  hour: number,
  minute: number,
  from: Date = new Date(),
): Date {
  const next = new Date(from);
  next.setHours(hour, minute, 0, 0);
  if (cadence === 'daily') {
    if (next <= from) next.setDate(next.getDate() + 1);
    return next;
  }
  const wd = weekday ?? from.getDay();
  let delta = (wd - next.getDay() + 7) % 7;
  if (delta === 0 && next <= from) delta = 7;
  next.setDate(next.getDate() + delta);
  return next;
}

export function scheduleLabel(cadence: Cadence, weekday: number | null, hour: number, minute: number): string {
  const time = `${pad(hour)}:${pad(minute)}`;
  if (cadence === 'daily') return `Every day at ${time}`;
  return `Every ${WEEKDAYS[(weekday ?? 1) % 7]} at ${time}`;
}

function toView(r: Recurrence): RecurrenceView {
  const cadence = r.cadence as Cadence;
  return {
    id: r.id,
    label: r.label,
    prompt: r.prompt,
    marketplace: (r.marketplace as RecurrenceView['marketplace']) ?? null,
    cadence,
    weekday: r.weekday,
    hour: r.hour,
    minute: r.minute,
    active: r.active,
    nextRunAt: r.nextRunAt.toISOString(),
    lastRunAt: r.lastRunAt ? r.lastRunAt.toISOString() : null,
    lastStatus: r.lastStatus,
    runCount: r.runCount,
    scheduleLabel: scheduleLabel(cadence, r.weekday, r.hour, r.minute),
  };
}
