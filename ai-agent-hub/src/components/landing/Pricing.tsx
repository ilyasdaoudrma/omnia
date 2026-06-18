import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { SectionHeading } from './SectionHeading';
import { Button } from '@/components/ui/Button';
import { stagger, fadeUp } from '@/lib/motion';
import { cn } from '@/lib/utils';

const TIERS = [
  {
    name: 'Explorer',
    price: 'Free',
    period: '',
    blurb: 'Try the agent on everyday requests.',
    features: ['50 agent runs / month', 'Travel & food tools', 'Live activity view', 'Community support'],
    cta: 'Start free',
    featured: false,
  },
  {
    name: 'Pro',
    price: '149',
    period: 'MAD / mo',
    blurb: 'For people who run their life through the agent.',
    features: [
      'Unlimited agent runs',
      'All tools + shopping & rides',
      'Memory & saved preferences',
      'Priority execution',
      'Itinerary builder',
    ],
    cta: 'Go Pro',
    featured: true,
  },
  {
    name: 'Teams',
    price: 'Custom',
    period: '',
    blurb: 'Shared agents and connected accounts for teams.',
    features: ['Everything in Pro', 'Shared connected accounts', 'Admin & roles', 'API access', 'SSO & SLA'],
    cta: 'Contact sales',
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative px-6 py-section">
      <SectionHeading
        eyebrow="Pricing"
        title={<>Simple plans for an <span className="text-gradient-cool">agentic</span> life</>}
        subtitle="Start free. Upgrade when the agent becomes how you get things done."
      />

      <motion.div
        variants={stagger(0.1)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto mt-14 grid max-w-5xl items-stretch gap-5 md:grid-cols-3"
      >
        {TIERS.map((t) => (
          <motion.div
            key={t.name}
            variants={fadeUp}
            className={cn(
              'relative flex flex-col rounded-4xl p-7',
              t.featured
                ? 'glass-strong ring-glow before:opacity-100 scale-[1.02] shadow-[0_30px_80px_-30px_rgba(212,175,55,0.6)]'
                : 'glass',
            )}
          >
            {t.featured && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[linear-gradient(110deg,#9a7b1e,#f1d98a)] px-3 py-1 text-xs font-semibold text-white">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-semibold tracking-tight">{t.name}</h3>
            <p className="mt-1 text-sm text-white/45">{t.blurb}</p>
            <div className="mt-6 flex items-baseline gap-1.5">
              <span className="font-display text-4xl font-bold tracking-tight">{t.price}</span>
              {t.period && <span className="text-sm text-white/45">{t.period}</span>}
            </div>

            <ul className="mt-6 flex-1 space-y-3">
              {t.features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm text-white/70">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-accent/15">
                    <Check className="h-3 w-3 text-accent-soft" />
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <Link to="/chat" className="mt-7">
              <Button className="w-full" variant={t.featured ? 'primary' : 'glass'}>
                {t.cta}
              </Button>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
