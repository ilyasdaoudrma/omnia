import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Sparkles, CornerDownLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { maskReveal, stagger, EASE_EXPO } from '@/lib/motion';

const PROMPTS = [
  'Find me a beachfront apartment in Rabat for 3 nights under 500 MAD/night.',
  'Best burger near me with delivery under 80 MAD.',
  'I need a ride to Casablanca airport tomorrow morning.',
  'Plan my weekend in Rabat for less than 3000 MAD.',
  'Order sunscreen, sunglasses, water and snacks for the beach.',
];

const HEADLINE = ['Wish it.', 'OMNIA', 'does the rest.'];

export function Hero() {
  const [promptIndex, setPromptIndex] = useState(0);
  const [typed, setTyped] = useState('');
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 120]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0]);

  // Typewriter cycling through example prompts.
  useEffect(() => {
    const full = PROMPTS[promptIndex];
    let i = 0;
    setTyped('');
    const typer = setInterval(() => {
      i++;
      setTyped(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(typer);
        setTimeout(() => setPromptIndex((p) => (p + 1) % PROMPTS.length), 2600);
      }
    }, 32);
    return () => clearInterval(typer);
  }, [promptIndex]);

  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden px-6 pt-28">
      {/* Ghost typography */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-[42%] -translate-y-1/2 select-none text-center font-display text-[26vw] font-extrabold leading-none tracking-tighter text-white/[0.025]"
      >
        OMNIA
      </div>

      <motion.div style={{ y, opacity }} className="relative z-10 mx-auto max-w-4xl text-center">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE_EXPO }}>
          <Badge tone="accent" className="mx-auto mb-7 px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            You wish one thing — we do the rest
          </Badge>
        </motion.div>

        <motion.h1
          variants={stagger(0.12, 0.15)}
          initial="hidden"
          animate="show"
          className="font-display text-hero font-extrabold"
        >
          {HEADLINE.map((line, i) => (
            <span key={i} className="block overflow-hidden py-[0.06em]">
              <motion.span
                variants={maskReveal}
                className={i === 1 ? 'inline-block text-gradient tracking-[0.04em]' : 'inline-block'}
              >
                {line}
              </motion.span>
            </span>
          ))}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE_EXPO, delay: 0.5 }}
          className="mx-auto mt-7 max-w-xl text-balance text-lg leading-relaxed text-white/55"
        >
          Stop browsing menus and filters. Make one wish in plain language and OMNIA finds the
          best options, compares them, and acts — across travel, food, rides, and shopping.
        </motion.p>

        {/* Live prompt mock */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: EASE_EXPO, delay: 0.65 }}
          className="glass-strong mx-auto mt-10 flex max-w-2xl items-center gap-3 rounded-2xl p-2.5 pl-5 text-left"
        >
          <Sparkles className="h-5 w-5 shrink-0 text-accent-soft" />
          <p className="flex-1 truncate py-2 text-[15px] text-white/80">
            {typed}
            <span className="ml-0.5 inline-block h-[1.1em] w-[2px] -translate-y-[2px] animate-pulse bg-accent align-middle" />
          </p>
          <Link to="/chat" className="shrink-0">
            <Button size="sm" className="gap-1.5">
              Run <CornerDownLeft className="h-4 w-4" />
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link to="/chat">
            <Button size="lg" magnetic className="gap-2">
              Try the agent free <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href="#demo">
            <Button size="lg" variant="glass">
              Watch it think
            </Button>
          </a>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <div className="flex h-9 w-5 items-start justify-center rounded-full border border-white/20 p-1">
          <motion.span
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            className="h-1.5 w-1 rounded-full bg-white/60"
          />
        </div>
      </motion.div>
    </section>
  );
}
