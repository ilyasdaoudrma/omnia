const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3002';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  category?: string;
}

export interface Vendor {
  id: string;
  name: string;
  city: string;
  cuisine?: string;
  rating?: number;
  deliveryFee: number;
  etaMinutes: number;
  image?: string;
  description?: string;
  items: MenuItem[];
}

export interface OrderItem {
  name: string;
  price: number;
  qty: number;
}

export interface Order {
  id: string;
  vendorId: string;
  vendorName: string;
  image?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
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

export async function fetchVendors(params: { city?: string } = {}): Promise<Vendor[]> {
  const q = new URLSearchParams();
  if (params.city) q.set('city', params.city);
  const res = await fetch(`${BASE_URL}/vendors?${q}`);
  return res.ok ? ((await res.json()) as Vendor[]) : [];
}

export async function fetchVendor(id: string): Promise<Vendor | null> {
  const res = await fetch(`${BASE_URL}/vendors/${id}`);
  return res.ok ? ((await res.json()) as Vendor) : null;
}

export interface OrderResult {
  ok: boolean;
  needAuth?: boolean;
  order?: Order;
  error?: string;
}

export async function createOrder(input: { vendorId: string; items: { menuItemId: string; qty: number }[] }): Promise<OrderResult> {
  if (!isSignedIn()) return { ok: false, needAuth: true };
  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (res.status === 401) return { ok: false, needAuth: true };
  if (!res.ok) return { ok: false, error: `Failed (${res.status})` };
  return { ok: true, order: (await res.json()) as Order };
}

export async function fetchMyOrders(): Promise<Order[]> {
  if (!isSignedIn()) return [];
  const res = await fetch(`${BASE_URL}/orders`, { headers: await authHeaders() });
  return res.ok ? ((await res.json()) as Order[]) : [];
}

export interface Review {
  id: string;
  authorName: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
}

export async function fetchReviews(vendorId: string): Promise<Review[]> {
  const res = await fetch(`${BASE_URL}/vendors/${vendorId}/reviews`);
  return res.ok ? ((await res.json()) as Review[]) : [];
}

export interface ReviewResult {
  ok: boolean;
  needAuth?: boolean;
  review?: Review;
  error?: string;
}

export async function createReview(vendorId: string, input: { rating: number; comment?: string }): Promise<ReviewResult> {
  if (!isSignedIn()) return { ok: false, needAuth: true };
  const res = await fetch(`${BASE_URL}/vendors/${vendorId}/reviews`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(input),
  });
  if (res.status === 401) return { ok: false, needAuth: true };
  if (!res.ok) return { ok: false, error: `Failed (${res.status})` };
  return { ok: true, review: (await res.json()) as Review };
}
