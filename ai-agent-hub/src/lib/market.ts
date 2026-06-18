// The agent books/orders against the SEPARATE OMNIA Stays & Eats apps, using
// the shared Clerk identity. A booking made here lands in those apps' own
// databases — so it shows up when you log into stays/eats with the same account.
import type { AccountSnapshot } from '@/lib/ai/types';

const STAYS_API = import.meta.env.VITE_STAYS_API_URL ?? 'http://localhost:3001';
const EATS_API = import.meta.env.VITE_EATS_API_URL ?? 'http://localhost:3002';
const RIDES_API = import.meta.env.VITE_RIDES_API_URL ?? 'http://localhost:3003';

// Marketplace FRONTEND apps — used for "open my trips/orders" deep links after
// a confirmation. Overridable via env; default to the local dev ports.
export const MARKETPLACE_LINKS = {
  staysTrips: `${import.meta.env.VITE_STAYS_URL ?? 'http://localhost:5181'}/trips`,
  eatsOrders: `${import.meta.env.VITE_EATS_URL ?? 'http://localhost:5182'}/orders`,
  ridesTrips: `${import.meta.env.VITE_RIDES_URL ?? 'http://localhost:5183'}/trips`,
} as const;

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  image?: string;
}

interface ClerkWindow {
  Clerk?: { session?: { getToken: () => Promise<string | null> } };
}

async function authHeaders(): Promise<HeadersInit> {
  try {
    const token = await (window as unknown as ClerkWindow).Clerk?.session?.getToken();
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
}

export function isSignedIn(): boolean {
  return Boolean((window as unknown as ClerkWindow).Clerk?.session);
}

export interface BookingResult {
  ok: boolean;
  total?: number;
  currency?: string;
  needAuth?: boolean;
  error?: string;
}

type MutationData = { total?: number; fare?: number; currency?: string };

/**
 * POST/PATCH against a marketplace with GRACEFUL failure — it never throws, so a
 * momentarily-unreachable backend yields `{ ok: false }` instead of rejecting and
 * leaving a "Buy now" / "Confirm" stuck spinning forever with no feedback.
 */
async function mutate(url: string, method: 'POST' | 'PATCH', body?: unknown): Promise<BookingResult & { data?: MutationData }> {
  if (!isSignedIn()) return { ok: false, needAuth: true };
  try {
    const res = await fetch(url, {
      method,
      headers: await authHeaders(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 401) return { ok: false, needAuth: true };
    if (!res.ok) return { ok: false, error: `Failed (${res.status})` };
    const data = (await res.json().catch(() => ({}))) as MutationData;
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Network error — the marketplace may be offline. Please retry.' };
  }
}

const withTotal = (r: BookingResult & { data?: MutationData }, key: 'total' | 'fare'): BookingResult =>
  r.ok ? { ok: true, total: r.data?.[key], currency: r.data?.currency } : { ok: false, needAuth: r.needAuth, error: r.error };

/** Book a stay in the OMNIA Stays app (source = agent). */
export async function bookStay(listingId: string, nights = 2): Promise<BookingResult> {
  return withTotal(await mutate(`${STAYS_API}/bookings`, 'POST', { listingId, nights, guests: 2, source: 'agent' }), 'total');
}

/** Place an order in the OMNIA Eats app (source = agent). */
export async function orderFood(vendorId: string, orderItemId?: string): Promise<BookingResult> {
  const items = orderItemId ? [{ menuItemId: orderItemId, qty: 1 }] : [];
  return withTotal(await mutate(`${EATS_API}/orders`, 'POST', { vendorId, items, source: 'agent' }), 'total');
}

/** Confirm a multi-item Eats order assembled by the agent. */
export async function placeEatsOrder(vendorId: string, items: { menuItemId: string; qty: number }[]): Promise<BookingResult> {
  return withTotal(await mutate(`${EATS_API}/orders`, 'POST', { vendorId, items, source: 'agent' }), 'total');
}

/** Confirm a stay booking assembled by the agent (with nights & guests). */
export async function bookStayFull(listingId: string, nights: number, guests: number): Promise<BookingResult> {
  return withTotal(await mutate(`${STAYS_API}/bookings`, 'POST', { listingId, nights, guests, source: 'agent' }), 'total');
}

/** Confirm a ride booking assembled by the agent (OMNIA Rides, source = agent). */
export async function bookRide(rideClassId: string, pickup?: string, dropoff?: string, distanceKm?: number): Promise<BookingResult> {
  return withTotal(await mutate(`${RIDES_API}/trips`, 'POST', { rideClassId, pickup, dropoff, distanceKm, source: 'agent' }), 'fare');
}

/** Cancel an existing ride (agent "cancel my ride" flow). */
export async function cancelRide(tripId: string): Promise<BookingResult> {
  const r = await mutate(`${RIDES_API}/trips/${tripId}/cancel`, 'PATCH');
  return r.ok ? { ok: true } : { ok: false, needAuth: r.needAuth, error: r.error };
}

/** Change a ride's pickup/dropoff (agent "change my ride pickup/dropoff" flow). */
export async function modifyRide(tripId: string, pickup?: string, dropoff?: string): Promise<BookingResult> {
  return withTotal(await mutate(`${RIDES_API}/trips/${tripId}`, 'PATCH', { pickup, dropoff }), 'fare');
}

/** Cancel an existing Eats order (agent "cancel my order" flow). */
export async function cancelEatsOrder(orderId: string): Promise<BookingResult> {
  const r = await mutate(`${EATS_API}/orders/${orderId}/cancel`, 'PATCH');
  return r.ok ? { ok: true } : { ok: false, needAuth: r.needAuth, error: r.error };
}

/** Cancel an existing Stays booking. */
export async function cancelStayBooking(bookingId: string): Promise<BookingResult> {
  const r = await mutate(`${STAYS_API}/bookings/${bookingId}/cancel`, 'PATCH');
  return r.ok ? { ok: true } : { ok: false, needAuth: r.needAuth, error: r.error };
}

/** Change a Stays booking's nights/guests; backend recomputes the total. */
export async function modifyStayBooking(bookingId: string, nights: number, guests: number): Promise<BookingResult> {
  return withTotal(await mutate(`${STAYS_API}/bookings/${bookingId}`, 'PATCH', { nights, guests }), 'total');
}

// ── Combined read-back for the agent Dashboard ───────────────────────────
export interface StayBooking {
  id: string;
  listingId?: string;
  title: string;
  city: string;
  image?: string;
  nights: number;
  guests: number;
  total: number;
  status: string;
  source?: string;
  createdAt: string;
}
export interface EatsOrder {
  id: string;
  vendorId?: string;
  vendorName: string;
  image?: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: string;
  source?: string;
  createdAt: string;
}
export interface RideTrip {
  id: string;
  rideClassId?: string;
  className: string;
  vehicle: string;
  image?: string;
  pickup: string;
  dropoff: string;
  distanceKm: number;
  fare: number;
  status: string;
  source?: string;
  createdAt: string;
}

export async function fetchMyStays(): Promise<StayBooking[]> {
  if (!isSignedIn()) return [];
  try {
    const res = await fetch(`${STAYS_API}/bookings`, { headers: await authHeaders() });
    return res.ok ? ((await res.json()) as StayBooking[]) : [];
  } catch {
    return [];
  }
}

export async function fetchMyEatsOrders(): Promise<EatsOrder[]> {
  if (!isSignedIn()) return [];
  try {
    const res = await fetch(`${EATS_API}/orders`, { headers: await authHeaders() });
    return res.ok ? ((await res.json()) as EatsOrder[]) : [];
  } catch {
    return [];
  }
}

export async function fetchMyRides(): Promise<RideTrip[]> {
  if (!isSignedIn()) return [];
  try {
    const res = await fetch(`${RIDES_API}/trips`, { headers: await authHeaders() });
    return res.ok ? ((await res.json()) as RideTrip[]) : [];
  } catch {
    return [];
  }
}

/**
 * Compact snapshot of the user's recent orders & bookings, sent with a run so
 * the agent can cancel/modify/reorder against the user's real history. Returns
 * undefined when signed out (nothing to manage). Fetched only when the message
 * looks like a manage/personalization request, to keep normal sends fast.
 */
export async function fetchAccountSnapshot(): Promise<AccountSnapshot | undefined> {
  if (!isSignedIn()) return undefined;
  const [orders, stays, rides] = await Promise.all([fetchMyEatsOrders(), fetchMyStays(), fetchMyRides()]);
  return {
    eatsOrders: orders.slice(0, 12).map((o) => ({
      id: o.id,
      vendorId: o.vendorId,
      vendorName: o.vendorName,
      items: o.items,
      total: o.total,
      status: o.status,
      createdAt: o.createdAt,
    })),
    stayBookings: stays.slice(0, 12).map((b) => ({
      id: b.id,
      listingId: b.listingId,
      title: b.title,
      city: b.city,
      nights: b.nights,
      guests: b.guests,
      total: b.total,
      status: b.status,
      createdAt: b.createdAt,
    })),
    rideTrips: rides.slice(0, 12).map((r) => ({
      id: r.id,
      rideClassId: r.rideClassId,
      className: r.className,
      vehicle: r.vehicle,
      pickup: r.pickup,
      dropoff: r.dropoff,
      distanceKm: r.distanceKm,
      fare: r.fare,
      status: r.status,
      createdAt: r.createdAt,
    })),
  };
}
