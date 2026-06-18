import { APIRequestContext, expect } from '@playwright/test';

/** Frontend dev servers (Vite). */
export const APPS = {
  agent: 'http://localhost:5180',
  stays: 'http://localhost:5181',
  eats: 'http://localhost:5182',
  rides: 'http://localhost:5183',
} as const;

/** Backend APIs (NestJS under PM2). */
export const API = {
  agent: 'http://localhost:3000',
  stays: 'http://localhost:3001',
  eats: 'http://localhost:3002',
  rides: 'http://localhost:3003',
} as const;

export interface AgentEvt {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
}

/**
 * POST the agent SSE endpoint and return the parsed events. The agent streams
 * `data: {json}` frames terminated by `data: [DONE]`, so the response body is
 * complete once the request resolves. Signed-out (no Clerk token) by default.
 */
export async function runAgent(
  request: APIRequestContext,
  prompt: string,
  body: Record<string, unknown> = {},
): Promise<AgentEvt[]> {
  const res = await request.post(`${API.agent}/agent/run`, {
    data: { prompt, history: [], ...body },
    headers: { 'Content-Type': 'application/json' },
    timeout: 90_000,
  });
  expect(res.ok(), `agent/run HTTP ${res.status()}`).toBeTruthy();
  const text = await res.text();
  const events: AgentEvt[] = [];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t.startsWith('data:')) continue;
    const payload = t.slice(5).trim();
    if (!payload || payload === '[DONE]') continue;
    try {
      events.push(JSON.parse(payload) as AgentEvt);
    } catch {
      /* ignore a partial frame */
    }
  }
  return events;
}

export const typesOf = (e: AgentEvt[]): string[] => e.map((x) => x.type);
export const tokenText = (e: AgentEvt[]): string => e.filter((x) => x.type === 'token').map((x) => x.text).join('');
export const checkoutOf = (e: AgentEvt[]): AgentEvt | undefined => e.find((x) => x.type === 'checkout');

/** First item id for a city from a marketplace list endpoint (for deep-linking detail pages). */
export async function firstId(request: APIRequestContext, url: string): Promise<string | null> {
  const res = await request.get(url, { timeout: 15_000 });
  if (!res.ok()) return null;
  const list = (await res.json()) as Array<{ id?: string }>;
  return Array.isArray(list) && list.length ? (list[0].id ?? null) : null;
}
