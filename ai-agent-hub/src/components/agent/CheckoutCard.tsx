import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ShoppingBag, BedDouble, Car, Loader2, CheckCircle2, LogIn, CreditCard, ReceiptText,
  Minus, Plus, Trash2, CalendarDays, Wallet, ExternalLink, AlertTriangle, Award, MapPin, Navigation,
} from 'lucide-react';
import type { CheckoutDraft, RideOption, TripPlan, TripBudget } from '@/lib/ai/types';
import { useAgentStore } from '@/store/agentStore';
import { computeLiveBudget } from '@/lib/budget';
import { isSignedIn, MARKETPLACE_LINKS } from '@/lib/market';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { formatMAD } from '@/lib/utils';

/** Reactive-ish signed-in check: Clerk loads async, so re-poll briefly after mount. */
function useSignedIn(): boolean {
  const [signed, setSigned] = useState(() => isSignedIn());
  useEffect(() => {
    let ticks = 0;
    const check = () => setSigned(isSignedIn());
    check();
    const id = setInterval(() => {
      check();
      if (++ticks > 8) clearInterval(id);
    }, 400);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', check);
    };
  }, []);
  return signed;
}

const Stepper = ({ value, onDec, onInc, min = 1 }: { value: number; onDec: () => void; onInc: () => void; min?: number }) => (
  <span className="flex items-center gap-1.5">
    <button
      type="button"
      onClick={onDec}
      disabled={value <= min}
      className="grid h-6 w-6 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-accent/50 hover:text-white disabled:opacity-30"
      aria-label="Decrease"
      data-cursor="hover"
    >
      <Minus className="h-3 w-3" />
    </button>
    <span className="w-5 text-center text-sm font-semibold tabular-nums">{value}</span>
    <button
      type="button"
      onClick={onInc}
      className="grid h-6 w-6 place-items-center rounded-full border border-white/15 text-white/70 transition hover:border-accent/50 hover:text-white"
      aria-label="Increase"
      data-cursor="hover"
    >
      <Plus className="h-3 w-3" />
    </button>
  </span>
);

/** One action in the receipt, with inline editing when the receipt isn't locked. */
function DraftSection({ draft, editable, onChange }: { draft: CheckoutDraft; editable: boolean; onChange: (d: CheckoutDraft) => void }) {
  const isEats = draft.marketplace === 'eats';
  const isRides = draft.marketplace === 'rides';
  const itemsSum = (draft.items ?? []).reduce((n, i) => n + i.price * i.qty, 0);
  const delivery = isEats ? Math.max(0, draft.total - itemsSum) : 0;
  const label = isEats ? 'OMNIA Eats' : isRides ? 'OMNIA Rides' : 'OMNIA Stays';
  const Icon = isEats ? ShoppingBag : isRides ? Car : BedDouble;

  // ── Eats edits ──
  const setQty = (menuItemId: string, qty: number) => {
    const items = (draft.items ?? [])
      .map((i) => (i.menuItemId === menuItemId ? { ...i, qty } : i))
      .filter((i) => i.qty > 0);
    const sub = items.reduce((n, i) => n + i.price * i.qty, 0);
    onChange({ ...draft, items, total: sub + delivery });
  };
  // One-tap add a suggested drink/side, then drop it from the chooser.
  const addSupplement = (s: { menuItemId: string; name: string; price: number }) => {
    const cur = draft.items ?? [];
    const items = cur.some((i) => i.menuItemId === s.menuItemId)
      ? cur.map((i) => (i.menuItemId === s.menuItemId ? { ...i, qty: i.qty + 1 } : i))
      : [...cur, { menuItemId: s.menuItemId, name: s.name, qty: 1, price: s.price }];
    const sub = items.reduce((n, i) => n + i.price * i.qty, 0);
    onChange({ ...draft, items, total: sub + delivery, supplements: (draft.supplements ?? []).filter((x) => x.menuItemId !== s.menuItemId) });
  };
  const skipSupplements = () => onChange({ ...draft, supplements: [] });
  // ── Stay edits ──
  const perNight = draft.nights ? Math.round(draft.total / draft.nights) : draft.total;
  const setNights = (nights: number) => onChange({ ...draft, nights, total: perNight * nights });
  const setGuests = (guests: number) => onChange({ ...draft, guests });
  // ── Ride tier edits ──
  const cityPart = draft.subtitle?.includes('·') ? draft.subtitle.split('·').pop()?.trim() : undefined;
  const selectTier = (opt: RideOption) =>
    onChange({ ...draft, refId: opt.refId, title: opt.name, subtitle: [opt.vehicle, cityPart].filter(Boolean).join(' · '), total: opt.total });
  // ── Ride route + distance edits ──
  const fareFor = (o: RideOption, km: number, min: number) => Math.round(o.baseFare + o.perKm * km + o.perMin * min);
  const setPickup = (v: string) => onChange({ ...draft, pickup: v });
  const setDropoff = (v: string) => onChange({ ...draft, dropoff: v });
  const setKm = (km: number) => {
    const k = Math.max(1, Math.min(200, Math.round(km)));
    const minutes = Math.max(5, Math.round(k * 2.2));
    const opts = (draft.rideOptions ?? []).map((o) => ({ ...o, total: fareFor(o, k, minutes) }));
    const sel = opts.find((o) => o.refId === draft.refId);
    onChange({ ...draft, distanceKm: k, minutes, rideOptions: opts.length ? opts : draft.rideOptions, total: sel ? sel.total : draft.total });
  };

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        {draft.image && <img src={draft.image} alt={draft.title} className="h-12 w-12 shrink-0 rounded-xl object-cover" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Icon className="h-3.5 w-3.5 text-accent-soft" />
            <h4 className="truncate text-sm font-semibold">{draft.title}</h4>
          </div>
          <p className="truncate text-xs text-white/45">{label}{draft.subtitle ? ` · ${draft.subtitle}` : ''}</p>
        </div>
      </div>

      {/* ── Eats: editable line items ── */}
      {isEats && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {(draft.items ?? []).map((i) => (
            <li key={i.menuItemId} className="flex items-center justify-between gap-2 text-white/75">
              <span className="min-w-0 flex-1 truncate">{i.name}</span>
              {editable ? (
                <span className="flex items-center gap-2.5">
                  <Stepper value={i.qty} onDec={() => setQty(i.menuItemId, i.qty - 1)} onInc={() => setQty(i.menuItemId, i.qty + 1)} />
                  <span className="w-16 text-right tabular-nums">{formatMAD(i.price * i.qty)}</span>
                  <button
                    type="button"
                    onClick={() => setQty(i.menuItemId, 0)}
                    className="text-white/35 transition hover:text-red-300"
                    aria-label={`Remove ${i.name}`}
                    data-cursor="hover"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </span>
              ) : (
                <span className="tabular-nums">{i.qty}× · {formatMAD(i.price * i.qty)}</span>
              )}
            </li>
          ))}
          {delivery > 0 && (
            <li className="flex justify-between text-white/45">
              <span>Delivery</span>
              <span>{formatMAD(delivery)}</span>
            </li>
          )}
        </ul>
      )}

      {/* ── Eats: optional drink/side upsell ── */}
      {isEats && editable && draft.supplements && draft.supplements.length > 0 && (
        <div className="mt-3 rounded-xl border border-accent/25 bg-accent/[0.06] p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-accent-soft">
            <Plus className="h-3 w-3" /> Add a drink or a side?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {draft.supplements.map((s) => (
              <button
                key={s.menuItemId}
                type="button"
                onClick={() => addSupplement(s)}
                className="rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-1 text-xs text-white/75 transition hover:border-accent/50 hover:text-white"
                data-cursor="hover"
              >
                {s.name} · {formatMAD(s.price)}
              </button>
            ))}
            <button
              type="button"
              onClick={skipSupplements}
              className="rounded-full px-2.5 py-1 text-xs text-white/40 underline-offset-2 transition hover:text-white/70 hover:underline"
              data-cursor="hover"
            >
              Skip
            </button>
          </div>
        </div>
      )}

      {/* ── Rides: editable route + distance + tier switcher ── */}
      {isRides && (
        <div className="mt-3 space-y-2 text-sm">
          {editable ? (
            <div className="space-y-2">
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-accent-soft" />
                <input
                  value={draft.pickup ?? ''}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="Pickup"
                  className="w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
                  data-cursor="hover"
                />
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <Navigation className="h-3.5 w-3.5 shrink-0 text-accent-soft" />
                <input
                  value={draft.dropoff ?? ''}
                  onChange={(e) => setDropoff(e.target.value)}
                  placeholder="Where to?"
                  className="w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
                  data-cursor="hover"
                />
              </label>
              <div className="flex items-center justify-between pt-0.5">
                <span className="flex items-center gap-2 text-white/60">
                  <span className="text-xs">Distance</span>
                  <Stepper value={draft.distanceKm ?? 8} onDec={() => setKm((draft.distanceKm ?? 8) - 1)} onInc={() => setKm((draft.distanceKm ?? 8) + 1)} />
                  <span className="text-xs text-white/45">km · ~{draft.minutes} min</span>
                </span>
                <span className="shrink-0 font-semibold tabular-nums">{formatMAD(draft.total)}</span>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-white/75">
                <span className="truncate pr-2">{draft.pickup} → {draft.dropoff}</span>
                <span className="shrink-0 tabular-nums">{formatMAD(draft.total)}</span>
              </div>
              {draft.distanceKm != null && <p className="text-xs text-white/45">~{draft.distanceKm} km · {draft.minutes} min</p>}
            </>
          )}
          {editable && draft.rideOptions && draft.rideOptions.length > 1 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {draft.rideOptions.map((opt) => {
                const active = opt.refId === draft.refId;
                return (
                  <button
                    key={opt.refId}
                    type="button"
                    onClick={() => selectTier(opt)}
                    className={
                      'rounded-full border px-2.5 py-1 text-xs transition ' +
                      (active ? 'border-accent/60 bg-accent/15 text-accent-soft' : 'border-white/12 text-white/55 hover:border-white/30 hover:text-white/80')
                    }
                    data-cursor="hover"
                  >
                    {opt.name.replace(/^OMNIA\s+/i, '')} · {formatMAD(opt.total)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Stays: nights / guests steppers ── */}
      {!isEats && !isRides && (
        <div className="mt-3 space-y-1.5 text-sm">
          <div className="flex items-center justify-between text-white/75">
            <span>Nights</span>
            {editable ? <Stepper value={draft.nights ?? 1} onDec={() => setNights((draft.nights ?? 1) - 1)} onInc={() => setNights((draft.nights ?? 1) + 1)} /> : <span>{draft.nights}</span>}
          </div>
          <div className="flex items-center justify-between text-white/75">
            <span>Guests</span>
            {editable ? <Stepper value={draft.guests ?? 1} onDec={() => setGuests((draft.guests ?? 1) - 1)} onInc={() => setGuests((draft.guests ?? 1) + 1)} /> : <span>{draft.guests}</span>}
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2 text-white/70">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatMAD(draft.total)}</span>
          </div>
        </div>
      )}

      {draft.note && (
        <p className="mt-2 rounded-lg bg-amber-400/10 px-2.5 py-1.5 text-xs text-amber-200/90">{draft.note}</p>
      )}
    </div>
  );
}

/** Day-by-day plan + budget reasoning shown for a planned full trip.
 *  `budget` is recomputed from the live (edited) drafts, so it tracks edits. */
function TripSummary({ trip, budget }: { trip: TripPlan; budget: TripBudget }) {
  const b = budget;
  const cur = 'MAD';
  return (
    <div className="mt-4 space-y-3">
      {/* Budget breakdown */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-accent-soft/80">
          <Wallet className="h-3.5 w-3.5" /> Budget
        </div>
        <dl className="space-y-1 text-sm text-white/70">
          <Row label="Stay" value={`${b.stay} ${cur}`} />
          <Row label="Ride" value={`${b.ride} ${cur}`} />
          <Row label="Food" value={`${b.food} ${cur}`} />
          <div className="flex justify-between border-t border-white/10 pt-1.5 font-semibold text-white/90">
            <span>Total</span>
            <span className="tabular-nums">{b.total} {cur}</span>
          </div>
          {b.budget != null && (
            b.overBudget ? (
              <div className="mt-1 flex items-center gap-1.5 rounded-lg bg-red-400/10 px-2 py-1.5 text-xs text-red-200">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {b.total - b.budget} {cur} over your {b.budget} {cur} budget
              </div>
            ) : (
              <div className="flex justify-between text-xs text-emerald-300/90">
                <span>Under your {b.budget} {cur} budget</span>
                <span className="tabular-nums">{b.remaining} {cur} left</span>
              </div>
            )
          )}
        </dl>
      </div>

      {/* Itinerary */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
        <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-accent-soft/80">
          <CalendarDays className="h-3.5 w-3.5" /> Itinerary{trip.city ? ` · ${trip.city}` : ''}
        </div>
        <ol className="space-y-3">
          {trip.days.map((d) => (
            <li key={d.day} className="relative pl-5">
              <span className="absolute left-0 top-1 grid h-3 w-3 place-items-center rounded-full bg-accent/70 text-[8px] font-bold text-black">{d.day}</span>
              <p className="text-sm font-semibold text-white/85">{d.title}</p>
              <ul className="mt-0.5 space-y-0.5 text-xs text-white/55">
                {d.stay && <li>🏠 {d.stay}</li>}
                {d.ride && <li>🚗 {d.ride}</li>}
                {d.meals.map((m, i) => <li key={i}>🍽️ {m}</li>)}
              </ul>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between">
    <span>{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);

/** Links to open the confirmed booking/order/ride in its marketplace app. */
function DeepLinks({ drafts }: { drafts: CheckoutDraft[] }) {
  const has = (m: CheckoutDraft['marketplace']) => drafts.some((d) => d.marketplace === m);
  const links: { href: string; label: string }[] = [];
  if (has('eats')) links.push({ href: MARKETPLACE_LINKS.eatsOrders, label: 'View order · OMNIA Eats' });
  if (has('stays')) links.push({ href: MARKETPLACE_LINKS.staysTrips, label: 'View trip · OMNIA Stays' });
  if (has('rides')) links.push({ href: MARKETPLACE_LINKS.ridesTrips, label: 'View ride · OMNIA Rides' });
  if (!links.length) return null;
  return (
    <div className="mt-3 grid gap-2">
      {links.map((l) => (
        <a
          key={l.href}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-full border border-white/12 py-2.5 text-sm text-white/75 transition hover:border-accent/50 hover:text-white"
          data-cursor="hover"
        >
          {l.label} <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ))}
    </div>
  );
}

/** The agent's assembled receipt — editable, with one Buy-now confirmation. */
export function CheckoutCard({ drafts }: { drafts: CheckoutDraft[] }) {
  const { checkoutState, confirmCheckout, updateCheckout, checkoutTrip } = useAgentStore();
  const signedIn = useSignedIn();
  const grand = drafts.reduce((n, d) => n + d.total, 0);
  const multi = drafts.length > 1;
  const editable = checkoutState !== 'confirming' && checkoutState !== 'done';

  const replaceDraft = (index: number, next: CheckoutDraft) => {
    updateCheckout(drafts.map((d, i) => (i === index ? next : d)));
  };

  // Show the sign-in CTA proactively when signed out — never a dead Buy-now click.
  const needsAuth = checkoutState === 'needAuth' || (!signedIn && checkoutState !== 'done');

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="ml-11 max-w-md"
    >
      <GlassCard strong glow className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-accent-soft" />
          <h3 className="font-semibold tracking-tight">{multi ? 'Your trip receipt' : 'Confirm your order'}</h3>
          {multi && <Badge tone="accent" className="ml-auto">{drafts.length} actions</Badge>}
        </div>

        <div className="space-y-3">
          {drafts.map((d, i) => (
            <DraftSection key={`${d.marketplace}-${d.refId}-${i}`} draft={d} editable={editable} onChange={(next) => replaceDraft(i, next)} />
          ))}
        </div>

        {checkoutTrip && <TripSummary trip={checkoutTrip} budget={computeLiveBudget(drafts, checkoutTrip.budget.budget)} />}

        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-sm text-white/50">Grand total</span>
          <span className="font-display text-2xl font-bold text-gradient">{formatMAD(grand)}</span>
        </div>
        <p className="mt-1.5 flex items-center justify-end gap-1 text-xs text-accent-soft/80">
          <Award className="h-3.5 w-3.5" /> {checkoutState === 'done' ? 'Earned' : 'Earns'} ~{Math.floor(grand / 10)} OMNIA Rewards points
        </p>

        <div className="mt-4">
          {checkoutState === 'done' ? (
            <>
              <div className="flex items-center justify-center gap-2 rounded-full bg-emerald-400/15 py-3 text-sm font-medium text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> {multi ? 'All confirmed' : 'Confirmed'}
              </div>
              <DeepLinks drafts={drafts} />
            </>
          ) : needsAuth ? (
            <Link to="/sign-in" className="flex w-full items-center justify-center gap-2 rounded-full border border-accent/40 py-3 text-sm font-medium text-accent-soft hover:bg-accent/10" data-cursor="hover">
              <LogIn className="h-4 w-4" /> Sign in to confirm
            </Link>
          ) : (
            <button
              onClick={confirmCheckout}
              disabled={checkoutState === 'confirming'}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#9a7b1e,#f1d98a)] py-3 text-sm font-semibold text-black transition-transform hover:scale-[1.02] disabled:opacity-60"
              data-cursor="hover"
            >
              {checkoutState === 'confirming' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {checkoutState === 'error' ? 'Retry' : `Buy now · ${formatMAD(grand)}`}
            </button>
          )}
          <p className="mt-2 text-center text-xs text-white/35">
            {checkoutState === 'done'
              ? 'Open them anytime in your marketplace apps.'
              : needsAuth
                ? 'Sign in to place this under your account.'
                : editable
                  ? "Adjust quantities, nights, or tier above — you won't be charged (demo)."
                  : "You won't be charged — this is a demo."}
          </p>
        </div>
      </GlassCard>
    </motion.div>
  );
}
