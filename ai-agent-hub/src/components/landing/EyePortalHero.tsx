import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, CornerDownLeft, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

const EYE_IMG = '/eye-hero.webp';
const WORLD_IMG = '/eye-world.webp?v=2'; // cache-bust: new cinematic portal world (2026-06-17)

// Where the pupil sits in the eye photo — the camera dives toward this point.
const PUPIL_X = 43;
const PUPIL_Y = 50;
const PUPIL_ORIGIN = `${PUPIL_X}% ${PUPIL_Y}%`;

const PROMPTS = [
  'Find me a beachfront apartment in Rabat for 3 nights under 500 MAD/night.',
  'Best burger near me with delivery under 80 MAD.',
  'I need a ride to Casablanca airport tomorrow morning.',
  'Plan my whole weekend in Agadir for less than 3000 MAD.',
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const easeIn = (t: number) => Math.pow(t, 1.85); // accelerate — feels like being pulled in
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * The signature OMNIA hero: the visitor meets a real eye, then on scroll *falls
 * into the pupil* — the iris rushes past and blurs, the pupil's darkness closes
 * in like a tunnel, a beat of black as they pass through, and the OMNIA world
 * resolves out of focus and brightens as they emerge. Driven by a single
 * hardware-accelerated rAF loop (scroll timeline + smoothed mouse parallax) so
 * the descent is buttery and frame-rate independent.
 */
export function EyePortalHero() {
  const reduced = usePrefersReducedMotion();
  const [promptIndex, setPromptIndex] = useState(0);
  const [typed, setTyped] = useState('');

  const rootRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const eyeRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const tunnelRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const burstRef = useRef<HTMLDivElement>(null);
  const scene1Ref = useRef<HTMLDivElement>(null);
  const scene2Ref = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);

  // Typewriter cycling through example wishes — keeps the "test the agent" feel up top.
  useEffect(() => {
    const full = PROMPTS[promptIndex];
    let i = 0;
    setTyped('');
    const typer = setInterval(() => {
      i++;
      setTyped(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(typer);
        setTimeout(() => setPromptIndex((p) => (p + 1) % PROMPTS.length), 2400);
      }
    }, 34);
    return () => clearInterval(typer);
  }, [promptIndex]);

  useEffect(() => {
    if (reduced) return; // honour reduced-motion: static hero, no scroll choreography
    const root = rootRef.current;
    if (!root) return;

    const targetM = { x: 0, y: 0 };
    const curM = { x: 0, y: 0 };
    let raf = 0;

    const onMouse = (e: MouseEvent) => {
      targetM.x = (e.clientX / window.innerWidth) * 2 - 1;
      targetM.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', onMouse, { passive: true });

    const tick = () => {
      // Smooth the cursor so parallax never stutters with frame rate.
      curM.x = lerp(curM.x, targetM.x, 0.07);
      curM.y = lerp(curM.y, targetM.y, 0.07);
      const rx = curM.x;
      const ry = curM.y;

      const span = Math.max(1, root.offsetHeight - window.innerHeight);
      const p = clamp(window.scrollY / span, 0, 1); // 0 → 1 across the sticky hero

      const dive = easeIn(p); // accelerating fall toward the pupil
      const through = clamp((p - 0.5) / 0.2, 0, 1); // 0.50 → 0.70 : passing through the pupil
      const emerge = easeOut(clamp((p - 0.6) / 0.32, 0, 1)); // 0.60 → 0.92 : the world resolving

      // ── The eye: accelerate into the pupil; iris rushes past and blurs; dissolves ──
      if (eyeRef.current) {
        const s = lerp(1, 18, dive);
        const blur = through * 16;
        eyeRef.current.style.transform = `scale(${s}) translate3d(${rx * 7}px, ${ry * 7}px, 0)`;
        eyeRef.current.style.opacity = String(clamp(1 - (p - 0.5) / 0.2, 0, 1));
        eyeRef.current.style.filter = `contrast(1.04) saturate(1.05)${blur > 0.3 ? ` blur(${blur.toFixed(1)}px)` : ''}`;
      }
      // ── Pupil tunnel: the dark iris walls closing in, then cleanly GONE once you
      //    punch through — fully fades by ~0.62 so no dark shape lingers over the world ──
      if (tunnelRef.current) {
        const ts = lerp(3.4, 0.5, dive);
        const tunnelFade = clamp(1 - (p - 0.5) / 0.12, 0, 1); // 1 until 0.50, → 0 by 0.62
        tunnelRef.current.style.transform = `scale(${ts})`;
        tunnelRef.current.style.opacity = String(clamp((p - 0.28) / 0.22, 0, 1) * tunnelFade);
      }
      // ── Gold bloom from the pupil, intensifying then snuffed at the threshold ──
      if (glowRef.current) {
        const gs = lerp(0.6, 5, dive);
        glowRef.current.style.transform = `scale(${gs})`;
        glowRef.current.style.opacity = String(clamp((p - 0.12) / 0.32, 0, 1) * 0.9 * (1 - through));
      }
      // ── The beat of black as you punch through the pupil (short + soft) ──
      if (flashRef.current) {
        flashRef.current.style.opacity = String(clamp(1 - Math.abs(p - 0.58) / 0.1, 0, 1) * 0.8);
      }
      // ── Light burst: a wash of warm gold light blooming outward as you break
      //    through into the world — the cinematic "wow" beat right after the black ──
      if (burstRef.current) {
        const bs = lerp(0.25, 4.6, clamp((p - 0.5) / 0.3, 0, 1));
        burstRef.current.style.transform = `scale(${bs})`;
        burstRef.current.style.opacity = String(clamp(1 - Math.abs(p - 0.64) / 0.16, 0, 1) * 0.95);
      }
      // ── The world on the other side: starts zoomed + soft + dark, focus-pulls to sharp + bright ──
      if (worldRef.current) {
        const ws = lerp(1.55, 1.04, emerge);
        const wblur = (1 - emerge) * 18;
        worldRef.current.style.transform = `scale(${ws}) translate3d(${rx * 10}px, ${ry * 10}px, 0)`;
        worldRef.current.style.opacity = String(clamp((p - 0.5) / 0.18, 0, 1));
        worldRef.current.style.filter = `brightness(${lerp(0.42, 1, emerge).toFixed(2)})${wblur > 0.3 ? ` blur(${wblur.toFixed(1)}px)` : ''}`;
      }

      // ── Copy: the wish fades as the descent begins; arrival fades in once through ──
      if (scene1Ref.current) {
        const o = clamp(1 - p / 0.18, 0, 1);
        scene1Ref.current.style.opacity = String(o);
        scene1Ref.current.style.transform = `translateY(${-p * 40}px)`;
        scene1Ref.current.style.pointerEvents = o < 0.05 ? 'none' : 'auto';
      }
      if (scene2Ref.current) {
        const o = clamp((p - 0.76) / 0.16, 0, 1);
        scene2Ref.current.style.opacity = String(o);
        scene2Ref.current.style.transform = `translateY(${(1 - o) * 26}px)`;
        scene2Ref.current.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
      }
      if (cueRef.current) cueRef.current.style.opacity = String(clamp(1 - p / 0.08, 0, 1));

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMouse);
    };
  }, [reduced]);

  return (
    <section ref={rootRef} className="relative" style={{ height: reduced ? '100svh' : '520vh' }}>
      <div className="sticky top-0 h-[100svh] overflow-hidden bg-ink-950">
        {/* World beyond the pupil */}
        <div
          ref={worldRef}
          className="absolute inset-0 will-change-transform"
          style={{
            opacity: 0,
            backgroundColor: '#080604',
            backgroundImage: `radial-gradient(120% 90% at 50% 60%, rgba(212,175,55,0.18), transparent 60%), url(${WORLD_IMG})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {/* The eye */}
        <div
          ref={eyeRef}
          className="absolute inset-0 will-change-transform"
          style={{
            transformOrigin: PUPIL_ORIGIN,
            backgroundImage: `url(${EYE_IMG})`,
            backgroundSize: 'cover',
            backgroundPosition: PUPIL_ORIGIN,
            filter: 'contrast(1.04) saturate(1.05)',
          }}
        />
        {/* Soft vignette to blend the (already-graded) eye into the page edges */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(78% 78% at ${PUPIL_ORIGIN}, transparent 40%, rgba(5,5,5,0.22) 76%, rgba(5,5,5,0.62) 100%)`,
            mixBlendMode: 'multiply',
          }}
        />
        {/* Gold bloom from the pupil */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            ref={glowRef}
            className="h-[42vmin] w-[42vmin] rounded-full will-change-transform"
            style={{
              opacity: 0,
              marginLeft: `${(PUPIL_X - 50) * 1.4}%`,
              marginTop: `${(PUPIL_Y - 50) * 1.4}%`,
              background: 'radial-gradient(circle, rgba(232,207,138,0.5) 0%, rgba(212,175,55,0.2) 35%, transparent 70%)',
              filter: 'blur(8px)',
            }}
          />
        </div>
        {/* Pupil tunnel — dark iris walls closing toward the pupil */}
        <div
          ref={tunnelRef}
          className="pointer-events-none absolute inset-0 will-change-transform"
          style={{
            opacity: 0,
            transformOrigin: PUPIL_ORIGIN,
            background: `radial-gradient(circle at ${PUPIL_ORIGIN}, transparent 0%, transparent 26%, rgba(3,2,1,0.6) 52%, #000 78%)`,
          }}
        />
        {/* The beat of black at the threshold */}
        <div ref={flashRef} className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: 0 }} />
        {/* Warm light burst — blooms out of the pupil as you break into the world */}
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div
            ref={burstRef}
            className="h-[55vmin] w-[55vmin] rounded-full will-change-transform"
            style={{
              opacity: 0,
              marginLeft: `${(PUPIL_X - 50) * 1.4}%`,
              marginTop: `${(PUPIL_Y - 50) * 1.4}%`,
              background:
                'radial-gradient(circle, rgba(255,247,224,0.9) 0%, rgba(232,207,138,0.55) 28%, rgba(212,175,55,0.18) 52%, transparent 72%)',
              filter: 'blur(6px)',
            }}
          />
        </div>

        {/* ── Scene 1 — the wish ── */}
        <div ref={scene1Ref} className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
          <h1 className="font-display text-hero font-extrabold leading-[0.95] drop-shadow-[0_2px_30px_rgba(0,0,0,0.6)]">
            <span className="block">Look closer.</span>
            <span className="block text-gradient tracking-[0.04em]">OMNIA</span>
            <span className="block">sees it all.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-xl text-balance text-lg leading-relaxed text-white/65 drop-shadow-[0_2px_16px_rgba(0,0,0,0.7)]">
            One wish, in plain language. OMNIA finds the best options across travel, food and
            rides, compares them, and acts. Scroll to step inside.
          </p>

          {/* Live wish — test the agent right here */}
          <div className="glass-strong mx-auto mt-9 flex w-full max-w-2xl items-center gap-3 rounded-2xl p-2.5 pl-5 text-left">
            <Sparkles className="h-5 w-5 shrink-0 text-accent-soft" />
            <p className="flex-1 truncate py-2 text-[15px] text-white/85">
              {typed}
              <span className="ml-0.5 inline-block h-[1.1em] w-[2px] -translate-y-[2px] animate-pulse bg-accent align-middle" />
            </p>
            <Link to="/chat" className="shrink-0">
              <Button size="sm" className="gap-1.5">
                Run <CornerDownLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Scene 2 — arrival, once through the pupil ── */}
        <div
          ref={scene2Ref}
          className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center"
          style={{ opacity: 0, pointerEvents: 'none' }}
        >
          <h2 className="font-display text-hero font-extrabold leading-[0.95] text-white drop-shadow-[0_2px_30px_rgba(0,0,0,0.5)]">
            <span className="block">Welcome</span>
            <span className="block text-gradient">inside OMNIA.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-balance text-lg leading-relaxed text-white/75">
            A single agent for everything you wish — travel, food and rides, planned and booked for you.
          </p>
          <Link to="/chat" className="mt-9">
            <Button size="lg" magnetic className="gap-2">
              Make your first wish <CornerDownLeft className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Scroll cue */}
        <div ref={cueRef} className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 text-center">
          <p className="mb-2 text-[10px] uppercase tracking-[0.28em] text-white/55">Fall in</p>
          <span className="mx-auto grid h-9 w-9 animate-bob place-items-center rounded-full border border-white/25 text-white/70">
            <ArrowDown className="h-4 w-4" />
          </span>
        </div>
      </div>
    </section>
  );
}
