import { lazy, Suspense } from 'react';

/**
 * Lazily-loaded Clerk provider. Only pulled into a chunk when a publishable
 * key is configured — guest mode never downloads Clerk, keeping the landing
 * bundle lean.
 */
const ClerkProvider = lazy(() =>
  import('@clerk/clerk-react').then((m) => ({ default: m.ClerkProvider })),
);

export function ClerkProviderLazy({ publishableKey, children }: { publishableKey: string; children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">
        {children}
      </ClerkProvider>
    </Suspense>
  );
}
