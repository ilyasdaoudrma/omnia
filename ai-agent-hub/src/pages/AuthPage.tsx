import { SignIn, SignUp } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PageTransition } from '@/components/fx/PageTransition';
import { Logo } from '@/components/ui/Logo';
import { EASE_EXPO } from '@/lib/motion';

/**
 * Dedicated sign-in / sign-up surface — a premium two-column card floating over
 * the OMNIA world: the form on the left, the signature eye on the right. Clerk's
 * prebuilt flow is styled to sit transparently inside the left panel (Google and
 * email appear automatically once enabled as social connections in the dashboard).
 */
const appearance = {
  variables: {
    colorPrimary: '#d4af37',
    colorBackground: 'transparent',
    colorText: '#f6f2e6',
    colorTextSecondary: '#c2b591',
    colorInputBackground: 'rgba(255,255,255,0.05)',
    colorInputText: '#f6f2e6',
    colorInputBorder: 'rgba(255,255,255,0.12)',
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full',
    // Dissolve Clerk's own card so it blends into our left panel.
    card: 'bg-transparent shadow-none border-0 w-full p-0 gap-5',
    header: 'hidden',
    socialButtonsBlockButton: 'border border-white/12 bg-white/[0.04] hover:bg-white/10 text-white',
    socialButtonsBlockButtonText: 'text-white/90',
    dividerLine: 'bg-white/10',
    dividerText: 'text-white/35',
    formFieldLabel: 'text-white/65',
    formFieldInput: 'bg-white/[0.05] border-white/10 text-white',
    formButtonPrimary:
      'bg-[linear-gradient(110deg,#9a7b1e,#d4af37_45%,#f1d98a)] hover:opacity-90 text-black text-sm font-semibold normal-case',
    footer: 'bg-transparent',
    footerActionText: 'text-white/45',
    footerActionLink: 'text-accent-soft hover:text-accent',
    formFieldInputShowPasswordButton: 'text-white/50 hover:text-white',
  },
} as const;

export function AuthPage({ mode }: { mode: 'sign-in' | 'sign-up' }) {
  const isSignUp = mode === 'sign-up';

  return (
    <PageTransition>
      <div className="relative flex min-h-[100svh] w-full items-center justify-center overflow-hidden bg-ink-950 px-4 py-10">
        {/* Ambient OMNIA-world backdrop */}
        <div
          aria-hidden
          className="absolute inset-0 scale-110"
          style={{ backgroundImage: 'url(/eye-world.webp)', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(10px) brightness(0.45)' }}
        />
        <div aria-hidden className="absolute inset-0 bg-ink-950/75" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(60% 45% at 50% 0%, rgba(212,175,55,0.18), transparent 60%)' }}
        />

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE_EXPO }}
          className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-[1.6rem] border border-white/10 shadow-[0_50px_140px_-30px_rgba(0,0,0,0.85)] md:grid-cols-2"
        >
          {/* Left — form */}
          <div className="flex flex-col bg-[rgba(9,8,6,0.94)] px-6 py-9 sm:px-10">
            <Link to="/" className="mb-8 w-fit" aria-label="OMNIA home" data-cursor="hover">
              <Logo imgClassName="h-9 w-9" />
            </Link>

            <div className="mt-auto">
              <h1 className="font-display text-3xl font-bold tracking-tight text-white">
                {isSignUp ? 'Create your account' : 'Welcome back'}
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                {isSignUp
                  ? 'Set up your profile and let the agent plan, book and order for you.'
                  : 'Sign in to pick up exactly where your agent left off.'}
              </p>

              <div className="mt-7">
                {isSignUp ? (
                  <SignUp appearance={appearance} signInUrl="/sign-in" forceRedirectUrl="/chat" />
                ) : (
                  <SignIn appearance={appearance} signUpUrl="/sign-up" forceRedirectUrl="/chat" />
                )}
              </div>
            </div>
          </div>

          {/* Right — the signature eye (desktop only) */}
          <div className="relative hidden md:block">
            <img src="/eye-hero.webp" alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25" />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'radial-gradient(80% 60% at 50% 40%, transparent 35%, rgba(5,5,5,0.55) 100%)' }}
            />
            <div className="absolute inset-0 flex flex-col justify-end p-9">
              <h2 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)]">
                Wish it.
                <br />
                <span className="text-gradient">OMNIA</span> does the rest.
              </h2>
              <p className="mt-3 max-w-[18rem] text-sm leading-relaxed text-white/70">
                One login across travel, food and rides — and the agent that books them all for you.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </PageTransition>
  );
}
