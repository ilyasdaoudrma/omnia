import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { authEnabled } from '@/lib/auth';

// Clerk components are split into their own chunk and only fetched when auth is on.
const ClerkButtons = lazy(() => import('@/components/auth/ClerkButtons'));

/**
 * Renders real Clerk auth controls when a publishable key is configured;
 * otherwise falls back to a guest-mode link so the app works with no keys.
 */
export function AuthControls() {
  if (!authEnabled) {
    return (
      <Link to="/dashboard">
        <Button variant="ghost" size="sm">
          Guest mode
        </Button>
      </Link>
    );
  }

  return (
    <Suspense fallback={<div className="h-8 w-16" />}>
      <ClerkButtons />
    </Suspense>
  );
}
