import type { Variants, Transition } from 'framer-motion';

/** Luxe expo-out easing — the signature "buttery" curve. */
export const EASE_EXPO = [0.16, 1, 0.3, 1] as const;
/** Standard UI easing. */
export const EASE_STANDARD = [0.4, 0, 0.2, 1] as const;

export const springSoft: Transition = { type: 'spring', stiffness: 120, damping: 18, mass: 0.8 };
export const springSnappy: Transition = { type: 'spring', stiffness: 380, damping: 30 };

/** Reveal-on-scroll: fade + rise. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: EASE_EXPO },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6, ease: EASE_STANDARD } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: EASE_EXPO } },
};

/** Stagger container — children animate in sequence. */
export const stagger = (staggerChildren = 0.08, delayChildren = 0): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren, delayChildren },
  },
});

/** Masked word/line reveal: slides up from behind a clip. */
export const maskReveal: Variants = {
  hidden: { y: '110%' },
  show: { y: '0%', transition: { duration: 0.9, ease: EASE_EXPO } },
};

/** Shared viewport config for whileInView reveals. */
export const inView = { once: true, amount: 0.3 } as const;
