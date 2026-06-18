const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3003';

export interface RideClass {
  id: string;
  city: string;
  name: string;
  vehicle: string;
  baseFare: number;
  perKm: number;
  perMin: number;
  etaMinutes: number;
  seats: number;
  rating?: number;
  image?: string;
  description?: string;
  estFare: number;
  sampleKm: number;
  sampleMin: number;
  currency: string;
}

export interface Ride {
  id: string;
  rideClassId: string;
  className: string;
  vehicle: string;
  image?: string;
  pickup: string;
  dropoff: string;
  distanceKm: number;
  minutes: number;
  fare: number;
  currency: string;
  status: string;
  source: string;
  createdAt: string;
}

interface ClerkWindow {
  Clerk?: { session?: { getToken: () => Promise<string | null> } };
}

export function isSignedIn(): boolean {
  return Boolean((window as unknown as ClerkWindow).Clerk?.session);
}

async function authHeaders(): Promise<HeadersInit> {
  try {
    const token = await (window as unknown as ClerkWindow).Clerk?.session?.getToken();
    const base: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) base.Authorization = `Bearer ${token}`;
    return base;
  } catch {
    return { 'Content-Type': 'application/json' };
  }
}

/** Estimate a fare for a given distance/time — mirrors the backend formula. */
export function quoteFare(rc: RideClass, km: number, min: number): number {
  return Math.round(rc.baseFare + rc.perKm * km + rc.perMin * min);
}

export async function fetchRideClasses(params: { city?: string } = {}): Promise<RideClass[]> {
  const q = new URLSearchParams();
  if (params.city) q.set('city', params.city);
  const res = await fetch(`${BASE_URL}/rides?${q}`);
  return res.ok ? ((await res.json()) as RideClass[]) : [];
}

export async function fetchRideClass(id: string): Promise<RideClass | null> {
  const res = await fetch(`${BASE_URL}/rides/${id}`);
  return res.ok ? ((await res.json()) as RideClass) : null;
}

export interface TripResult {
  ok: boolean;
  needAuth?: boolean;
  ride?: Ride;
  error?: string;
}

export async function createTrip(input: {
  rideClassId: string;
  pickup?: string;
  dropoff?: string;
  distanceKm?: number;
}): Promise<TripResult> {
  if (!isSignedIn()) return { ok: false, needAuth: true };
  const res = await fetch(`${BASE_URL}/trips`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (res.status === 401) return { ok: false, needAuth: true };
  if (!res.ok) return { ok: false, error: `Failed (${res.status})` };
  return { ok: true, ride: (await res.json()) as Ride };
}

export async function fetchMyRides(): Promise<Ride[]> {
  if (!isSignedIn()) return [];
  const res = await fetch(`${BASE_URL}/trips`, { headers: await authHeaders() });
  return res.ok ? ((await res.json()) as Ride[]) : [];
}

export interface Review {
  id: string;
  authorName: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export async function fetchReviews(rideClassId: string): Promise<Review[]> {
  const res = await fetch(`${BASE_URL}/rides/${rideClassId}/reviews`);
  return res.ok ? ((await res.json()) as Review[]) : [];
}

export interface ReviewResult {
  ok: boolean;
  needAuth?: boolean;
  review?: Review;
  error?: string;
}

export async function createReview(rideClassId: string, input: { rating: number; comment?: string }): Promise<ReviewResult> {
  if (!isSignedIn()) return { ok: false, needAuth: true };
  const res = await fetch(`${BASE_URL}/rides/${rideClassId}/reviews`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (res.status === 401) return { ok: false, needAuth: true };
  if (!res.ok) return { ok: false, error: `Failed (${res.status})` };
  return { ok: true, review: (await res.json()) as Review };
}
