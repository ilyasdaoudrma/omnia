import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Star, Clock, Users, MapPin, Navigation, LogIn, Car } from 'lucide-react';
import { PageTransition } from '@/components/fx/PageTransition';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { RideTracker } from '@/components/RideTracker';
import { Reviews } from '@/components/Reviews';
import { fetchRideClass, createTrip, quoteFare, type Ride } from '@/lib/api';
import { formatMAD } from '@/lib/utils';

type BookState = 'idle' | 'booking' | 'done' | 'needAuth' | 'error';

export function RidePage() {
  const { id = '' } = useParams();
  const { data: rc, isLoading } = useQuery({ queryKey: ['ride', id], queryFn: () => fetchRideClass(id), enabled: !!id });

  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [distanceKm, setDistanceKm] = useState(8);
  const [state, setState] = useState<BookState>('idle');
  const [ride, setRide] = useState<Ride | null>(null);

  const minutes = Math.max(5, Math.round(distanceKm * 2.2));
  const fare = rc ? quoteFare(rc, distanceKm, minutes) : 0;

  const book = async () => {
    if (!rc) return;
    setState('booking');
    const res = await createTrip({ rideClassId: rc.id, pickup, dropoff, distanceKm });
    if (res.needAuth) return setState('needAuth');
    if (!res.ok) return setState('error');
    setRide(res.ride ?? null);
    setState('done');
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex justify-center pt-48 text-white/40"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </PageTransition>
    );
  }
  if (!rc) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-2xl px-6 pt-40 text-center text-white/50">
          Ride not found. <Link to="/" className="text-accent-soft hover:underline">Back to rides →</Link>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="mx-auto max-w-4xl px-6 pb-24 pt-28">
        <div className="group relative h-56 overflow-hidden rounded-[1.75rem] sm:h-72">
          {rc.image && <img src={rc.image} alt={rc.name} className="h-full w-full object-cover transition-transform duration-[1200ms] ease-expo group-hover:scale-[1.05]" />}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/30 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5">
            <Badge tone="accent" className="mb-2">{rc.city}</Badge>
            <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">{rc.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-white/70">
              <span className="inline-flex items-center gap-1"><Car className="h-4 w-4" /> {rc.vehicle}</span>
              <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {rc.seats} seats</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" /> {rc.etaMinutes} min away</span>
              {rc.rating != null && <span className="inline-flex items-center gap-1 text-amber-300"><Star className="h-4 w-4 fill-current" /> {rc.rating}</span>}
            </div>
          </div>
        </div>

        {state === 'done' ? (
          <div className="mx-auto mt-6 max-w-md">
            <RideTracker
              city={rc.city}
              pickup={pickup || 'Current location'}
              dropoff={dropoff || `${rc.city} centre`}
              rideId={ride?.id ?? rc.id}
              className={rc.name}
              vehicle={rc.vehicle}
              fare={ride?.fare ?? fare}
            />
            <Link to="/trips" className="mt-4 block text-center text-sm text-accent-soft hover:underline">View all my rides →</Link>
          </div>
        ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-white/55">{rc.description}</p>

            <div className="mt-6 space-y-4">
              <Field icon={<MapPin className="h-4 w-4 text-accent-soft" />} label="Pickup">
                <input
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  placeholder="Current location"
                  className="w-full bg-transparent text-[15px] text-white placeholder:text-white/35 focus:outline-none"
                />
              </Field>
              <Field icon={<Navigation className="h-4 w-4 text-accent-soft" />} label="Drop-off">
                <input
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  placeholder={`${rc.city} centre`}
                  className="w-full bg-transparent text-[15px] text-white placeholder:text-white/35 focus:outline-none"
                />
              </Field>

              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between text-sm text-white/60">
                  <span>Estimated distance</span>
                  <span className="font-semibold text-white">{distanceKm} km · ~{minutes} min</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  value={distanceKm}
                  onChange={(e) => setDistanceKm(Number(e.target.value))}
                  className="mt-3 w-full accent-[#16a34a]"
                />
              </div>
            </div>

            <div className="mt-10">
              <Reviews rideClassId={rc.id} />
            </div>
          </div>

          <div className="lg:sticky lg:top-28 lg:self-start">
            <GlassCard strong glow className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/55">Fare estimate</span>
                <span className="font-display text-3xl font-bold text-gradient">{formatMAD(fare)}</span>
              </div>
              <p className="mt-1 text-xs text-white/40">{formatMAD(rc.baseFare)} base + {rc.perKm} MAD/km + time</p>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
                <span className="inline-flex items-center gap-1.5"><Star className="h-3.5 w-3.5 text-accent-soft" /> Free cancellation</span>
                <span className="inline-flex items-center gap-1.5"><Car className="h-3.5 w-3.5 text-accent-soft" /> Pay in car</span>
              </div>

              <div className="mt-5">
                {state === 'needAuth' ? (
                  <Link to="/sign-in" className="flex w-full items-center justify-center gap-2 rounded-full border border-accent/40 py-3 text-sm font-medium text-accent-soft hover:bg-accent/10">
                    <LogIn className="h-4 w-4" /> Sign in to book
                  </Link>
                ) : (
                  <button
                    onClick={book}
                    disabled={state === 'booking'}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#15803d,#22c55e)] py-3 text-sm font-semibold text-[#fff] transition-transform hover:scale-[1.02] disabled:opacity-60"
                    data-cursor="hover"
                  >
                    {state === 'booking' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Car className="h-4 w-4" />}
                    {state === 'error' ? 'Retry' : `Book ride · ${formatMAD(fare)}`}
                  </button>
                )}
                <p className="mt-2 text-center text-xs text-white/35">You won't be charged — this is a demo.</p>
              </div>
            </GlassCard>
          </div>
        </div>
        )}
      </div>
    </PageTransition>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/40">
        {icon} {label}
      </div>
      {children}
    </div>
  );
}
