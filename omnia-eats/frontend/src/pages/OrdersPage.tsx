import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Clock, LogIn, ShoppingBag, Sparkles } from 'lucide-react';
import { PageTransition } from '@/components/fx/PageTransition';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Reveal } from '@/components/fx/Reveal';
import { fetchMyOrders } from '@/lib/api';
import { formatMAD } from '@/lib/utils';
import { stagger, fadeUp } from '@/lib/motion';

const tone = (s: string) => (['delivered', 'confirmed'].includes(s) ? 'success' : ['cancelled', 'failed'].includes(s) ? 'warn' : 'accent');

const STEPS = ['Preparing', 'On the way', 'Delivered'];

/** Live-ish delivery progress: stage derived from how long ago the order was placed. */
function OrderProgress({ createdAt, status }: { createdAt: string; status: string }) {
  if (status === 'cancelled') return <p className="mt-2 text-xs font-medium text-amber-500">Order cancelled</p>;
  const mins = (Date.now() - new Date(createdAt).getTime()) / 60000;
  const stage = status === 'delivered' ? 2 : mins < 3 ? 0 : mins < 9 ? 1 : 2;
  return (
    <div className="mt-2.5 max-w-xs">
      <div className="flex items-center gap-1.5">
        {STEPS.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= stage ? 'bg-accent' : 'bg-white/10'}`} />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px]">
        {STEPS.map((s, i) => (
          <span key={s} className={i === stage ? 'font-semibold text-accent-soft' : i < stage ? 'text-white/55' : 'text-white/35'}>{s}</span>
        ))}
      </div>
    </div>
  );
}

export function OrdersPage() {
  // React to Clerk's loaded/signed-in state so orders load once the shared
  // session resolves (a one-time isSignedIn() snapshot missed late Clerk loads).
  const { isLoaded, isSignedIn } = useAuth();
  const { data: orders = [], isLoading } = useQuery({ queryKey: ['my-orders'], queryFn: fetchMyOrders, enabled: isLoaded && !!isSignedIn });

  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-32">
        <Reveal>
          <Badge tone="accent" className="mb-3">My orders</Badge>
          <h1 className="font-display text-4xl font-bold tracking-tight">Your <span className="text-gradient">orders</span></h1>
          <p className="mt-2 text-white/50">Everything you order here — or that OMNIA orders for you — appears in this list.</p>
        </Reveal>

        {!isLoaded ? (
          <div className="flex justify-center py-20 text-white/40"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !isSignedIn ? (
          <Reveal className="mt-10">
            <GlassCard className="flex flex-col items-center gap-4 p-10 text-center">
              <ShoppingBag className="h-8 w-8 text-accent-soft" />
              <p className="max-w-sm text-white/55">Sign in to see your orders. Use the same account as the OMNIA agent so your agent-made orders appear here too.</p>
              <Link to="/sign-in" className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#c2410c,#f97316)] px-5 py-2.5 text-sm font-semibold text-[#fff]">
                <LogIn className="h-4 w-4" /> Sign in
              </Link>
            </GlassCard>
          </Reveal>
        ) : isLoading ? (
          <div className="flex justify-center py-20 text-white/40"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : orders.length === 0 ? (
          <Reveal className="mt-10">
            <GlassCard className="p-10 text-center text-white/50">No orders yet. <Link to="/" className="text-accent-soft hover:underline">Browse kitchens →</Link></GlassCard>
          </Reveal>
        ) : (
          <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="mt-8 space-y-4">
            {orders.map((o) => (
              <motion.div key={o.id} variants={fadeUp}>
                <GlassCard className="flex flex-col gap-4 overflow-hidden p-3 sm:flex-row sm:items-center">
                  <div className="h-24 w-full shrink-0 overflow-hidden rounded-2xl sm:w-32">
                    {o.image && <img src={o.image} alt={o.vendorName} className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{o.vendorName}</h3>
                      {o.source === 'agent' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent-soft">
                          <Sparkles className="h-3 w-3" /> via OMNIA Agent
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-white/50">{o.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-white/40"><Clock className="h-3 w-3" /> {new Date(o.createdAt).toLocaleString()}</p>
                    <OrderProgress createdAt={o.createdAt} status={o.status} />
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <span className="font-display text-lg font-bold text-gradient">{formatMAD(o.total)}</span>
                    <Badge tone={tone(o.status)} className="capitalize">{o.status}</Badge>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </PageTransition>
  );
}
