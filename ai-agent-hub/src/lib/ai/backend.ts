import type { AIProvider, AgentEvent, RunInput } from './types';

/**
 * BackendProvider talks to YOUR NestJS backend over Server-Sent Events.
 * The backend holds the secret Anthropic/OpenAI keys and runs the real
 * Planner → Execution → Recommendation agent loop, emitting the same
 * AgentEvent stream the MockProvider produces. This keeps secret keys off
 * the client (never ship sk-... in a VITE_ variable).
 *
 * Expected endpoint: POST {baseUrl}/agent/run  → text/event-stream of AgentEvent JSON.
 */
export class BackendProvider implements AIProvider {
  readonly id: string;

  constructor(
    private readonly baseUrl: string,
    private readonly provider: 'claude' | 'openai' | 'groq',
  ) {
    this.id = provider;
  }

  async *run({ prompt, history, signal, conversationId, location, account }: RunInput): AsyncGenerator<AgentEvent> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };

    // Attach the Clerk session token when signed in, so the backend can
    // personalize and persist. Anonymous requests are allowed (guest mode).
    const token = await getClerkToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${this.baseUrl}/agent/run`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ prompt, history, provider: this.provider, conversationId, location, account }),
      signal,
    });

    if (!res.ok || !res.body) {
      yield { type: 'error', message: `Backend responded ${res.status}. Is the API running?` };
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // Parse SSE frames separated by a blank line.
      const frames = buffer.split('\n\n');
      buffer = frames.pop() ?? '';
      for (const frame of frames) {
        const line = frame.split('\n').find((l) => l.startsWith('data:'));
        if (!line) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        try {
          yield JSON.parse(payload) as AgentEvent;
        } catch {
          // Ignore malformed frames; keep streaming.
        }
      }
    }
  }
}

interface ClerkWindow {
  Clerk?: { session?: { getToken: () => Promise<string | null> } };
}

/** Best-effort read of the current Clerk session token, if signed in. */
async function getClerkToken(): Promise<string | null> {
  try {
    const clerk = (window as unknown as ClerkWindow).Clerk;
    return (await clerk?.session?.getToken()) ?? null;
  } catch {
    return null;
  }
}
