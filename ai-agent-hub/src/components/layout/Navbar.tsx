import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { authEnabled } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { AuthControls } from './AuthControls';

// Cross-app links use the deployed marketplace URLs in production (set the VITE_*_URL
// envs); they fall back to the local dev ports. Same env vars as lib/market.ts.
const LINKS = [
  { key: 'nav.stays', to: import.meta.env.VITE_STAYS_URL ?? 'http://localhost:5181' },
  { key: 'nav.eats', to: import.meta.env.VITE_EATS_URL ?? 'http://localhost:5182' },
  { key: 'nav.rides', to: import.meta.env.VITE_RIDES_URL ?? 'http://localhost:5183' },
  { key: 'nav.dashboard', to: '/dashboard' },
];

// Internal SPA route vs. external/hash link.
const isRoute = (to: string) => to.startsWith('/') && !to.startsWith('/#');

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { t } = useT();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4"
    >
      <nav
        className={cn(
          'flex w-full max-w-6xl items-center justify-between rounded-full px-3 py-2.5 transition-all duration-500 ease-standard',
          scrolled ? 'glass-strong shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]' : 'bg-transparent',
        )}
      >
        <Link to="/" className="pl-1" data-cursor="hover">
          <Logo imgClassName="h-9 w-9" />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) =>
            isRoute(l.to) ? (
              <Link
                key={l.key}
                to={l.to}
                className="rounded-full px-4 py-2 text-sm text-white/65 transition-colors hover:text-white"
                data-cursor="hover"
              >
                {t(l.key)}
              </Link>
            ) : (
              <a
                key={l.key}
                href={l.to}
                className="rounded-full px-4 py-2 text-sm text-white/65 transition-colors hover:text-white"
                data-cursor="hover"
              >
                {t(l.key)}
              </a>
            ),
          )}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <AuthControls />
          <Link to="/chat">
            <Button size="sm" magnetic>
              {t('cta.launch')}
            </Button>
          </Link>
        </div>

        <button
          className="grid h-10 w-10 place-items-center rounded-full text-white/80 md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-strong absolute inset-x-4 top-20 rounded-3xl p-4 md:hidden"
          >
            <div className="flex flex-col gap-1">
              {LINKS.map((l) =>
                isRoute(l.to) ? (
                  <Link key={l.key} to={l.to} className="rounded-2xl px-4 py-3 text-white/80 hover:bg-white/5">
                    {t(l.key)}
                  </Link>
                ) : (
                  <a key={l.key} href={l.to} className="rounded-2xl px-4 py-3 text-white/80 hover:bg-white/5">
                    {t(l.key)}
                  </a>
                ),
              )}
              <Link to="/chat" className="mt-2">
                <Button className="w-full">{t('cta.launch')}</Button>
              </Link>
              {!authEnabled && (
                <p className="px-4 pt-2 text-center text-xs text-white/40">Guest mode · add a Clerk key to enable sign-in</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
