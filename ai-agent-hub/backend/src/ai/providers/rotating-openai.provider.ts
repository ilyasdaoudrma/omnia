import OpenAI from 'openai';
import { Logger } from '@nestjs/common';
import type { AIProvider, AgentPlan } from '../ai-provider.interface';
import type { ChatMessage, ToolId, ToolResult } from '../agent.types';
import { coercePlan, planningInstruction, answerInstruction, toOpenAIHistory } from './prompt-utils';

const VALID_TOOLS: ToolId[] = ['travel', 'maps', 'restaurant', 'shopping', 'calendar', 'notification'];

const DEFAULT_COOLDOWN_MS = 15 * 60 * 1000; // a rate-limited key is parked this long when the API gives no Retry-After
const MAX_COOLDOWN_MS = 24 * 60 * 60 * 1000; // never park a key longer than a day

interface KeyState {
  index: number;
  label: string; // masked, safe to log
  client: OpenAI;
  cooldownUntil: number; // epoch ms; 0 = ready
  disabled: boolean; // permanently invalid (bad key) — never retried this process
  rotations: number; // how many times this key has hit its limit
}

export interface KeyPoolStatus {
  total: number;
  available: number;
  activeKey: number; // 1-based id of the key currently in use
  keys: { id: number; state: 'ready' | 'cooling' | 'disabled'; cooldownSeconds: number; rotations: number }[];
}

/**
 * An OpenAI-compatible provider backed by a POOL of API keys with automatic
 * failover. When the active key hits its rate/quota limit (HTTP 429 / quota
 * errors), the request transparently retries on the next key, and the spent key
 * is parked on a cooldown (honouring Retry-After when present) so we stop hammering
 * it. Built for Groq's free tier: drop several keys in and the agent keeps serving
 * without anyone watching the meter.
 *
 * Works with a single key too (no rotation, just a thin pass-through).
 */
export class RotatingOpenAIProvider implements AIProvider {
  readonly id: string;
  private readonly logger = new Logger('GroqKeyPool');
  private readonly keys: KeyState[];
  private readonly defaultCooldownMs: number;
  private activeIndex = 0;

  constructor(
    apiKeys: string[],
    private readonly model: string,
    options: { baseURL?: string; id?: string; cooldownMs?: number } = {},
  ) {
    this.id = options.id ?? 'openai';
    this.defaultCooldownMs = options.cooldownMs && options.cooldownMs > 0 ? options.cooldownMs : DEFAULT_COOLDOWN_MS;
    this.keys = apiKeys.map((key, index) => ({
      index,
      label: maskKey(key),
      // maxRetries: 0 — we own retry/rotation; the SDK's own backoff would just
      // waste time on a key we already know is rate-limited.
      //
      // Accept-Encoding: identity — HF Spaces sit behind a proxy that
      // intermittently truncates gzipped responses, making node-fetch throw
      // "Invalid response body ... Premature close" while gunzipping. Asking
      // Groq for an uncompressed body removes the decompression step entirely,
      // so a truncation surfaces as a normal (retryable) network error instead.
      client: new OpenAI({
        apiKey: key,
        baseURL: options.baseURL,
        maxRetries: 0,
        defaultHeaders: { 'Accept-Encoding': 'identity' },
      }),
      cooldownUntil: 0,
      disabled: false,
      rotations: 0,
    }));
    this.logger.log(
      `Initialized with ${this.keys.length} API key(s) [${this.keys.map((k) => k.label).join(', ')}], model=${this.model}`,
    );
  }

  async plan(prompt: string, history: ChatMessage[]): Promise<AgentPlan> {
    const res = await this.withFailover('plan', (client) =>
      client.chat.completions.create({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: planningInstruction(VALID_TOOLS) },
          ...toOpenAIHistory(history),
          { role: 'user', content: `Request: "${prompt}". Return the plan as JSON now.` },
        ],
      }),
    );
    return coercePlan(res.choices[0]?.message?.content ?? '', VALID_TOOLS);
  }

  async *streamAnswer(prompt: string, history: ChatMessage[], toolResults: ToolResult[]): AsyncGenerator<string> {
    // The 429/quota error surfaces at create() time (before any chunk), so the
    // failover loop covers the part that can fail; iteration is already committed
    // to one key once the stream opens.
    const stream = await this.withFailover('streamAnswer', (client) =>
      client.chat.completions.create({
        model: this.model,
        stream: true,
        messages: [
          { role: 'system', content: answerInstruction() },
          ...toOpenAIHistory(history),
          {
            role: 'user',
            content: `User request: "${prompt}"\n\nTool results (JSON):\n${JSON.stringify(toolResults)}\n\nWrite the concise, helpful reply now.`,
          },
        ],
      }),
    );

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }

  async complete(system: string, user: string): Promise<string> {
    const res = await this.withFailover('complete', (client) =>
      client.chat.completions.create({
        model: this.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    );
    return res.choices[0]?.message?.content ?? '';
  }

  /** Snapshot of the pool for /health — lets the operator see keys remaining at a glance. */
  status(): KeyPoolStatus {
    const now = Date.now();
    return {
      total: this.keys.length,
      available: this.keys.filter((k) => !k.disabled && k.cooldownUntil <= now).length,
      activeKey: this.activeIndex + 1,
      keys: this.keys.map((k) => ({
        id: k.index + 1,
        state: k.disabled ? 'disabled' : k.cooldownUntil > now ? 'cooling' : 'ready',
        cooldownSeconds: k.cooldownUntil > now ? Math.ceil((k.cooldownUntil - now) / 1000) : 0,
        rotations: k.rotations,
      })),
    };
  }

  /**
   * Run an API call, rotating across keys on rate-limit/quota failures. Tries
   * ready keys first (starting from the last one that worked); if every key is
   * cooling, makes a single attempt on the soonest-to-recover key in case its
   * limit has already reset. Non-limit errors bubble up unchanged.
   */
  private async withFailover<T>(op: string, fn: (client: OpenAI) => Promise<T>): Promise<T> {
    const now = Date.now();
    const ordered = this.orderedCandidates();
    if (!ordered.length) {
      throw new Error('No usable Groq API keys (all disabled).');
    }
    const ready = ordered.filter((k) => k.cooldownUntil <= now);
    const toTry = ready.length ? ready : [...ordered].sort((a, b) => a.cooldownUntil - b.cooldownUntil).slice(0, 1);

    let lastErr: unknown;
    for (const ks of toTry) {
      try {
        const out = await fn(ks.client);
        if (this.activeIndex !== ks.index) {
          this.logger.log(`[${op}] switched to key ${ks.label} (#${ks.index + 1}/${this.keys.length}).`);
        }
        this.activeIndex = ks.index;
        ks.cooldownUntil = 0; // proven good
        return out;
      } catch (err) {
        lastErr = err;
        const kind = classifyError(err);
        if (kind === 'invalid') {
          ks.disabled = true;
          this.logger.error(`Key ${ks.label} (#${ks.index + 1}) rejected as invalid — disabling for this process.`);
          continue;
        }
        if (kind === 'exhausted') {
          ks.rotations += 1;
          const ms = cooldownFromError(err, this.defaultCooldownMs);
          ks.cooldownUntil = Date.now() + ms;
          this.logger.warn(
            `Key ${ks.label} (#${ks.index + 1}) hit its limit (${describeError(err)}). ` +
              `Parking ${Math.round(ms / 1000)}s and rotating to the next key.`,
          );
          continue;
        }
        if (kind === 'transient') {
          // A dropped/truncated connection (common from HF Spaces → Groq). Not
          // the key's fault — don't park it; just rotate and retry on the next
          // ready key. With several keys one attempt almost always gets through.
          this.logger.warn(
            `Key ${ks.label} (#${ks.index + 1}) transient network error (${describeError(err)}); rotating to the next key.`,
          );
          continue;
        }
        throw err; // not a key problem — don't burn keys over it
      }
    }

    this.logger.error(`[${op}] all ${this.keys.length} Groq key(s) are rate-limited or unavailable right now.`);
    throw lastErr ?? new Error('All Groq API keys are exhausted or rate-limited.');
  }

  /** Live, non-disabled keys, ordered to prefer the last key that worked. */
  private orderedCandidates(): KeyState[] {
    const arr: KeyState[] = [];
    for (let i = 0; i < this.keys.length; i++) {
      const k = this.keys[(this.activeIndex + i) % this.keys.length];
      if (!k.disabled) arr.push(k);
    }
    return arr;
  }
}

function maskKey(key: string): string {
  const k = key.trim();
  if (k.length <= 10) return '****';
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

type ErrorKind = 'exhausted' | 'invalid' | 'transient' | 'other';

/** Map a provider error to: spent key (exhausted), bad key (invalid), a retryable
 *  network blip (transient), or an unrelated failure (other). */
function classifyError(err: unknown): ErrorKind {
  const e = err as { status?: number; code?: string; type?: string; name?: string; message?: string; cause?: { code?: string; message?: string }; error?: { code?: string; type?: string } };
  const status = e?.status;
  const code = String(e?.code ?? e?.cause?.code ?? e?.error?.code ?? '').toLowerCase();
  const type = String(e?.type ?? e?.error?.type ?? '').toLowerCase();
  const name = String(e?.name ?? '').toLowerCase();
  const msg = String(e?.message ?? e?.cause?.message ?? '').toLowerCase();

  if (status === 401 || code.includes('invalid_api_key') || msg.includes('invalid api key') || msg.includes('incorrect api key')) {
    return 'invalid';
  }
  if (
    status === 429 ||
    status === 403 ||
    code.includes('rate_limit') ||
    code.includes('insufficient_quota') ||
    type.includes('tokens') ||
    msg.includes('rate limit') ||
    msg.includes('quota') ||
    msg.includes('limit reached')
  ) {
    return 'exhausted';
  }
  // Network/transport failures (no HTTP status): dropped or truncated
  // connections between the server and Groq. Retryable on another key.
  if (
    status === undefined &&
    (name.includes('apiconnection') ||
      type === 'system' ||
      code.includes('econnreset') ||
      code.includes('etimedout') ||
      code.includes('econnrefused') ||
      code.includes('epipe') ||
      code.includes('enetunreach') ||
      code.includes('eai_again') ||
      code.includes('premature') ||
      msg.includes('premature close') ||
      msg.includes('socket hang up') ||
      msg.includes('network') ||
      msg.includes('fetch failed') ||
      msg.includes('terminated') ||
      msg.includes('econnreset') ||
      msg.includes('timeout'))
  ) {
    return 'transient';
  }
  return 'other';
}

/** How long to park a spent key: honour Retry-After if given, else the default. */
function cooldownFromError(err: unknown, fallback: number): number {
  const headers = (err as { headers?: unknown })?.headers;
  const read = (name: string): string | undefined => {
    if (!headers) return undefined;
    const h = headers as { get?: (n: string) => string | null } & Record<string, string | undefined>;
    if (typeof h.get === 'function') return h.get(name) ?? undefined;
    return h[name] ?? h[name.toLowerCase()];
  };

  const raMs = read('retry-after-ms');
  if (raMs && !Number.isNaN(Number(raMs))) return clampCooldown(Number(raMs) + 1000);

  const ra = read('retry-after');
  if (ra) {
    const secs = Number(ra);
    if (!Number.isNaN(secs)) return clampCooldown(secs * 1000 + 1000);
    const when = Date.parse(ra); // HTTP-date form
    if (!Number.isNaN(when)) return clampCooldown(Math.max(when - Date.now(), 0) + 1000);
  }
  return fallback;
}

function clampCooldown(ms: number): number {
  return Math.min(Math.max(ms, 1000), MAX_COOLDOWN_MS);
}

function describeError(err: unknown): string {
  const e = err as { status?: number; code?: string; error?: { code?: string }; message?: string };
  const status = e?.status ? `HTTP ${e.status}` : '';
  const code = e?.code ?? e?.error?.code ?? '';
  return [status, code].filter(Boolean).join(' ') || (e?.message ?? 'rate limited').slice(0, 80);
}
