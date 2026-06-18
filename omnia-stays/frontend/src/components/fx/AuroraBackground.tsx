import { memo } from 'react';

/**
 * Light blue-and-white atmosphere — soft sky/azure glows + a faint grid on a
 * near-white base. Pure CSS, GPU-composited (transform/opacity only).
 */
export const AuroraBackground = memo(function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950">
      <img
        src="/hero-bg.webp"
        alt=""
        aria-hidden
        className="absolute inset-x-0 top-0 h-[88vh] w-full object-cover opacity-[0.55] [mask-image:linear-gradient(to_bottom,#000,#000_22%,transparent_82%)] [-webkit-mask-image:linear-gradient(to_bottom,#000,#000_22%,transparent_82%)]"
      />
      <div className="absolute left-[6%] top-[-12%] h-[52vh] w-[52vh] rounded-full bg-[#2563eb]/14 blur-[130px] animate-aurora-shift" />
      <div className="absolute right-[0%] top-[14%] h-[46vh] w-[46vh] rounded-full bg-[#3b82f6]/12 blur-[140px] animate-aurora-shift [animation-delay:-6s]" />
      <div className="absolute bottom-[-14%] left-[30%] h-[48vh] w-[48vh] rounded-full bg-[#93c5fd]/16 blur-[150px] animate-aurora-shift [animation-delay:-11s]" />

      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(37,99,235,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.05) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, #000 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, #000 40%, transparent 100%)',
        }}
      />

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(244,248,255,0.9)_100%)]" />
    </div>
  );
});
