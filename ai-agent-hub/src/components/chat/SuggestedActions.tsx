import { motion } from 'framer-motion';
import { stagger, fadeUp } from '@/lib/motion';

const SUGGESTIONS = [
  'Find me a beachfront apartment in Rabat for 3 nights under 500 MAD/night.',
  'Best burger near me with delivery under 80 MAD.',
  'Plan my weekend in Rabat for less than 3000 MAD.',
  'Order sunscreen, sunglasses, water and snacks for the beach.',
];

export function SuggestedActions({ onPick }: { onPick: (text: string) => void }) {
  return (
    <motion.div
      variants={stagger(0.06)}
      initial="hidden"
      animate="show"
      className="grid gap-2.5 sm:grid-cols-2"
    >
      {SUGGESTIONS.map((s) => (
        <motion.button
          key={s}
          variants={fadeUp}
          onClick={() => onPick(s)}
          className="group rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left text-sm text-white/65 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-white/[0.06] hover:text-white"
          data-cursor="hover"
        >
          <span className="line-clamp-2">{s}</span>
        </motion.button>
      ))}
    </motion.div>
  );
}
