import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const MINUTE_MS = 60_000;

export interface UsageWindow {
  used: number;
  limit: number;
  remaining: number;
  /** Seconds until this window frees a slot (minute: oldest hit expires; day: UTC midnight). */
  resetSeconds: number;
}

export interface UsageSnapshot {
  minute: UsageWindow;
  day: UsageWindow;
}

/**
 * Per-user (or per-IP) usage for the paid /agent/run endpoint, powering the UI meter.
 *
 * The DAILY cap is persisted in Postgres (one row per bucket per UTC day) so it
 * SURVIVES backend restarts — essential on free hosts that sleep/restart (e.g. HF
 * Spaces), where an in-memory counter would reset and let users farm extra quota.
 *
 * The per-MINUTE window stays in memory: it's only spam-protection, a restart
 * resetting it is harmless (you can't out-restart a 60s window), and the
 * @nestjs/throttler enforces it independently anyway.
 *
 * DB calls are best-effort — a transient DB blip must never break the agent, so the
 * daily cap fails OPEN (the throttler still caps 20/min).
 */
@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);
  private readonly minuteHits = new Map<string, number[]>();
  readonly minuteLimit = toInt(process.env.AGENT_RATE_PER_MIN, 20);
  readonly dayLimit = toInt(process.env.AGENT_RATE_PER_DAY, 300);

  constructor(private readonly prisma: PrismaService) {}

  /** UTC calendar day, "YYYY-MM-DD". */
  private static dayKey(now: number): string {
    return new Date(now).toISOString().slice(0, 10);
  }

  /** Prune + return this key's in-window minute timestamps. */
  private minuteList(key: string, now: number): number[] {
    const arr = (this.minuteHits.get(key) ?? []).filter((t) => t > now - MINUTE_MS);
    if (arr.length) this.minuteHits.set(key, arr);
    else this.minuteHits.delete(key);
    return arr;
  }

  /** Record one successful agent run: bump the in-memory minute log + the persisted day counter. */
  async record(key: string): Promise<void> {
    const now = Date.now();
    const arr = this.minuteList(key, now);
    arr.push(now);
    this.minuteHits.set(key, arr);

    try {
      await this.prisma.agentUsage.upsert({
        where: { bucketKey_day: { bucketKey: key, day: UsageService.dayKey(now) } },
        update: { count: { increment: 1 } },
        create: { bucketKey: key, day: UsageService.dayKey(now), count: 1 },
      });
    } catch (err) {
      this.logger.warn(`Could not persist usage for ${key}: ${(err as Error).message}`);
    }
  }

  /** True when the persisted daily cap is already reached. Fails OPEN on a DB error. */
  async isDayExceeded(key: string): Promise<boolean> {
    return (await this.dayCount(key)) >= this.dayLimit;
  }

  /** Current minute + day usage for the meter (no increment). */
  async snapshot(key: string): Promise<UsageSnapshot> {
    const now = Date.now();
    const inMinute = this.minuteList(key, now);
    const dayUsed = await this.dayCount(key);

    const minuteOldest = inMinute[0];
    return {
      minute: {
        used: inMinute.length,
        limit: this.minuteLimit,
        remaining: Math.max(0, this.minuteLimit - inMinute.length),
        resetSeconds: minuteOldest ? Math.max(0, Math.ceil((minuteOldest + MINUTE_MS - now) / 1000)) : 0,
      },
      day: {
        used: dayUsed,
        limit: this.dayLimit,
        remaining: Math.max(0, this.dayLimit - dayUsed),
        resetSeconds: secondsUntilUtcMidnight(now),
      },
    };
  }

  /** Today's persisted count for a bucket (0 on miss or DB error — fail open). */
  private async dayCount(key: string): Promise<number> {
    try {
      const row = await this.prisma.agentUsage.findUnique({
        where: { bucketKey_day: { bucketKey: key, day: UsageService.dayKey(Date.now()) } },
      });
      return row?.count ?? 0;
    } catch {
      return 0;
    }
  }
}

function secondsUntilUtcMidnight(now: number): number {
  const d = new Date(now);
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 0, 0);
  return Math.max(0, Math.ceil((midnight - now) / 1000));
}

function toInt(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}
