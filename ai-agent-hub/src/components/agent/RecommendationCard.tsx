import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Check, Loader2, CheckCircle2, LogIn, History } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Recommendation } from '@/lib/ai/types';
import { Badge } from '@/components/ui/Badge';
import { ToolIcon } from '@/components/ui/ToolIcon';
import { formatMAD, cn } from '@/lib/utils';
import { bookStay, orderFood } from '@/lib/market';
import { useAgentStore } from '@/store/agentStore';

type ActionState = 'idle' | 'loading' | 'done' | 'needAuth' | 'error';

function ActionButton({ rec }: { rec: Recommendation }) {
  const [state, setState] = useState<ActionState>('idle');
  const label = rec.action === 'book' ? 'Book' : 'Order';

  const run = async () => {
    setState('loading');
    const res = rec.action === 'book' ? await bookStay(rec.refId!) : await orderFood(rec.refId!, rec.orderItemId);
    if (res.needAuth) setState('needAuth');
    else if (res.ok) setState('done');
    else setState('error');
  };

  if (state === 'needAuth') {
    return (
      <Link
        to="/sign-in"
        className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 px-3 py-1.5 text-xs font-medium text-accent-soft hover:bg-accent/10"
      >
        <LogIn className="h-3.5 w-3.5" /> Sign in to {label.toLowerCase()}
      </Link>
    );
  }
  if (state === 'done') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-medium text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" /> {rec.action === 'book' ? 'Booked' : 'Ordered'}
      </span>
    );
  }
  return (
    <button
      onClick={run}
      disabled={state === 'loading'}
      className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#9a7b1e,#f1d98a)] px-3.5 py-1.5 text-xs font-semibold text-black shadow-[0_4px_14px_-4px_rgba(212,175,55,0.6)] transition-transform hover:scale-[1.03] disabled:opacity-60"
      data-cursor="hover"
    >
      {state === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {state === 'error' ? 'Retry' : label}
    </button>
  );
}

export function RecommendationCard({ rec, compact = false }: { rec: Recommendation; compact?: boolean }) {
  const actionable = Boolean(rec.refId && rec.action);
  const { orderedVendorIds, orderedVendorNames } = useAgentStore((s) => s.personalization);
  const orderedBefore =
    rec.marketplace === 'eats' &&
    ((rec.refId != null && orderedVendorIds.includes(rec.refId)) || orderedVendorNames.includes(rec.title.toLowerCase()));
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative overflow-hidden rounded-2xl border bg-white/[0.03] transition-all duration-500 ease-expo hover:-translate-y-1',
        rec.best ? 'border-accent/40 shadow-[0_0_0_1px_rgba(212,175,55,0.25),0_20px_50px_-20px_rgba(212,175,55,0.5)]' : 'border-white/10',
      )}
      data-cursor="hover"
    >
      {rec.image && (
        <div className={cn('relative overflow-hidden', compact ? 'h-28' : 'h-40')}>
          <img
            src={rec.image}
            alt={rec.title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 ease-expo group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-transparent" />
          <div className="absolute left-3 top-3 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-black/40 backdrop-blur">
              <ToolIcon tool={rec.tool} />
            </span>
            {rec.badge && <Badge tone={rec.best ? 'accent' : 'neutral'}>{rec.badge}</Badge>}
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="line-clamp-2 text-[15px] font-semibold leading-tight tracking-tight">{rec.title}</h4>
            {rec.subtitle && <p className="mt-0.5 truncate text-sm text-white/45">{rec.subtitle}</p>}
            {orderedBefore && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-accent/25 bg-accent/[0.08] px-2 py-0.5 text-[11px] font-medium text-accent-soft">
                <History className="h-3 w-3" /> You've ordered here
              </span>
            )}
          </div>
          {rec.rating != null && (
            <span className="flex shrink-0 items-center gap-1 text-sm text-amber-300">
              <Star className="h-3.5 w-3.5 fill-current" />
              {rec.rating}
            </span>
          )}
        </div>

        {rec.meta && (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {rec.meta.map((m) => (
              <li key={m} className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/55">
                <Check className="h-3 w-3 text-emerald-400" /> {m}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 flex items-end justify-between gap-2">
          {rec.price != null ? (
            <span className="font-display text-xl font-bold text-gradient">
              {rec.action === 'order' ? `from ${formatMAD(rec.price)}` : formatMAD(rec.price)}
              {rec.tool === 'travel' && <span className="ml-1 text-xs font-normal text-white/40">/ night</span>}
            </span>
          ) : (
            <span />
          )}
          {actionable && <ActionButton rec={rec} />}
        </div>
      </div>
    </motion.article>
  );
}
