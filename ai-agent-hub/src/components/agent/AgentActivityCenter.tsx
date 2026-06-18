import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ListChecks, Sparkles } from 'lucide-react';
import { useAgentStore } from '@/store/agentStore';
import { StepRow } from './StepRow';
import { ToolIcon } from '@/components/ui/ToolIcon';
import { TOOLS } from '@/lib/ai/tools';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';

export function AgentActivityCenter() {
  const { tasks, steps, isRunning, activeTool } = useAgentStore();
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const progress = tasks.length ? Math.round((doneTasks / tasks.length) * 100) : 0;

  return (
    <aside className="flex h-full flex-col gap-4 overflow-hidden">
      {/* Status header */}
      <div className="glass rounded-3xl p-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-white/80">
            <Activity className="h-4 w-4 text-accent-soft" />
            Agent activity
          </span>
          <Badge tone={isRunning ? 'accent' : 'neutral'}>
            <span className={cn('h-1.5 w-1.5 rounded-full', isRunning ? 'animate-pulse bg-accent' : 'bg-white/40')} />
            {isRunning ? 'Working' : 'Idle'}
          </Badge>
        </div>

        {/* Active tool */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/5">
            {activeTool ? <ToolIcon tool={activeTool as keyof typeof TOOLS} className="h-5 w-5" /> : <Sparkles className="h-4 w-4 text-white/40" />}
          </span>
          <div className="min-w-0">
            <p className="text-xs text-white/40">Current tool</p>
            <p className="truncate text-sm font-medium">
              {activeTool ? TOOLS[activeTool as keyof typeof TOOLS].name : 'Standing by'}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-white/45">
            <span>Plan progress</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
            <motion.div
              className="h-full rounded-full bg-[linear-gradient(90deg,#9a7b1e,#f1d98a)]"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        </div>
      </div>

      {/* Tasks */}
      {tasks.length > 0 && (
        <div className="glass rounded-3xl p-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-white/80">
            <ListChecks className="h-4 w-4 text-accent-soft" /> Task plan
          </p>
          <ol className="space-y-2">
            {tasks.map((t, i) => (
              <li key={t.id} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs',
                    t.status === 'done'
                      ? 'bg-emerald-400/15 text-emerald-300'
                      : t.status === 'running'
                        ? 'bg-accent/20 text-accent-soft'
                        : 'bg-white/5 text-white/40',
                  )}
                >
                  {i + 1}
                </span>
                <span className={cn('flex-1', t.status === 'done' ? 'text-white/50 line-through decoration-white/20' : 'text-white/80')}>
                  {t.title}
                </span>
                <ToolIcon tool={t.tool} />
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Live steps */}
      <div className="glass flex-1 overflow-hidden rounded-3xl p-5">
        <p className="mb-3 text-sm font-medium text-white/80">Execution log</p>
        <div className="mask-fade-y h-full space-y-2 overflow-y-auto pr-1">
          {steps.length === 0 ? (
            <div className="flex h-full min-h-[8rem] items-center justify-center text-center text-sm text-white/30">
              The agent's steps will appear here as it works.
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {steps.map((s) => (
                <StepRow key={s.id} step={s} />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </aside>
  );
}
