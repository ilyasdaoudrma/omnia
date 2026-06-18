import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, MapPin, CalendarDays, Users, LogIn, Luggage, Sparkles } from 'lucide-react';
import { PageTransition } from '@/components/fx/PageTransition';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { Reveal } from '@/components/fx/Reveal';
import { fetchMyBookings } from '@/lib/api';
import { formatMAD } from '@/lib/utils';
import { stagger, fadeUp } from '@/lib/motion';

const TRIP_STEPS = ['Booked', 'Confirmed', 'Check-in', 'Completed'];

/** Trip status: stage derived from the check-in date vs. now (and length of stay). */
function TripProgress({ checkIn, nights, status }: { checkIn?: string; nights: number; status: string }) {
  if (status === 'cancelled') return <p className="mt-2 text-xs font-medium text-amber-500">Booking cancelled</p>;
  let stage = 1;
  let caption = 'Confirmed';
  if (checkIn) {
    const ci = new Date(checkIn).getTime();
    const now = Date.now();
    const out = ci + nights * 86400000;
    if (now < ci) {
      const days = Math.ceil((ci - now) / 86400000);
      caption = days <= 0 ? 'Check-in today' : `Check-in in ${days} day${days > 1 ? 's' : ''}`;
      stage = 1;
    } else if (now < out) {
      caption = 'Checked in · enjoy your stay';
      stage = 2;
    } else {
      caption = 'Stay completed';
      stage = 3;
    }
  }
  return (
    <div className="mt-2.5 max-w-sm">
      <div className="flex items-center gap-1.5">
        {TRIP_STEPS.map((_, i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= stage ? 'bg-accent' : 'bg-white/10'}`} />
        ))}
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px]">
        <span className="text-white/45">Booked</span>
        <span className="font-semibold text-accent-soft">{caption}</span>
      </div>
    </div>
  );
}

export function TripsPage() {
  // React to Clerk's loaded/signed-in state so records load once the shared
  // session resolves (a one-time isSignedIn() snapshot missed late Clerk loads).
  const { isLoaded, isSignedIn } = useAuth();
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: fetchMyBookings,
    enabled: isLoaded && !!isSignedIn,
  });

  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-32">
        <Reveal>
          <Badge tone="accent" className="mb-3">My trips</Badge>
          <h1 className="font-display text-4xl font-bold tracking-tight">Your <span className="text-gradient">bookings</span></h1>
          <p className="mt-2 text-white/50">Everything you book here — or that OMNIA books for you — shows up in this list.</p>
        </Reveal>

        {!isLoaded ? (
          <div className="flex justify-center py-20 text-white/40"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !isSignedIn ? (
          <Reveal className="mt-10">
            <GlassCard className="flex flex-col items-center gap-4 p-10 text-center">
              <Luggage className="h-8 w-8 text-accent-soft" />
              <p className="max-w-sm text-white/55">Sign in to see your trips. Use the same account as the OMNIA agent so your agent-made bookings appear here too.</p>
              <Link to="/sign-in" className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#1d4ed8,#3b82f6)] px-5 py-2.5 text-sm font-semibold text-[#fff]">
                <LogIn className="h-4 w-4" /> Sign in
              </Link>
            </GlassCard>
          </Reveal>
        ) : isLoading ? (
          <div className="flex justify-center py-20 text-white/40"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : bookings.length === 0 ? (
          <Reveal className="mt-10">
            <GlassCard className="p-10 text-center text-white/50">
              No bookings yet. <Link to="/" className="text-accent-soft hover:underline">Explore stays →</Link>
            </GlassCard>
          </Reveal>
        ) : (
          <motion.div variants={stagger(0.06)} initial="hidden" animate="show" className="mt-8 space-y-4">
            {bookings.map((b) => (
              <motion.div key={b.id} variants={fadeUp}>
                <GlassCard className="flex flex-col gap-4 overflow-hidden p-3 sm:flex-row sm:items-center">
                  <div className="h-28 w-full shrink-0 overflow-hidden rounded-2xl sm:h-24 sm:w-36">
                    {b.image && <img src={b.image} alt={b.title} className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{b.title}</h3>
                      {b.source === 'agent' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent-soft">
                          <Sparkles className="h-3 w-3" /> via OMNIA Agent
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/50">
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {b.city}</span>
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {b.nights} {b.nights === 1 ? 'night' : 'nights'}</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {b.guests}</span>
                    </div>
                    <TripProgress checkIn={b.checkIn} nights={b.nights} status={b.status} />
                  </div>
                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <span className="font-display text-lg font-bold text-gradient">{formatMAD(b.total)}</span>
                    <Badge tone={b.status === 'confirmed' ? 'success' : 'warn'} className="capitalize">{b.status}</Badge>
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
