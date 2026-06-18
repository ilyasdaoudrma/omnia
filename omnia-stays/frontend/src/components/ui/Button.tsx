import { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useMagnetic } from '@/hooks/useMagnetic';

type Variant = 'primary' | 'ghost' | 'glass' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  magnetic?: boolean;
}

const base =
  'relative inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight transition-colors duration-300 ease-standard focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-50 disabled:pointer-events-none select-none';

const variants: Record<Variant, string> = {
  primary:
    'text-[#fff] shadow-[0_8px_30px_-6px_rgba(37,99,235,0.5)] bg-[linear-gradient(110deg,#1d4ed8,#2563eb_45%,#3b82f6)] hover:shadow-[0_10px_40px_-4px_rgba(59,130,246,0.45)]',
  glass: 'glass text-white hover:bg-white/[0.08] ring-glow',
  outline: 'border border-white/15 text-white hover:bg-white/[0.06] hover:border-white/30',
  ghost: 'text-white/70 hover:text-white hover:bg-white/[0.05]',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-[15px]',
  lg: 'h-14 px-8 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', magnetic = false, className, children, ...props }, _ref) => {
    const mag = useMagnetic(0.3);

    if (magnetic) {
      return (
        <motion.button
          ref={mag.ref as React.Ref<HTMLButtonElement>}
          style={{ x: mag.x, y: mag.y }}
          onMouseMove={mag.onMouseMove}
          onMouseLeave={mag.onMouseLeave}
          className={cn(base, variants[variant], sizes[size], className)}
          {...(props as React.ComponentProps<typeof motion.button>)}
        >
          {children}
        </motion.button>
      );
    }

    return (
      <button ref={_ref} className={cn(base, variants[variant], sizes[size], className)} {...props}>
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
