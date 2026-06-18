/**
 * Whether real Clerk auth is wired. When false the app runs in guest mode and
 * auth UI falls back to a simple "Open app" link so the showcase needs no keys.
 * Add VITE_CLERK_PUBLISHABLE_KEY to .env to enable Clerk sign-in/up.
 */
export const authEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
