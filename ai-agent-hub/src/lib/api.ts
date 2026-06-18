import type { ChatMessage, Recommendation, RecurrenceView } from '@/lib/ai/types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
}

interface RawMessage {
  id: string;
  role: ChatMessage['role'];
  content: string;
  recommendations?: Recommendation[] | null;
  createdAt: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  messages: RawMessage[];
}

interface ClerkWindow {
  Clerk?: { session?: { getToken: () => Promise<string | null> } };
}

async function authHeaders(): Promise<HeadersInit> {
  try {
    const token = await (window as unknown as ClerkWindow).Clerk?.session?.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export interface UsageWindow {
  used: number;
  limit: number;
  remaining: number;
  resetSeconds: number;
}
export interface UsageSnapshot {
  minute: UsageWindow;
  day: UsageWindow;
}

/** How many agent requests are left this minute / today for the current user (or
 *  IP when signed out). Returns null on any error so the meter just hides. */
export async function fetchUsage(): Promise<UsageSnapshot | null> {
  try {
    const res = await fetch(`${BASE_URL}/agent/usage`, { headers: await authHeaders() });
    if (!res.ok) return null;
    return (await res.json()) as UsageSnapshot;
  } catch {
    return null;
  }
}

/** List the signed-in user's conversations. Returns [] when unauthenticated or
 *  the backend is unreachable — a transient sidebar refresh must never surface a
 *  network error or break the chat/reorder flow. */
export async function fetchConversations(): Promise<ConversationSummary[]> {
  const headers = await authHeaders();
  if (!('Authorization' in headers)) return [];
  try {
    const res = await fetch(`${BASE_URL}/conversations`, { headers });
    if (!res.ok) return [];
    return (await res.json()) as ConversationSummary[];
  } catch {
    return [];
  }
}

/** Load a single conversation with its messages + stored recommendations. */
export async function fetchConversation(id: string): Promise<ConversationDetail | null> {
  const headers = await authHeaders();
  if (!('Authorization' in headers)) return null;
  try {
    const res = await fetch(`${BASE_URL}/conversations/${id}`, { headers });
    if (!res.ok) return null;
    return (await res.json()) as ConversationDetail;
  } catch {
    return null;
  }
}

export async function deleteConversation(id: string): Promise<boolean> {
  const headers = await authHeaders();
  if (!('Authorization' in headers)) return false;
  try {
    const res = await fetch(`${BASE_URL}/conversations/${id}`, { method: 'DELETE', headers });
    return res.ok;
  } catch {
    return false;
  }
}

/** Convert a stored message into the chat UI shape. */
export function toChatMessage(m: RawMessage): ChatMessage {
  return { id: m.id, role: m.role, content: m.content, createdAt: new Date(m.createdAt).getTime() };
}

export interface DashboardBooking {
  id: string;
  tool: string;
  title: string;
  vendor?: string | null;
  total?: number | null;
  currency: string;
  status: string;
  createdAt: string;
}
export interface DashboardNotification {
  id: string;
  title: string;
  body: string;
  tone: 'accent' | 'success' | 'warn';
  read: boolean;
  createdAt: string;
}
export interface DashboardData {
  bookings: DashboardBooking[];
  notifications: DashboardNotification[];
  stats?: { upcomingTrips: number; openOrders: number; unread: number };
}

/** Fetch the signed-in user's real dashboard data. Null when unauthenticated. */
export async function fetchDashboard(): Promise<DashboardData | null> {
  const headers = await authHeaders();
  if (!('Authorization' in headers)) return null;
  const res = await fetch(`${BASE_URL}/dashboard`, { headers });
  if (!res.ok) return null;
  return (await res.json()) as DashboardData;
}

/** List the signed-in user's recurring agent tasks. [] when unauthenticated. */
export async function fetchRecurrences(): Promise<RecurrenceView[]> {
  const headers = await authHeaders();
  if (!('Authorization' in headers)) return [];
  try {
    const res = await fetch(`${BASE_URL}/recurrences`, { headers });
    if (!res.ok) return [];
    return (await res.json()) as RecurrenceView[];
  } catch {
    return [];
  }
}

/** Cancel (delete) a recurring task. Returns true on success. */
export async function cancelRecurrence(id: string): Promise<boolean> {
  const headers = await authHeaders();
  if (!('Authorization' in headers)) return false;
  try {
    const res = await fetch(`${BASE_URL}/recurrences/${id}`, { method: 'DELETE', headers });
    return res.ok;
  } catch {
    return false;
  }
}
