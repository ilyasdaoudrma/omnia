import { Link } from 'react-router-dom';
import { Github, Linkedin, Heart } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

// Only real, working destinations — no dead "#" placeholders.
const SOCIALS = [
  { label: 'GitHub', href: 'https://github.com/ilyasdaoudrma', Icon: Github },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/ilyas-daoud-el-asmi-0a531039b', Icon: Linkedin },
];

const ROUTES = [
  { label: 'Open agent', to: '/chat' },
  { label: 'Dashboard', to: '/dashboard' },
];

const MARKETPLACES = [
  { label: 'OMNIA Stays', href: import.meta.env.VITE_STAYS_URL ?? 'http://localhost:5181' },
  { label: 'OMNIA Eats', href: import.meta.env.VITE_EATS_URL ?? 'http://localhost:5182' },
  { label: 'OMNIA Rides', href: import.meta.env.VITE_RIDES_URL ?? 'http://localhost:5183' },
];

export function Footer() {
  return (
    <footer className="relative mt-section border-t border-white/10 px-6 pb-10 pt-16">
      <div className="mx-auto grid max-w-6xl gap-12 md:grid-cols-[1.6fr_1fr_1fr]">
        <div>
          <Link to="/">
            <Logo />
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/45">
            You wish — OMNIA does the rest. Describe what you want and your agent plans, compares, and acts across every service.
          </p>
          <div className="mt-6 flex gap-3">
            {SOCIALS.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-white/50 transition-colors hover:border-accent/40 hover:text-accent-soft"
                data-cursor="hover"
              >
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white/80">Product</h4>
          <ul className="mt-4 space-y-2.5">
            {ROUTES.map((l) => (
              <li key={l.label}>
                <Link to={l.to} className="text-sm text-white/45 transition-colors hover:text-white" data-cursor="hover">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white/80">Marketplaces</h4>
          <ul className="mt-4 space-y-2.5">
            {MARKETPLACES.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-white/45 transition-colors hover:text-white"
                  data-cursor="hover"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-sm text-white/40 md:flex-row">
        <p>© {new Date().getFullYear()} OMNIA. You wish, we do the rest.</p>
        <p className="flex items-center gap-1.5">
          Created by <span className="text-white/70">El Asmi Ilyas Daoud</span> with
          <Heart className="h-3.5 w-3.5 fill-accent text-accent" />
        </p>
      </div>
    </footer>
  );
}
