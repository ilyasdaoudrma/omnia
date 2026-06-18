import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, Sparkles } from 'lucide-react';
import { EASE_EXPO } from '@/lib/motion';
import { useT } from '@/lib/i18n';

// ?v= cache-buster so browsers that cached a 404 (before the file existed) refetch.
const HERO_IMG = '/eats-hero.webp?v=2';

/** Cinematic full-bleed hero for OMNIA Eats — a Moroccan feast, Ken-Burns zoom + parallax. */
export function EatsHero() {
  const { t } = useT();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.08, 1.24]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 90]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const toCities = () => document.getElementById('cities')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section ref={ref} className="relative h-[100svh] overflow-hidden">
      <motion.div
        style={{
          scale: imgScale,
          backgroundImage: `url('${HERO_IMG}'), radial-gradient(120% 100% at 50% 35%, #1f140c, #0a0604)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
        className="absolute inset-0 will-change-transform"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/25" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent to-ink-950" />

      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center"
      >
        <motion.span
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE_EXPO }}
          className="mb-6 inline-flex items-center gap-2 rounded-full bg-[#fff]/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-[#fff]/85 ring-1 ring-[#fff]/20 backdrop-blur-md"
        >
          <Sparkles className="h-3.5 w-3.5" /> OMNIA Eats
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE_EXPO, delay: 0.08 }}
          className="font-serif text-[clamp(2.75rem,1.2rem+6vw,6.5rem)] font-bold leading-[0.96] tracking-tight text-[#fff] drop-shadow-[0_4px_40px_rgba(0,0,0,0.5)]"
        >
          {t('hero.title1')}
          <br />
          <span className="text-gradient">{t('hero.title2')}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE_EXPO, delay: 0.24 }}
          className="mx-auto mt-6 max-w-xl text-balance text-lg leading-relaxed text-[#fff]/75 drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)]"
        >
          The best local kitchens — tagines, pizza, sushi and more — delivered in a tap,
          by you or the OMNIA agent.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE_EXPO, delay: 0.4 }}
          onClick={toCities}
          data-cursor="hover"
          className="mt-9 inline-flex items-center gap-2 rounded-full bg-[#fff]/12 px-6 py-3 text-sm font-semibold text-[#fff] ring-1 ring-[#fff]/25 backdrop-blur-md transition-all duration-300 hover:bg-[#fff]/20 hover:ring-[#fff]/40"
        >
          {t('cta.chooseCity')} <ArrowDown className="h-4 w-4" />
        </motion.button>
      </motion.div>

      <button
        onClick={toCities}
        aria-label="Scroll to cities"
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
        data-cursor="hover"
      >
        <span className="grid h-9 w-9 animate-bob place-items-center rounded-full border border-[#fff]/30 text-[#fff]/75">
          <ArrowDown className="h-4 w-4" />
        </span>
      </button>
    </section>
  );
}
