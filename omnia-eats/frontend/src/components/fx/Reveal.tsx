import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { fadeUp, inView } from '@/lib/motion';

interface RevealProps {
  children: React.ReactNode;
  variants?: Variants;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'span' | 'li';
}

/** Reveal-on-scroll wrapper using a shared viewport config. */
export function Reveal({ children, variants = fadeUp, delay = 0, className }: RevealProps) {
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={inView}
      transition={delay ? { delay } : undefined}
    >
      {children}
    </motion.div>
  );
}
