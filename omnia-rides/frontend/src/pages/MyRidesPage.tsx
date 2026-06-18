import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Clock, LogIn, Car, Sparkles, MapPin, Navigation } from 'lucide-react';
import { PageTransition } from '@/components/fx/PageTransition';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Reveal } from '@/components/fx/Reveal';
import { fetchMyRides } from '@/lib/api';
import { formatMAD } from '@/lib/utils';
import { stagger, fadeUp } from '@/lib/motion';

const tone = (s: string) => (['completed', 'confirmed'].includes(s) ? 'success' : ['cancelled', 'failed'].includes(s) ? 'warn' : 'accent');

export function MyRidesPage() {
  // React to Clerk's loaded/signed-in state so rides load once the shared
  // session resolves (a one-time isSignedIn() snapshot missed late Clerk loads).
  const { isLoaded, isSignedIn } = useAuth();
  const { data: rides = [], isLoading } = useQuery({ queryKey: ['my-rides'], queryFn: fetchMyRides, enabled: isLoaded && !!isSignedIn });

  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-32">
        <Reveal>
          <Badge tone="accent" className="mb-3">My rides</Badge>
          <h1 className="font-display text-4xl font-bold tracking-tight">Your <span className="text-gradient">rides</span></h1>
          <p className="mt-2 text-white/50">Every ride you book here — or that OMNIA books for you — appears in this list.</p>
        </Reveal>

        {!isLoaded ? (
          <div className="flex justify-center py-20 text-white/40"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !isSignedIn ? (
          <Reveal className="mt-10">
            <GlassCard className="flex flex-col items-center gap-4 p-10 text-center">
              <Car className="h-8 w-8 text-accent-soft" />
              <p className="max-w-sm text-white/55">Sign in to see your rides. Use the same account as the OMNIA agent so your agent-booked rides appear here too.</p>
              <Link to="/sign-in" className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#15803d,#22c55e)] px-5 py-2.5 text-sm font-semibold text-[#fff]">
                <LogIn className="h-4 w-4" /> Sign in
              </Link>
            </GlassCard>
          </Reveal>
        ) : isLoading ? (
          <div className="flex justify-center py-20 text-white/40"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : rides.length === 0 ? (
          <Reveal className="mt-10">
            <GlassCard className="p-10 text-center text-white/50">No rides yet. <Link to="/" className="text-accent-soft hover:underline">Book a ride →</Link></GlassCard>
          </Reveal>
        ) : (
          <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="mt-8 space-y-4">
            {rides.map((r) => (
              <motion.div key={r.id} variants={fadeUp}>
                <GlassCard className="flex flex-col gap-4 overflow-hidden p-3 sm:flex-row sm:items-center">
                  <div className="h-24 w-full shrink-0 overflow-hidden rounded-2xl sm:w-32">
                    {r.image && <img src={r.image} alt={r.className} className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{r.className}</h3>
                      {r.source === 'agent' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent-soft">
                          <Sparkles className="h-3 w-3" /> via OMNIA Agent
                        </span>
                      )}
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-white/50">
                      <MapPin className="h-3.5 w-3.5 shrink-0" /> {r.pickup}
                      <Navigation className="h-3.5 w-3.5 shrink-0 text-accent-soft" /> {r.dropoff}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-white/40">
                      <Clock className="h-3 w-3" /> {new Date(r.createdAt).toLocaleString()} · {r.distanceKm} km · {r.vehicle}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <span className="font-display text-lg font-bold text-gradient">{formatMAD(r.fare)}</span>
                    <Badge tone={tone(r.status)} className="capitalize">{r.status}</Badge>
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
