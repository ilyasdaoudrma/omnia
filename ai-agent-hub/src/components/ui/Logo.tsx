import { cn } from '@/lib/utils';

interface LogoProps {
  withWordmark?: boolean;
  className?: string;
  imgClassName?: string;
}

/**
 * OMNIA brand lockup — the "eye" mark (a real iris in a circular crop with a
 * gold accent ring) plus the wordmark.
 */
export function Logo({ withWordmark = true, className, imgClassName }: LogoProps) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className={cn('relative block h-9 w-9 shrink-0', imgClassName)}>
        <img
          src="/logo-eye.jpg"
          alt="OMNIA"
          className="absolute inset-0 h-full w-full rounded-full object-cover shadow-[0_2px_10px_-2px_rgba(0,0,0,0.5)]"
          draggable={false}
        />
        <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-inset ring-accent/55" />
        <span className="pointer-events-none absolute -inset-[3px] rounded-full ring-1 ring-accent/25" />
      </span>
      {withWordmark && (
        <span className="font-display text-[17px] font-semibold tracking-[0.32em] text-white">
          OMNIA
        </span>
      )}
    </span>
  );
}
