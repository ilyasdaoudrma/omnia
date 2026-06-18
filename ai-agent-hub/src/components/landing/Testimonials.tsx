import { motion } from 'framer-motion';
import { SectionHeading } from './SectionHeading';
import { Marquee } from '@/components/fx/Marquee';
import { stagger, fadeUp } from '@/lib/motion';

const QUOTES = [
  {
    quote: 'I described my whole Rabat weekend in one sentence and it came back with a plan, prices, and bookings ready to confirm. Wild.',
    name: 'Yasmine B.',
    role: 'Product designer',
  },
  {
    quote: 'It feels like talking to a concierge who actually does the legwork. The live "thinking" view is genuinely addictive.',
    name: 'Omar K.',
    role: 'Founder',
  },
  {
    quote: 'Ordered a full beach kit and a ride to the airport without opening a single app. This is the future.',
    name: 'Lina M.',
    role: 'Consultant',
  },
  {
    quote: 'The agent compared options I would never have found and saved me 600 MAD on a stay. Sold.',
    name: 'Reda T.',
    role: 'Engineer',
  },
];

const LOGOS = ['Atlas Travel', 'MarsocEats', 'SwiftRide', 'BeachCo', 'Medina Stays', 'Casa Cart'];

export function Testimonials() {
  return (
    <section className="relative px-6 py-section">
      <Marquee items={LOGOS} className="mb-20" />

      <SectionHeading
        eyebrow="Loved by early users"
        title={<>People are letting go of the <span className="text-gradient">menus</span></>}
      />

      <motion.div
        variants={stagger(0.08)}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto mt-14 grid max-w-6xl gap-4 md:grid-cols-2"
      >
        {QUOTES.map((q) => (
          <motion.figure
            key={q.name}
            variants={fadeUp}
            className="glass rounded-3xl p-7 transition-transform duration-500 ease-expo hover:-translate-y-1"
          >
            <blockquote className="text-lg leading-relaxed text-white/80">“{q.quote}”</blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[linear-gradient(135deg,#9a7b1e,#f1d98a)] text-sm font-semibold text-white">
                {q.name.charAt(0)}
              </span>
              <div>
                <p className="text-sm font-semibold">{q.name}</p>
                <p className="text-xs text-white/45">{q.role}</p>
              </div>
            </figcaption>
          </motion.figure>
        ))}
      </motion.div>
    </section>
  );
}
