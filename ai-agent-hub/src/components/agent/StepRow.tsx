import { motion } from 'framer-motion';
import { Loader2, Check } from 'lucide-react';
import type { AgentStep } from '@/lib/ai/types';
import { ToolIcon } from '@/components/ui/ToolIcon';
import { cn } from '@/lib/utils';

export function StepRow({ step }: { step: AgentStep }) {
  const running = step.status === 'running';
  const done = step.status === 'done';
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.025] px-3.5 py-3"
    >
      <span
        className={cn(
          'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border',
          done ? 'border-emerald-400/40 bg-emerald-400/10' : running ? 'border-accent/50 bg-accent/10' : 'border-white/15 bg-white/5',
        )}
      >
        {done ? (
          <Check className="h-3.5 w-3.5 text-emerald-400" />
        ) : running ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-soft" />
        ) : step.tool ? (
          <ToolIcon tool={step.tool} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium', done ? 'text-white/70' : 'text-white')}>{step.label}</p>
        {step.detail && <p className="mt-0.5 truncate text-xs text-white/45">{step.detail}</p>}
      </div>
      {running && (
        <span className="relative mt-2 flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-accent/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
        </span>
      )}
    </motion.div>
  );
}
