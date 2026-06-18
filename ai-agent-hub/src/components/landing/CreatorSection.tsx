import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useTransform, useReducedMotion } from 'framer-motion';
import { Instagram, Linkedin, Github, MessageCircle, ArrowUpRight } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

interface SocialLink {
  label: string;
  handle: string;
  href: string;
  Icon: typeof Instagram;
}

const LINKS: SocialLink[] = [
  { label: 'Instagram', handle: '@ig_yas10', href: 'https://instagram.com/ig_yas10', Icon: Instagram },
  { label: 'LinkedIn', handle: 'Ilyas Daoud El Asmi', href: 'https://www.linkedin.com/in/ilyas-daoud-el-asmi-0a531039b', Icon: Linkedin },
  { label: 'GitHub', handle: 'ilyasdaoudrma', href: 'https://github.com/ilyasdaoudrma', Icon: Github },
  { label: 'WhatsApp', handle: '+212 721 288 758', href: 'https://wa.me/212721288758', Icon: MessageCircle },
];

/**
 * "Meet the creator" — a parallax portrait + bio + socials. The portrait, its
 * glow, and the copy drift at different rates as the section scrolls through the
 * viewport (disabled under prefers-reduced-motion).
 */
export function CreatorSection() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  // Scroll progress driven by a rAF layout poll (0 when the section enters from the
  // bottom → 1 when it leaves at the top). Polling getBoundingClientRect each frame
  // works regardless of the smooth-scroll lib (Lenis) — same approach as the hero.
  const progress = useMotionValue(0.5);

  useEffect(() => {
    if (reduce) return;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let visible = false;
    const tick = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const p = (vh - r.top) / (vh + r.height); // 0 → 1 across the section's pass
      progress.set(Math.min(1, Math.max(0, p)));
      if (visible) raf = requestAnimationFrame(tick);
    };
    // Only animate while the section is near the viewport (no always-on rAF).
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        cancelAnimationFrame(raf);
        if (visible) raf = requestAnimationFrame(tick);
        else tick(); // one final settle so it parks at the clamped end value
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [reduce, progress]);

  const portraitY = useTransform(progress, [0, 1], [80, -80]);
  const glowY = useTransform(progress, [0, 1], [-60, 60]);
  const textY = useTransform(progress, [0, 1], [50, -50]);
  const ring = useTransform(progress, [0, 1], [-8, 8]); // subtle rotate on the ring

  return (
    <section id="creator" ref={ref} className="relative mx-auto max-w-6xl px-6 py-section">
      <SectionHeading
        eyebrow="Meet the creator"
        title="Built by one person, end to end"
        subtitle="The agent and all three marketplaces — design, frontend, and backend."
      />

      <div className="mt-14 grid items-center gap-12 md:grid-cols-[auto_1fr]">
        {/* Portrait with parallax + gold glow */}
        <div className="relative mx-auto h-60 w-60 shrink-0 sm:h-72 sm:w-72">
          <motion.div
            aria-hidden
            style={{ y: reduce ? 0 : glowY }}
            className="absolute -inset-8 rounded-full blur-3xl"
            // gold ambient glow behind the portrait
          >
            <div className="h-full w-full rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.5),transparent_65%)]" />
          </motion.div>
          <motion.div
            style={{ y: reduce ? 0 : portraitY, rotate: reduce ? 0 : ring }}
            className="relative h-full w-full"
          >
            <div className="absolute inset-0 rounded-full ring-2 ring-accent/60 ring-offset-4 ring-offset-ink-950" />
            <img
              src="/creator.png"
              alt="El Asmi Ilyas Daoud"
              className="h-full w-full rounded-full object-cover shadow-[0_30px_80px_-20px_rgba(212,175,55,0.45)]"
            />
          </motion.div>
        </div>

        {/* Bio + socials */}
        <motion.div
          style={{ y: reduce ? 0 : textY }}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="text-sm uppercase tracking-[0.22em] text-accent-soft/80">El Asmi Ilyas Daoud</p>
          <h3 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Full-stack <span className="text-gradient">developer</span>
          </h3>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/55">
            Full-stack developer who loves turning ideas into polished, production-grade products. I built OMNIA
            end-to-end — the AI agent and all three marketplaces (Stays, Eats &amp; Rides), from the React frontends
            to the NestJS + Prisma backends, the recurring-task scheduler, and the cross-app design system.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {LINKS.map(({ label, handle, href, Icon }) => (
              <motion.a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="hover"
                whileHover={{ y: -3 }}
                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition-colors hover:border-accent/40 hover:bg-accent/[0.06]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/12 text-accent-soft">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white/90">{label}</span>
                  <span className="block truncate text-xs text-white/45">{handle}</span>
                </span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-white/30 transition-colors group-hover:text-accent-soft" />
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
