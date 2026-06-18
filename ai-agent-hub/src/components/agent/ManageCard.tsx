import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShoppingBag, BedDouble, Car, Loader2, CheckCircle2, LogIn, XCircle, PencilLine, ArrowRight } from 'lucide-react';
import type { ManageAction } from '@/lib/ai/types';
import { useAgentStore } from '@/store/agentStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatMAD } from '@/lib/utils';

/**
 * Confirm card for a change to an EXISTING order/booking — cancel (destructive,
 * red) or modify a stay's nights/guests (gold). One tap applies it via the
 * marketplace API under the user's Clerk identity.
 */
export function ManageCard({ action }: { action: ManageAction }) {
  const { manageState, confirmManage } = useAgentStore();
  const isCancel = action.kind === 'cancel';
  const isEats = action.marketplace === 'eats';
  const isRides = action.marketplace === 'rides';
  const Icon = isEats ? ShoppingBag : isRides ? Car : BedDouble;
  const marketLabel = isEats ? 'OMNIA Eats' : isRides ? 'OMNIA Rides' : 'OMNIA Stays';
  const noun = isEats ? 'order' : isRides ? 'ride' : 'booking';

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
          {isCancel ? <XCircle className="h-4 w-4 text-red-300" /> : <PencilLine className="h-4 w-4 text-accent-soft" />}
          <h3 className="font-semibold tracking-tight">{isCancel ? 'Cancel this?' : 'Confirm change'}</h3>
        </div>

        <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-accent-soft" />
            <h4 className="truncate text-sm font-semibold">{action.title}</h4>
          </div>
          <p className="truncate text-xs text-white/45">
            {marketLabel}
            {action.subtitle ? ` · ${action.subtitle}` : ''}
          </p>

          {!isCancel && (
            <div className="mt-3 space-y-1.5 text-sm">
              {isRides ? (
                <>
                  <ChangeRow label="Pickup" from={action.prevPickup} to={action.pickup} />
                  <ChangeRow label="Dropoff" from={action.prevDropoff} to={action.dropoff} />
                </>
              ) : (
                <>
                  <ChangeRow label="Nights" from={action.prevNights} to={action.nights} />
                  <ChangeRow label="Guests" from={action.prevGuests} to={action.guests} />
                  <div className="flex items-center justify-between border-t border-white/10 pt-2 text-white/70">
                    <span>New total</span>
                    <span className="font-display text-lg font-bold text-gradient">{formatMAD(action.newTotal ?? 0)}</span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-4">
          {manageState === 'done' ? (
            <div className="flex items-center justify-center gap-2 rounded-full bg-emerald-400/15 py-3 text-sm font-medium text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> {isCancel ? 'Cancelled' : 'Updated'}
            </div>
          ) : manageState === 'needAuth' ? (
            <Link
              to="/sign-in"
              className="flex w-full items-center justify-center gap-2 rounded-full border border-accent/40 py-3 text-sm font-medium text-accent-soft hover:bg-accent/10"
            >
              <LogIn className="h-4 w-4" /> Sign in to manage
            </Link>
          ) : (
            <button
              onClick={confirmManage}
              disabled={manageState === 'confirming'}
              className={
                isCancel
                  ? 'flex w-full items-center justify-center gap-2 rounded-full border border-red-400/40 bg-red-400/10 py-3 text-sm font-semibold text-red-200 transition-transform hover:scale-[1.02] hover:bg-red-400/15 disabled:opacity-60'
                  : 'flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#9a7b1e,#f1d98a)] py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02] disabled:opacity-60'
              }
              data-cursor="hover"
            >
              {manageState === 'confirming' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isCancel ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <PencilLine className="h-4 w-4" />
              )}
              {manageState === 'error'
                ? 'Retry'
                : isCancel
                  ? `Cancel ${noun}`
                  : isRides
                    ? 'Confirm change'
                    : `Confirm change · ${formatMAD(action.newTotal ?? 0)}`}
            </button>
          )}
          <p className="mt-2 text-center text-xs text-white/35">
            {isCancel ? 'This frees it up — no charge.' : isRides ? 'Updates your ride in place.' : 'Updates your existing booking in place.'}
          </p>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function ChangeRow({ label, from, to }: { label: string; from?: string | number; to?: string | number }) {
  const changed = from !== to;
  return (
    <div className="flex items-center justify-between gap-3 text-white/70">
      <span className="shrink-0">{label}</span>
      <span className="flex min-w-0 items-center justify-end gap-1.5 text-right">
        {changed ? (
          <>
            <span className="truncate text-white/40 line-through">{from ?? '—'}</span>
            <ArrowRight className="h-3 w-3 shrink-0 text-accent-soft" />
            <span className="truncate font-semibold text-white">{to ?? '—'}</span>
          </>
        ) : (
          <span className="truncate">{to ?? '—'}</span>
        )}
      </span>
    </div>
  );
}
