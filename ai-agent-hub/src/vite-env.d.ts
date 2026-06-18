/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly VITE_AI_PROVIDER?: 'mock' | 'claude' | 'openai' | 'groq';
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_STAYS_API_URL?: string;
  readonly VITE_EATS_API_URL?: string;
  readonly VITE_RIDES_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
