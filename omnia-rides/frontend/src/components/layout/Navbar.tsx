import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { SignedIn, SignedOut, UserButton } from '@clerk/clerk-react';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/Button';
import { authEnabled } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

const AGENT_URL = 'http://localhost:5180';
const ACCOUNT_PATH = '/trips';

function AuthButtons() {
  if (!authEnabled) {
    return (
      <Link to="/trips"><Button variant="ghost" size="sm">Guest</Button></Link>
    );
  }
  return (
    <>
      <SignedOut>
        <Link to="/sign-in"><Button variant="ghost" size="sm">Sign in</Button></Link>
        <Link to="/sign-up"><Button size="sm">Sign up</Button></Link>
      </SignedOut>
      <SignedIn>
        <Link to="/trips"><Button variant="ghost" size="sm">My rides</Button></Link>
        <UserButton appearance={{ elements: { avatarBox: 'h-10 w-10 ring-2 ring-accent/40' } }} />
      </SignedIn>
    </>
  );
}

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
          'flex w-full max-w-6xl items-center justify-between rounded-full px-3 py-2.5 transition-all duration-500',
          scrolled ? 'glass-strong shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]' : 'bg-transparent',
        )}
      >
        <Link to="/" className="flex items-center gap-2 pl-1" data-cursor="hover">
          <Logo />
          <span className="hidden text-xs font-medium uppercase tracking-[0.25em] text-accent-soft sm:inline">Rides</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <Link to="/" className={cn('rounded-full px-4 py-2 text-sm transition-colors', pathname === '/' ? 'text-white' : 'text-white/65 hover:text-white')} data-cursor="hover">
            {t('nav.explore')}
          </Link>
          <Link to={ACCOUNT_PATH} className="rounded-full px-4 py-2 text-sm text-white/65 transition-colors hover:text-white" data-cursor="hover">
            {t('nav.account')}
          </Link>
          <a href={AGENT_URL} className="rounded-full px-4 py-2 text-sm text-white/65 transition-colors hover:text-white" data-cursor="hover">
            {t('nav.agent')}
          </a>
        </div>

        <div className="flex items-center gap-2">
          <AuthButtons />
          <button
            className="grid h-10 w-10 place-items-center rounded-full text-white/80 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
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
              <Link to="/" className="rounded-2xl px-4 py-3 text-white/80 hover:bg-white/5">{t('nav.explore')}</Link>
              <Link to={ACCOUNT_PATH} className="rounded-2xl px-4 py-3 text-white/80 hover:bg-white/5">{t('nav.account')}</Link>
              <a href={AGENT_URL} className="rounded-2xl px-4 py-3 text-white/80 hover:bg-white/5">{t('nav.agent')}</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
