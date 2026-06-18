import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowLeft, ArrowRight, MapPin } from 'lucide-react';

type City = { name: string; img: string; tag: string };

/** The six OMNIA Stays cities, each with an editorial tagline. */
const CITIES: City[] = [
  { name: 'Rabat', img: '/cities/rabat.avif', tag: 'The coastal capital' },
  { name: 'Casablanca', img: '/cities/casablanca.jpg', tag: 'Art-deco by the ocean' },
  { name: 'Marrakech', img: '/cities/marrakech.jpg', tag: 'The red city' },
  { name: 'Tanger', img: '/cities/tanger.webp', tag: 'Where two seas meet' },
  { name: 'Oujda', img: '/cities/oujda.jpeg', tag: 'Gateway to the east' },
  { name: 'Agadir', img: '/cities/agadir.webp', tag: 'Sun, surf & palms' },
];

const N = CITIES.length;
const DURATION = 650;
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
type Role = 'center' | 'left' | 'right' | 'back' | 'hidden';

/** Depth (non-layout) properties per role. */
const DEPTH: Record<Role, { opacity: number; blur: number; z: number }> = {
  center: { opacity: 1, blur: 0, z: 30 },
  left: { opacity: 0.72, blur: 1.5, z: 20 },
  right: { opacity: 0.72, blur: 1.5, z: 20 },
  back: { opacity: 0.4, blur: 3, z: 10 },
  hidden: { opacity: 0, blur: 4, z: 0 },
};

/** Position purely via transform (translate + scale) so animation stays on the compositor — no layout. */
function transformFor(role: Role, isMobile: boolean): string {
  const sideX = isMobile ? 32 : 30;
  switch (role) {
    case 'center': return 'translateX(-50%) scale(1)';
    case 'left': return `translateX(calc(-50% - ${sideX}vw)) translateY(${isMobile ? -10 : -14}%) scale(${isMobile ? 0.5 : 0.58})`;
    case 'right': return `translateX(calc(-50% + ${sideX}vw)) translateY(${isMobile ? -10 : -14}%) scale(${isMobile ? 0.5 : 0.58})`;
    case 'back': return `translateX(-50%) translateY(${isMobile ? -16 : -20}%) scale(${isMobile ? 0.42 : 0.46})`;
    default: return 'translateX(-50%) translateY(-20%) scale(0.4)';
  }
}

function styleFor(role: Role, isMobile: boolean): CSSProperties {
  const d = DEPTH[role];
  return {
    position: 'absolute',
    left: '50%',
    bottom: isMobile ? '14%' : '10%',
    height: isMobile ? '56%' : '74%',
    aspectRatio: '0.64 / 1',
    transformOrigin: 'bottom center',
    transform: transformFor(role, isMobile),
    opacity: d.opacity,
    filter: d.blur ? `blur(${d.blur}px)` : 'none',
    zIndex: d.z,
    pointerEvents: role === 'hidden' ? 'none' : 'auto',
    transition: `transform ${DURATION}ms ${EASE}, opacity ${DURATION}ms ${EASE}, filter ${DURATION}ms ${EASE}`,
    willChange: 'transform, opacity',
  };
}

export function CityCarousel({ onPick }: { onPick: (city: string) => void }) {
  const [active, setActive] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [paused, setPaused] = useState(false);
  const animatingRef = useRef(false);
  const lockRef = useRef<number | null>(null);

  // Preload all city photos once.
  useEffect(() => {
    CITIES.forEach((c) => { const i = new Image(); i.src = c.img; });
  }, []);

  // Track viewport size for the mobile layout.
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const go = (idx: number) => {
    const target = ((idx % N) + N) % N;
    if (animatingRef.current || target === active) return;
    animatingRef.current = true;
    setActive(target);
    if (lockRef.current) window.clearTimeout(lockRef.current);
    lockRef.current = window.setTimeout(() => { animatingRef.current = false; }, DURATION);
  };

  // Keyboard arrows (rebinds when `active` changes so the closure stays fresh).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(active + 1);
      else if (e.key === 'ArrowLeft') go(active - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);

  // Gentle autoplay — paused on hover / focus, and when the user prefers reduced motion.
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (paused || reduce) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % N), 5200);
    return () => window.clearInterval(id);
  }, [paused]);

  const roleOf = useMemo(() => {
    const left = (active - 1 + N) % N;
    const right = (active + 1) % N;
    const back = (active + 2) % N;
    return (i: number): Role =>
      i === active ? 'center' : i === left ? 'left' : i === right ? 'right' : i === back ? 'back' : 'hidden';
  }, [active]);

  const current = CITIES[active];

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative h-[90svh] min-h-[620px] w-full overflow-hidden bg-[#0a0f1a]"
    >
      {/* Professional blurred backdrop — all 6 city photos stacked, crossfading by opacity only
          (GPU-composited, no per-frame re-blur). A moderate blur + grade keeps the city legible
          while letting the cards and type pop. */}
      <div className="absolute inset-0">
        {CITIES.map((c, i) => (
          <img
            key={c.name}
            src={c.img}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              opacity: i === active ? 1 : 0,
              filter: 'blur(22px)',
              transform: 'scale(1.14) translateZ(0)',
              transition: `opacity ${DURATION + 250}ms ease-out`,
              willChange: 'opacity',
            }}
          />
        ))}
      </div>
      {/* Grade: darken + vignette for legibility, plus seams into the light page above/below. */}
      <div className="pointer-events-none absolute inset-0 bg-black/35" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_28%,transparent,rgba(0,0,0,0.6))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-ink-950 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-950 to-transparent" />

      {/* Giant ghost city name behind the cards. */}
      <div className="pointer-events-none absolute inset-x-0 top-[15%] z-[2] flex select-none items-center justify-center">
        <span
          className="font-serif uppercase leading-none text-[#fff]/[0.13]"
          style={{ fontSize: 'clamp(72px, 22vw, 300px)', letterSpacing: '-0.03em', whiteSpace: 'nowrap' }}
        >
          {current.name}
        </span>
      </div>

      {/* Brand label */}
      <span className="absolute left-5 top-6 z-[60] inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#fff]/85 sm:left-10">
        <MapPin className="h-3.5 w-3.5" /> OMNIA Stays · Choose your city
      </span>

      {/* Carousel cards */}
      <div className="absolute inset-0 z-[3]">
        {CITIES.map((c, i) => {
          const role = roleOf(i);
          const isCenter = role === 'center';
          return (
            <button
              key={c.name}
              type="button"
              data-cursor="hover"
              aria-label={isCenter ? `Explore ${c.name}` : `Focus ${c.name}`}
              onClick={() => (isCenter ? onPick(c.name) : go(i))}
              style={styleFor(role, isMobile)}
              className="group overflow-hidden rounded-[1.6rem] text-left shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/10 focus:outline-none"
            >
              <img src={c.img} alt={c.name} draggable={false} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              {isCenter && <div className="absolute inset-0 rounded-[1.6rem] ring-2 ring-[#fff]/70" />}
              <div className="absolute inset-x-0 bottom-0 p-4">
                <p className="font-serif text-lg font-semibold leading-tight text-[#fff] drop-shadow-md sm:text-xl">{c.name}</p>
                {isCenter && <p className="mt-0.5 text-xs text-[#fff]/80">{c.tag}</p>}
              </div>
              {isCenter && (
                <span className="absolute right-3 top-3 rounded-full bg-[#fff]/90 px-3 py-1 text-[11px] font-semibold text-slate-900 opacity-0 shadow-lg transition-opacity duration-300 group-hover:opacity-100">
                  Explore →
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom-left: counter, tagline, prev/next */}
      <div className="absolute bottom-7 left-5 z-[60] max-w-xs sm:bottom-16 sm:left-12">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#fff]/70">
          Destination {String(active + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
        </p>
        <p className="mt-1 font-serif text-2xl text-[#fff] sm:text-3xl">{current.tag}</p>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={() => go(active - 1)} data-cursor="hover" aria-label="Previous city" className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#fff]/60 text-[#fff] transition-all duration-150 hover:scale-105 hover:bg-[#fff]/15 sm:h-14 sm:w-14">
            <ArrowLeft className="h-5 w-5" strokeWidth={2.25} />
          </button>
          <button onClick={() => go(active + 1)} data-cursor="hover" aria-label="Next city" className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#fff]/60 text-[#fff] transition-all duration-150 hover:scale-105 hover:bg-[#fff]/15 sm:h-14 sm:w-14">
            <ArrowRight className="h-5 w-5" strokeWidth={2.25} />
          </button>
        </div>
      </div>

      {/* Bottom-right: explore the active city */}
      <button
        onClick={() => onPick(current.name)}
        data-cursor="hover"
        className="group absolute bottom-7 right-5 z-[60] inline-flex items-center gap-2 font-serif uppercase text-[#fff] transition-opacity hover:opacity-90 sm:bottom-16 sm:right-10"
        style={{ fontSize: 'clamp(20px, 4vw, 52px)', letterSpacing: '-0.02em', lineHeight: 1 }}
      >
        Explore {current.name}
        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1 sm:h-8 sm:w-8" strokeWidth={2.25} />
      </button>
    </section>
  );
}
