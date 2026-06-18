import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProviderLazy } from './components/auth/ClerkProviderLazy';
import { LocaleProvider } from './lib/i18n';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/**
 * Wrap with Clerk only when a publishable key is present. Without one the app
 * runs in "guest mode" so the showcase is fully explorable with zero setup.
 */
function Root() {
  const tree = (
    <LocaleProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </LocaleProvider>
  );

  if (clerkKey) {
    return <ClerkProviderLazy publishableKey={clerkKey}>{tree}</ClerkProviderLazy>;
  }
  return tree;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

// PWA: register the service worker so OMNIA is installable + works offline.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
