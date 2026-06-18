import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  strong?: boolean;
}

/** Frosted surface card — the building block of the glassmorphic UI. */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ glow = false, strong = false, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-3xl',
        strong ? 'glass-strong' : 'glass',
        glow && 'ring-glow',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
GlassCard.displayName = 'GlassCard';
