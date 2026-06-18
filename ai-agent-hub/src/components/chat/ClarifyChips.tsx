import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { stagger, fadeUp } from '@/lib/motion';

/**
 * Tappable options the agent offers when a follow-up was too ambiguous to act
 * on ("order one" after several dishes). Picking a chip sends it as the next
 * message, which resolves the ambiguity and assembles the checkout.
 */
export function ClarifyChips({ options, onPick }: { options: string[]; onPick: (text: string) => void }) {
  if (!options.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="ml-11 max-w-2xl"
    >
      <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-white/35">
        <HelpCircle className="h-3.5 w-3.5 text-accent-soft" />
        Pick one to continue
      </div>
      <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <motion.button
            key={opt}
            variants={fadeUp}
            onClick={() => onPick(opt)}
            className="rounded-full border border-accent/30 bg-accent/[0.06] px-4 py-2 text-sm text-accent-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/60 hover:bg-accent/[0.12] hover:text-white"
            data-cursor="hover"
          >
            {opt}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
}
