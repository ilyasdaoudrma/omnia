import { SignIn, SignUp } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { PageTransition } from '@/components/fx/PageTransition';
import { Logo } from '@/components/ui/Logo';

const appearance = {
  variables: {
    colorPrimary: '#16a34a',
    colorText: '#0f172a',
    colorTextSecondary: '#64748b',
    colorBackground: '#ffffff',
    colorInputBackground: '#f1f5f9',
    colorInputText: '#0f172a',
    borderRadius: '0.9rem',
  },
  elements: {
    card: 'glass-strong shadow-[0_30px_80px_-30px_rgba(22,163,74,0.35)]',
    socialButtonsBlockButton: 'border border-slate-300 text-slate-800 hover:bg-slate-100',
    formButtonPrimary: 'bg-[linear-gradient(110deg,#15803d,#16a34a_45%,#22c55e)] text-[#fff] text-sm normal-case',
    footerActionLink: 'text-accent-soft hover:text-accent',
  },
} as const;

export function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  return (
    <PageTransition>
      <div className="flex min-h-[100svh] flex-col items-center justify-center px-6 py-28">
        <Link to="/" className="mb-8"><Logo imgClassName="h-10 w-10" /></Link>
        <p className="mb-6 max-w-sm text-center text-sm text-white/50">
          {mode === 'sign-up' ? 'Create your OMNIA account — one login works across Rides, Stays, Eats, and the agent.' : 'Welcome back to OMNIA Rides.'}
        </p>
        {mode === 'sign-up' ? (
          <SignUp appearance={appearance} signInUrl="/sign-in" forceRedirectUrl="/trips" />
        ) : (
          <SignIn appearance={appearance} signUpUrl="/sign-up" forceRedirectUrl="/trips" />
        )}
      </div>
    </PageTransition>
  );
}
