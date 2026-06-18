import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'accent' | 'neutral' | 'success' | 'warn';
}

const tones = {
  accent: 'bg-accent/15 text-accent-soft border-accent/25',
  neutral: 'bg-white/5 text-white/60 border-white/10',
  success: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/25',
  warn: 'bg-amber-400/15 text-amber-200 border-amber-400/25',
};

export function Badge({ tone = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight',
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
