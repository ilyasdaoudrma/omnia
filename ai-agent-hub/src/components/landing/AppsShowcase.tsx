import { motion } from 'framer-motion';
import { ArrowUpRight, BedDouble, UtensilsCrossed, Car } from 'lucide-react';
import { SectionHeading } from './SectionHeading';
import { Reveal } from '@/components/fx/Reveal';
import { stagger, fadeUp } from '@/lib/motion';

interface AppCard {
  name: string;
  verb: string;
  tagline: string;
  href: string;
  image: string;
  accent: string;
  glow: string;
  Icon: typeof BedDouble;
}

// The three OMNIA marketplaces the agent acts across. Click → open the app.
const APPS: AppCard[] = [
  {
    name: 'OMNIA Stays',
    verb: 'Stay',
    tagline: 'Homes, riads & apartments across six Moroccan cities.',
    href: import.meta.env.VITE_STAYS_URL ?? 'http://localhost:5181',
    image: '/app-stays.webp',
    accent: '#3b82f6',
    glow: 'rgba(59,130,246,0.45)',
    Icon: BedDouble,
  },
  {
    name: 'OMNIA Eats',
    verb: 'Eat',
    tagline: 'Order from the best local kitchens, delivered.',
    href: import.meta.env.VITE_EATS_URL ?? 'http://localhost:5182',
    image: '/app-eats.webp',
    accent: '#f97316',
    glow: 'rgba(249,115,22,0.45)',
    Icon: UtensilsCrossed,
  },
  {
    name: 'OMNIA Rides',
    verb: 'Ride',
    tagline: 'A car in seconds — from a Sandero to a Porsche.',
    href: import.meta.env.VITE_RIDES_URL ?? 'http://localhost:5183',
    image: '/app-rides.webp',
    accent: '#22c55e',
    glow: 'rgba(34,197,94,0.45)',
    Icon: Car,
  },
];

/** "One agent, three worlds" — see the marketplaces OMNIA acts across, and open each. */
export function AppsShowcase() {
  return (
    <section id="worlds" className="relative mx-auto max-w-6xl px-6 py-section">
      <SectionHeading
        eyebrow="One agent, three worlds"
        title="Everything OMNIA does, you can open yourself"
        subtitle="The agent books into these three marketplaces for you — or step inside any of them directly."
      />

      <motion.div
        variants={stagger(0.1, 0.05)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mt-14 grid gap-5 md:grid-cols-3"
      >
        {APPS.map(({ name, verb, tagline, href, image, accent, glow, Icon }) => (
          <motion.a
            key={name}
            variants={fadeUp}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            data-cursor="hover"
            className="group relative block h-[26rem] overflow-hidden rounded-3xl border border-white/10"
          >
            {/* Image — the app's actual cinematic hero photo (cache-busted). */}
            <img
              src={`${image}?v=hero`}
              alt={name}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110"
            />
            {/* Dark gradient for legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/10" />
            {/* Themed accent glow on hover */}
            <div
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              style={{ background: `radial-gradient(120% 80% at 50% 100%, ${glow}, transparent 60%)` }}
            />
            {/* Accent top hairline */}
            <span className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100" style={{ background: accent }} />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col justify-between p-6">
              <div className="flex items-center justify-between">
                <span
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-md"
                  style={{ borderColor: `${accent}66`, color: '#fff', background: `${accent}1f` }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: accent }} /> {name}
                </span>
                <span
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white backdrop-blur-md transition-all duration-500 group-hover:bg-white group-hover:text-black"
                >
                  <ArrowUpRight className="h-5 w-5 transition-transform duration-500 group-hover:rotate-12" />
                </span>
              </div>

              <div>
                <h3 className="font-display text-4xl font-bold tracking-tight text-white">{verb}</h3>
                <p className="mt-1.5 max-w-[16rem] text-sm leading-relaxed text-white/70">{tagline}</p>
                <span
                  className="mt-3 inline-flex translate-y-1 items-center gap-1.5 text-sm font-semibold opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100"
                  style={{ color: accent }}
                >
                  Open {name.replace('OMNIA ', '')} <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </motion.a>
        ))}
      </motion.div>

      <Reveal className="mt-8 text-center">
        <p className="text-sm text-white/40">
          All three share one OMNIA login — book with the agent and it shows up in each app instantly.
        </p>
      </Reveal>
    </section>
  );
}
