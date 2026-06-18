import type { AIProvider } from './types';
import { MockProvider } from './mock';
import { BackendProvider } from './backend';

export * from './types';
export { TOOLS, TOOL_LIST } from './tools';

/**
 * Provider factory. Controlled by `VITE_AI_PROVIDER`:
 *   - "mock"   → fully client-side simulation (default, zero keys)
 *   - "claude" → real Claude run via your backend
 *   - "openai" → real GPT run via your backend
 *
 * The backend variants share one BackendProvider implementation and only
 * differ by which model the server uses — true provider abstraction.
 */
export function createAIProvider(): AIProvider {
  const provider = (import.meta.env.VITE_AI_PROVIDER ?? 'mock').toLowerCase();
  const baseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

  switch (provider) {
    case 'claude':
      return new BackendProvider(baseUrl, 'claude');
    case 'openai':
      return new BackendProvider(baseUrl, 'openai');
    case 'groq':
      return new BackendProvider(baseUrl, 'groq');
    case 'mock':
    default:
      return new MockProvider();
  }
}

/** Singleton instance for the app. */
export const aiProvider = createAIProvider();
