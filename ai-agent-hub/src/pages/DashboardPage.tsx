import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plane, ShoppingBag, Sparkles, Wallet, MapPin, Users, Clock, LogIn, ArrowRight, Car, Navigation, Award, CalendarClock, Repeat, Trash2 } from 'lucide-react';
import { PageTransition } from '@/components/fx/PageTransition';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/fx/Reveal';
import { stagger, fadeUp } from '@/lib/motion';
import { formatMAD } from '@/lib/utils';
import { fetchMyStays, fetchMyEatsOrders, fetchMyRides, isSignedIn } from '@/lib/market';
import { fetchRecurrences, cancelRecurrence } from '@/lib/api';

const STAYS_URL = import.meta.env.VITE_STAYS_API_URL?.replace('3001', '5181') ?? 'http://localhost:5181';
const EATS_URL = import.meta.env.VITE_EATS_API_URL?.replace('3002', '5182') ?? 'http://localhost:5182';
const RIDES_URL = import.meta.env.VITE_RIDES_API_URL?.replace('3003', '5183') ?? 'http://localhost:5183';

function statusTone(s: string): 'accent' | 'success' | 'warn' {
  if (['confirmed', 'delivered', 'completed'].includes(s)) return 'success';
  if (['cancelled', 'failed'].includes(s)) return 'warn';
  return 'accent';
}

// OMNIA Rewards: 1 point per 10 MAD spent across Stays, Eats & Rides.
const TIERS = [
  { name: 'Bronze', min: 0, perk: 'Welcome aboard — every dirham earns points' },
  { name: 'Silver', min: 500, perk: 'Priority agent support' },
  { name: 'Gold', min: 1500, perk: 'Free delivery on OMNIA Eats' },
  { name: 'Platinum', min: 4000, perk: 'Complimentary airport rides' },
] as const;

function rewards(spent: number) {
  const points = Math.floor(spent / 10);
  let idx = 0;
  for (let i = 0; i < TIERS.length; i++) if (points >= TIERS[i].min) idx = i;
  const tier = TIERS[idx];
  const next = TIERS[idx + 1];
  const progress = next ? Math.min(100, Math.round(((points - tier.min) / (next.min - tier.min)) * 100)) : 100;
  return { points, tier, next, progress };
}

function AgentBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent-soft">
      <Sparkles className="h-3 w-3" /> via OMNIA Agent
    </span>
  );
}

export function DashboardPage() {
  const signedIn = isSignedIn();
  const queryClient = useQueryClient();
  const { data: stays = [], isLoading: staysLoading } = useQuery({ queryKey: ['dash-stays'], queryFn: fetchMyStays, enabled: signedIn });
  const { data: orders = [], isLoading: ordersLoading } = useQuery({ queryKey: ['dash-orders'], queryFn: fetchMyEatsOrders, enabled: signedIn });
  const { data: rides = [], isLoading: ridesLoading } = useQuery({ queryKey: ['dash-rides'], queryFn: fetchMyRides, enabled: signedIn });
  const { data: recurrences = [], isLoading: recLoading } = useQuery({ queryKey: ['dash-recurrences'], queryFn: fetchRecurrences, enabled: signedIn });

  async function handleCancelRecurrence(id: string) {
    if (await cancelRecurrence(id)) {
      void queryClient.invalidateQueries({ queryKey: ['dash-recurrences'] });
    }
  }

  const spent =
    stays.reduce((s, b) => s + (b.total ?? 0), 0) +
    orders.reduce((s, o) => s + (o.total ?? 0), 0) +
    rides.reduce((s, r) => s + (r.fare ?? 0), 0);
  const rw = rewards(spent);
  const tiles = [
    { label: 'Trips booked', value: String(stays.length), icon: Plane },
    { label: 'Food orders', value: String(orders.length), icon: ShoppingBag },
    { label: 'Rides taken', value: String(rides.length), icon: Car },
    { label: 'Total spent', value: formatMAD(spent), icon: Wallet },
  ];

  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-32">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-white/45">Welcome back</p>
              <h1 className="mt-1 font-display text-4xl font-bold tracking-tight">Your <span className="text-gradient">command center</span></h1>
              <p className="mt-2 text-white/50">A live view of everything across OMNIA Stays, Eats & Rides — including what the agent did for you.</p>
            </div>
            <Link to="/chat">
              <Button magnetic className="gap-2"><Sparkles className="h-4 w-4" /> Ask the agent</Button>
            </Link>
          </div>
        </Reveal>

        {!signedIn ? (
          <Reveal className="mt-10">
            <GlassCard className="flex flex-col items-center gap-4 p-12 text-center">
              <Sparkles className="h-8 w-8 text-accent-soft" />
              <p className="max-w-md text-white/55">Sign in to see your real bookings and orders from across OMNIA Stays & Eats. Use the same account everywhere.</p>
              <Link to="/sign-in"><Button className="gap-2"><LogIn className="h-4 w-4" /> Sign in</Button></Link>
            </GlassCard>
          </Reveal>
        ) : (
          <>
            {/* Stat tiles */}
            <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {tiles.map((t) => (
                <motion.div key={t.label} variants={fadeUp}>
                  <GlassCard className="p-5">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5"><t.icon className="h-5 w-5 text-accent-soft" strokeWidth={1.7} /></span>
                    <p className="mt-4 font-display text-3xl font-bold tracking-tight">{t.value}</p>
                    <p className="mt-1 text-sm text-white/45">{t.label}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>

            {/* OMNIA Rewards */}
            <Reveal className="mt-6">
              <GlassCard glow className="p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent/15 text-accent-soft"><Award className="h-6 w-6" /></span>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-accent-soft/80">OMNIA Rewards</p>
                      <p className="font-display text-2xl font-bold tracking-tight">{rw.tier.name} · {rw.points.toLocaleString()} pts</p>
                    </div>
                  </div>
                  <p className="max-w-xs text-sm text-white/50">{rw.tier.perk}. Earn 1 point per 10 MAD across Stays, Eats &amp; Rides.</p>
                </div>
                {rw.next ? (
                  <div className="mt-5">
                    <div className="mb-1.5 flex justify-between text-xs text-white/50">
                      <span>{rw.tier.name}</span>
                      <span>{(rw.next.min - rw.points).toLocaleString()} pts to {rw.next.name}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/8">
                      <div className="h-full rounded-full bg-[linear-gradient(90deg,#9a7b1e,#f1d98a)] transition-[width] duration-700 ease-out" style={{ width: `${rw.progress}%` }} />
                    </div>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-accent-soft">🎉 Top tier unlocked — enjoy your Platinum perks.</p>
                )}
              </GlassCard>
            </Reveal>

            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              {/* Trips (Stays) */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold tracking-tight">Trips · OMNIA Stays</h2>
                  <a href={STAYS_URL} className="text-sm text-accent-soft hover:underline" target="_blank" rel="noopener noreferrer">Open Stays →</a>
                </div>
                {staysLoading ? (
                  <GlassCard className="p-8 text-center text-white/40">Loading…</GlassCard>
                ) : stays.length === 0 ? (
                  <GlassCard className="p-8 text-center text-white/45">No trips yet. Ask the agent to book a stay.</GlassCard>
                ) : (
                  <div className="space-y-3">
                    {stays.slice(0, 5).map((b) => (
                      <GlassCard key={b.id} className="flex items-center gap-4 overflow-hidden p-3">
                        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl">{b.image && <img src={b.image} alt={b.title} className="h-full w-full object-cover" />}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold">{b.title}</h3>
                            {b.source === 'agent' && <AgentBadge />}
                          </div>
                          <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-white/50">
                            <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {b.city}</span>
                            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {b.nights}n</span>
                            <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {b.guests}</span>
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-display text-base font-bold text-gradient">{formatMAD(b.total)}</span>
                          <Badge tone={statusTone(b.status)} className="capitalize">{b.status}</Badge>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </section>

              {/* Orders (Eats) */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-semibold tracking-tight">Orders · OMNIA Eats</h2>
                  <a href={EATS_URL} className="text-sm text-accent-soft hover:underline" target="_blank" rel="noopener noreferrer">Open Eats →</a>
                </div>
                {ordersLoading ? (
                  <GlassCard className="p-8 text-center text-white/40">Loading…</GlassCard>
                ) : orders.length === 0 ? (
                  <GlassCard className="p-8 text-center text-white/45">No orders yet. Ask the agent to order food.</GlassCard>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 5).map((o) => (
                      <GlassCard key={o.id} className="flex items-center gap-4 overflow-hidden p-3">
                        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl">{o.image && <img src={o.image} alt={o.vendorName} className="h-full w-full object-cover" />}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="truncate text-sm font-semibold">{o.vendorName}</h3>
                            {o.source === 'agent' && <AgentBadge />}
                          </div>
                          <p className="mt-1 truncate text-xs text-white/50">{o.items?.map((i) => `${i.qty}× ${i.name}`).join(', ')}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-display text-base font-bold text-gradient">{formatMAD(o.total)}</span>
                          <Badge tone={statusTone(o.status)} className="capitalize">{o.status}</Badge>
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Rides */}
            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Rides · OMNIA Rides</h2>
                <a href={RIDES_URL} className="text-sm text-accent-soft hover:underline" target="_blank" rel="noopener noreferrer">Open Rides →</a>
              </div>
              {ridesLoading ? (
                <GlassCard className="p-8 text-center text-white/40">Loading…</GlassCard>
              ) : rides.length === 0 ? (
                <GlassCard className="p-8 text-center text-white/45">No rides yet. Ask the agent to book a ride.</GlassCard>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {rides.slice(0, 6).map((r) => (
                    <GlassCard key={r.id} className="flex items-center gap-4 overflow-hidden p-3">
                      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl">{r.image && <img src={r.image} alt={r.className} className="h-full w-full object-cover" />}</div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-sm font-semibold">{r.className}</h3>
                          {r.source === 'agent' && <AgentBadge />}
                        </div>
                        <p className="mt-1 flex items-center gap-1 truncate text-xs text-white/50">
                          <MapPin className="h-3 w-3 shrink-0" /> {r.pickup}
                          <Navigation className="h-3 w-3 shrink-0 text-accent-soft" /> {r.dropoff}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-display text-base font-bold text-gradient">{formatMAD(r.fare)}</span>
                        <Badge tone={statusTone(r.status)} className="capitalize">{r.status}</Badge>
                      </div>
                    </GlassCard>
                  ))}
                </div>
              )}
            </section>

            {/* Recurring tasks */}
            <section className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <CalendarClock className="h-5 w-5 text-accent-soft" /> Recurring tasks
                </h2>
                <Link to="/chat" className="text-sm text-accent-soft hover:underline">Schedule one →</Link>
              </div>
              {recLoading ? (
                <GlassCard className="p-8 text-center text-white/40">Loading…</GlassCard>
              ) : recurrences.length === 0 ? (
                <GlassCard className="p-8 text-center text-white/45">
                  Nothing scheduled yet. Ask the agent something like “order my usual every Friday” or “book my usual ride every morning”.
                </GlassCard>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {recurrences.map((r) => {
                    const RIcon = r.marketplace === 'eats' ? ShoppingBag : r.marketplace === 'rides' ? Car : r.marketplace === 'stays' ? Plane : Repeat;
                    const next = new Date(r.nextRunAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    return (
                      <GlassCard key={r.id} className="flex items-center gap-4 p-4">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent/12 text-accent-soft"><RIcon className="h-5 w-5" strokeWidth={1.7} /></span>
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-semibold">{r.label}</h3>
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-accent-soft/90"><Repeat className="h-3 w-3" /> {r.scheduleLabel}</p>
                          <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-white/45">
                            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> Next {next}</span>
                            {r.runCount > 0 && (
                              <span>Ran {r.runCount}× {r.lastStatus ? `· last ${r.lastStatus}` : ''}</span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCancelRecurrence(r.id)}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 text-white/50 transition-colors hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-200"
                          title="Cancel this recurring task"
                          data-cursor="hover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </GlassCard>
                    );
                  })}
                </div>
              )}
            </section>

            <Reveal className="mt-8">
              <Link to="/chat">
                <GlassCard glow className="flex items-center justify-between p-6 transition-transform duration-300 hover:-translate-y-0.5" data-cursor="hover">
                  <div>
                    <p className="font-semibold">Need something else?</p>
                    <p className="text-sm text-white/50">Tell the agent — it books stays and orders food across both apps in one go.</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-accent-soft" />
                </GlassCard>
              </Link>
            </Reveal>
          </>
        )}
      </div>
    </PageTransition>
  );
}
