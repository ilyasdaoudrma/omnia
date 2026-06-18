import { cn } from '@/lib/utils';

interface MarqueeProps {
  items: string[];
  className?: string;
}

/** Infinite horizontal ticker. Duplicates content for a seamless loop. */
export function Marquee({ items, className }: MarqueeProps) {
  const row = [...items, ...items];
  return (
    <div className={cn('mask-fade-x overflow-hidden', className)}>
      <div className="flex w-max animate-marquee gap-12 pr-12">
        {row.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-3 text-sm font-medium uppercase tracking-[0.2em] text-white/35"
          >
            {item}
            <span className="text-accent/60">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
