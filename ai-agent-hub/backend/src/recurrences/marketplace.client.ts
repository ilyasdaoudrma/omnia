import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CheckoutDraft } from '../ai/agent.types';

export interface PlaceResult {
  ok: boolean;
  status?: number;
  error?: string;
}

/**
 * Server-side marketplace client used by the recurrence scheduler to place
 * orders/bookings/rides on a user's behalf when they aren't present. Hits the
 * SAME marketplace endpoints the web app uses, but authenticates via the trusted
 * agent service path (shared secret header + clerkId in the body) instead of a
 * Clerk session token. Never throws — a down marketplace yields { ok: false }.
 */
@Injectable()
export class MarketplaceClient {
  private readonly logger = new Logger(MarketplaceClient.name);
  private readonly staysApi: string;
  private readonly eatsApi: string;
  private readonly ridesApi: string;
  private readonly secret?: string;

  constructor(config: ConfigService) {
    this.staysApi = config.get<string>('STAYS_API_URL') ?? 'http://localhost:3001';
    this.eatsApi = config.get<string>('EATS_API_URL') ?? 'http://localhost:3002';
    this.ridesApi = config.get<string>('RIDES_API_URL') ?? 'http://localhost:3003';
    this.secret = config.get<string>('OMNIA_AGENT_SECRET') || undefined;
  }

  /** Place one draft in its marketplace as the given user. */
  async place(clerkId: string, draft: CheckoutDraft): Promise<PlaceResult> {
    if (!this.secret) return { ok: false, error: 'OMNIA_AGENT_SECRET not configured' };
    if (draft.marketplace === 'eats') {
      return this.post(`${this.eatsApi}/orders`, {
        clerkId,
        vendorId: draft.refId,
        items: (draft.items ?? []).map((i) => ({ menuItemId: i.menuItemId, qty: i.qty })),
        source: 'agent',
      });
    }
    if (draft.marketplace === 'stays') {
      return this.post(`${this.staysApi}/bookings`, {
        clerkId,
        listingId: draft.refId,
        nights: draft.nights ?? 1,
        guests: draft.guests ?? 1,
        source: 'agent',
      });
    }
    return this.post(`${this.ridesApi}/trips`, {
      clerkId,
      rideClassId: draft.refId,
      pickup: draft.pickup,
      dropoff: draft.dropoff,
      distanceKm: draft.distanceKm,
      source: 'agent',
    });
  }

  private async post(url: string, body: Record<string, unknown>): Promise<PlaceResult> {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-omnia-agent-secret': this.secret as string },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        this.logger.warn(`Placement failed ${res.status} at ${url}: ${text.slice(0, 200)}`);
        return { ok: false, status: res.status, error: `HTTP ${res.status}` };
      }
      return { ok: true, status: res.status };
    } catch (err) {
      this.logger.warn(`Placement error at ${url}: ${(err as Error).message}`);
      return { ok: false, error: 'Marketplace unreachable' };
    }
  }
}
