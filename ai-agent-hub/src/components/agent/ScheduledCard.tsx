import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CalendarClock, ShoppingBag, BedDouble, Car, Repeat, ArrowRight } from 'lucide-react';
import type { RecurrenceView } from '@/lib/ai/types';
import { GlassCard } from '@/components/ui/GlassCard';

/**
 * Confirmation card shown after the agent schedules a recurring task
 * ("order my usual every Friday"). Read-only — the task is already saved; the
 * user manages or cancels it from the Dashboard.
 */
export function ScheduledCard({ recurrence }: { recurrence: RecurrenceView }) {
  const Icon =
    recurrence.marketplace === 'eats'
      ? ShoppingBag
      : recurrence.marketplace === 'rides'
        ? Car
        : recurrence.marketplace === 'stays'
          ? BedDouble
          : Repeat;
  const next = new Date(recurrence.nextRunAt).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="ml-11 max-w-md"
    >
      <GlassCard strong glow className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-accent-soft" />
          <h3 className="font-semibold tracking-tight">Scheduled ✓</h3>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-accent-soft" />
            <h4 className="truncate text-sm font-semibold">{recurrence.label}</h4>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-accent-soft/90">
            <Repeat className="h-3 w-3" /> {recurrence.scheduleLabel}
          </p>
          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-2 text-sm text-white/70">
            <span>Next run</span>
            <span className="font-medium text-white">{next}</span>
          </div>
        </div>

        <Link
          to="/dashboard"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-accent/40 py-3 text-sm font-medium text-accent-soft transition-transform hover:scale-[1.02] hover:bg-accent/10"
          data-cursor="hover"
        >
          Manage in Dashboard <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-2 text-center text-xs text-white/35">
          I'll place this automatically each time — you'll get a notification when it runs.
        </p>
      </GlassCard>
    </motion.div>
  );
}
