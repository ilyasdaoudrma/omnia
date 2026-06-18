const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

export interface Listing {
  id: string;
  title: string;
  city: string;
  neighborhood?: string;
  type: string;
  pricePerNight: number;
  currency: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  rating?: number;
  reviews: number;
  amenities: string[];
  images: string[];
  description?: string;
  host: string;
}

export interface Booking {
  id: string;
  listingId: string;
  title: string;
  city: string;
  image?: string;
  nights: number;
  guests: number;
  total: number;
  currency: string;
  status: string;
  checkIn?: string;
  source?: string;
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

export async function fetchListings(params: { city?: string; maxPrice?: number; guests?: number } = {}): Promise<Listing[]> {
  const q = new URLSearchParams();
  if (params.city) q.set('city', params.city);
  if (params.maxPrice) q.set('maxPrice', String(params.maxPrice));
  if (params.guests) q.set('guests', String(params.guests));
  const res = await fetch(`${BASE_URL}/listings?${q}`);
  return res.ok ? ((await res.json()) as Listing[]) : [];
}

export async function fetchListing(id: string): Promise<Listing | null> {
  const res = await fetch(`${BASE_URL}/listings/${id}`);
  return res.ok ? ((await res.json()) as Listing) : null;
}

export interface BookResult {
  ok: boolean;
  needAuth?: boolean;
  booking?: Booking;
  error?: string;
}

export async function createBooking(input: { listingId: string; nights: number; guests: number; checkIn?: string }): Promise<BookResult> {
  if (!isSignedIn()) return { ok: false, needAuth: true };
  const res = await fetch(`${BASE_URL}/bookings`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (res.status === 401) return { ok: false, needAuth: true };
  if (!res.ok) return { ok: false, error: `Failed (${res.status})` };
  return { ok: true, booking: (await res.json()) as Booking };
}

export async function fetchMyBookings(): Promise<Booking[]> {
  if (!isSignedIn()) return [];
  const res = await fetch(`${BASE_URL}/bookings`, { headers: await authHeaders() });
  return res.ok ? ((await res.json()) as Booking[]) : [];
}

export interface Review {
  id: string;
  authorName: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export async function fetchReviews(listingId: string): Promise<Review[]> {
  const res = await fetch(`${BASE_URL}/listings/${listingId}/reviews`);
  return res.ok ? ((await res.json()) as Review[]) : [];
}

export interface ReviewResult {
  ok: boolean;
  needAuth?: boolean;
  review?: Review;
  error?: string;
}

export async function createReview(listingId: string, input: { rating: number; comment?: string }): Promise<ReviewResult> {
  if (!isSignedIn()) return { ok: false, needAuth: true };
  const res = await fetch(`${BASE_URL}/listings/${listingId}/reviews`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (res.status === 401) return { ok: false, needAuth: true };
  if (!res.ok) return { ok: false, error: `Failed (${res.status})` };
  return { ok: true, review: (await res.json()) as Review };
}
