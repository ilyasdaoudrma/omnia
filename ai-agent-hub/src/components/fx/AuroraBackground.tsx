import { memo } from 'react';

/**
 * Layered luxe aurora — soft gold/champagne glows + a faint grid on warm black.
 * Pure CSS, GPU-composited (transform/opacity only), fixed behind all content.
 * Kept restrained so it reads as premium atmosphere, not a heavy gold wash.
 */
export const AuroraBackground = memo(function AuroraBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink-950">
      {/* Generated gold ambient hero backdrop, fading into the warm black */}
      <img
        src="/hero-bg.webp"
        alt=""
        aria-hidden
        className="absolute inset-x-0 top-0 h-[90vh] w-full object-cover opacity-[0.7] [mask-image:linear-gradient(to_bottom,#000,#000_25%,transparent_85%)] [-webkit-mask-image:linear-gradient(to_bottom,#000,#000_25%,transparent_85%)]"
      />
      {/* Aurora glows: deep gold, champagne, and a cool silver for depth */}
      <div className="absolute left-[6%] top-[-12%] h-[52vh] w-[52vh] rounded-full bg-[#d4af37]/20 blur-[130px] animate-aurora-shift" />
      <div className="absolute right-[0%] top-[14%] h-[46vh] w-[46vh] rounded-full bg-[#f1d98a]/14 blur-[140px] animate-aurora-shift [animation-delay:-6s]" />
      <div className="absolute bottom-[-14%] left-[30%] h-[48vh] w-[48vh] rounded-full bg-[#e9e2d0]/10 blur-[150px] animate-aurora-shift [animation-delay:-11s]" />

      {/* Fine grid */}
      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(212,175,55,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.06) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, #000 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 30%, #000 40%, transparent 100%)',
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(5,5,5,0.92)_100%)]" />
    </div>
  );
});
