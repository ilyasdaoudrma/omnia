import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AIProvider } from './ai-provider.interface';
import { MockProvider } from './providers/mock.provider';
import { ClaudeProvider } from './providers/claude.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { RotatingOpenAIProvider, type KeyPoolStatus } from './providers/rotating-openai.provider';

/**
 * Resolves the active AI provider from configuration. Falls back to the keyless
 * MockProvider when a real provider is selected but its key is missing, so the
 * server never hard-fails a request due to misconfiguration.
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly provider: AIProvider;
  /** Set only when Groq is active — exposes the key-pool status for /health. */
  private readonly groqPool: RotatingOpenAIProvider | null = null;

  constructor(config: ConfigService) {
    const selected = (config.get<string>('AI_PROVIDER') ?? 'mock').toLowerCase();
    const anthropicKey = config.get<string>('ANTHROPIC_API_KEY');
    const openaiKey = config.get<string>('OPENAI_API_KEY');
    const groqKeys = collectKeys(config, 'GROQ');

    if (selected === 'claude' && anthropicKey) {
      this.provider = new ClaudeProvider(anthropicKey, config.get<string>('ANTHROPIC_MODEL') ?? 'claude-opus-4-8');
    } else if (selected === 'openai' && openaiKey) {
      this.provider = new OpenAIProvider(openaiKey, config.get<string>('OPENAI_MODEL') ?? 'gpt-4o');
    } else if (selected === 'groq' && groqKeys.length) {
      // Groq is OpenAI-compatible — reuse the adapter with Groq's base URL.
      // The rotating provider auto-fails-over across as many free-tier keys as
      // are supplied (GROQ_API_KEYS / GROQ_API_KEY / GROQ_API_KEY_1..10).
      const cooldownMs = Number(config.get<string>('GROQ_KEY_COOLDOWN_MS')) || undefined;
      this.groqPool = new RotatingOpenAIProvider(groqKeys, config.get<string>('GROQ_MODEL') ?? 'llama-3.3-70b-versatile', {
        baseURL: 'https://api.groq.com/openai/v1',
        id: 'groq',
        cooldownMs,
      });
      this.provider = this.groqPool;
    } else {
      if (selected !== 'mock') {
        this.logger.warn(`AI_PROVIDER="${selected}" selected but no API key found — using mock provider.`);
      }
      this.provider = new MockProvider();
    }
    this.logger.log(`Active AI provider: ${this.provider.id}`);
  }

  /** Groq key-pool status (null when Groq isn't the active provider). */
  keyPoolStatus(): KeyPoolStatus | null {
    return this.groqPool ? this.groqPool.status() : null;
  }

  /** Resolve a provider for a single request (honors a per-request override). */
  forRequest(override?: 'claude' | 'openai' | 'groq'): AIProvider {
    // If the configured provider matches the override, reuse it; otherwise the
    // configured provider is authoritative (keys live server-side).
    if (override && override === this.provider.id) return this.provider;
    return this.provider;
  }

  get activeId() {
    return this.provider.id;
  }
}

/**
 * Gather every API key for a provider prefix, in priority order, de-duplicated:
 *   <PREFIX>_API_KEYS  — comma/newline-separated list (preferred for many keys)
 *   <PREFIX>_API_KEY   — single key (back-compat)
 *   <PREFIX>_API_KEY_1 … _10 — numbered keys (easy to append more later)
 */
function collectKeys(config: ConfigService, prefix: string): string[] {
  const out: string[] = [];
  const add = (raw?: string) => {
    if (!raw) return;
    for (const part of raw.split(/[\n,]/)) {
      const key = part.trim();
      if (key && !out.includes(key)) out.push(key);
    }
  };
  add(config.get<string>(`${prefix}_API_KEYS`));
  add(config.get<string>(`${prefix}_API_KEY`));
  for (let i = 1; i <= 10; i++) add(config.get<string>(`${prefix}_API_KEY_${i}`));
  return out;
}
