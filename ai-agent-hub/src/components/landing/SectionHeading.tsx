import { Reveal } from '@/components/fx/Reveal';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

interface Props {
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  align?: 'center' | 'left';
  className?: string;
}

export function SectionHeading({ eyebrow, title, subtitle, align = 'center', className }: Props) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' ? 'mx-auto max-w-2xl items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      {eyebrow && (
        <Reveal>
          <Badge tone="accent">{eyebrow}</Badge>
        </Reveal>
      )}
      <Reveal>
        <h2 className="font-display text-display-lg font-bold tracking-tight text-balance">{title}</h2>
      </Reveal>
      {subtitle && (
        <Reveal delay={0.06}>
          <p className="max-w-xl text-balance text-lg leading-relaxed text-white/50">{subtitle}</p>
        </Reveal>
      )}
    </div>
  );
}
