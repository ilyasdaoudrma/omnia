/** Shared Clerk identity across all OMNIA apps. Guest mode when no key. */
export const authEnabled = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
