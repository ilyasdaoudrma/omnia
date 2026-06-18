import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ClerkProvider } from '@clerk/clerk-react';
import { LocaleProvider } from './lib/i18n';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

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
    return (
      <ClerkProvider publishableKey={clerkKey} afterSignOutUrl="/">
        {tree}
      </ClerkProvider>
    );
  }
  return tree;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

// PWA: register the well-behaved service worker (network-first navigations only,
// never caches API/assets) — replaces the old stale-SW cleanup that lived here.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
