import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Star, Users, BedDouble, Bath, MapPin, Check, Loader2, CheckCircle2, LogIn, ArrowLeft, Minus, Plus, CalendarDays } from 'lucide-react';
import { PageTransition } from '@/components/fx/PageTransition';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { LocationMap } from '@/components/LocationMap';
import { Reviews } from '@/components/Reviews';
import { fetchListing, createBooking } from '@/lib/api';
import { formatMAD } from '@/lib/utils';

type BookState = 'idle' | 'loading' | 'done' | 'needAuth' | 'error';

/** Labeled +/- stepper for nights & guests. */
function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="mb-2 text-xs uppercase tracking-wide text-white/45">{label}</p>
      <div className="flex items-center justify-between">
        <button onClick={dec} disabled={value <= min} className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-accent/50 hover:text-white disabled:opacity-30" data-cursor="hover">
          <Minus className="h-4 w-4" />
        </button>
        <span className="font-display text-lg font-bold">{value}</span>
        <button onClick={inc} disabled={value >= max} className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-accent/50 hover:text-white disabled:opacity-30" data-cursor="hover">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ListingPage() {
  const { id } = useParams<{ id: string }>();
  const { data: listing, isLoading } = useQuery({ queryKey: ['listing', id], queryFn: () => fetchListing(id!), enabled: !!id });

  const [nights, setNights] = useState(2);
  const [guests, setGuests] = useState(2);
  const [checkIn, setCheckIn] = useState('');
  const [state, setState] = useState<BookState>('idle');

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-white/40"><Loader2 className="h-6 w-6 animate-spin" /></div>
    );
  }
  if (!listing) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-white/50">
        <p>Listing not found.</p>
        <Link to="/" className="text-accent-soft hover:underline">← Back to stays</Link>
      </div>
    );
  }

  const total = listing.pricePerNight * nights;

  const book = async () => {
    setState('loading');
    const res = await createBooking({ listingId: listing.id, nights, guests, checkIn: checkIn || undefined });
    setState(res.needAuth ? 'needAuth' : res.ok ? 'done' : 'error');
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-28">
        <Link to="/" className="mb-5 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white" data-cursor="hover">
          <ArrowLeft className="h-4 w-4" /> All stays
        </Link>

        {/* Gallery */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="grid gap-3 sm:grid-cols-[2fr_1fr]">
          <div className="group relative h-72 overflow-hidden rounded-[1.75rem] sm:h-[28rem]">
            <img src={listing.images[0]} alt={listing.title} className="h-full w-full object-cover transition-transform duration-[1200ms] ease-expo group-hover:scale-[1.04]" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
            {listing.rating != null && (
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 text-xs font-medium text-[#fff] ring-1 ring-white/20 backdrop-blur-md">
                <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" /> {listing.rating} · {listing.reviews} reviews
              </span>
            )}
            <span className="absolute bottom-4 right-4 rounded-full bg-black/45 px-3 py-1.5 text-xs font-medium text-[#fff] ring-1 ring-white/20 backdrop-blur-md">
              {listing.images.length} photos
            </span>
          </div>
          <div className="grid grid-rows-2 gap-3">
            {listing.images.slice(1, 3).map((im, i) => (
              <div key={i} className="group relative hidden overflow-hidden rounded-[1.75rem] sm:block">
                <img src={im} alt="" className="h-full w-full object-cover transition-transform duration-[1200ms] ease-expo group-hover:scale-[1.06]" />
              </div>
            ))}
          </div>
        </motion.div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* Details */}
          <div>
            <Badge tone="accent" className="mb-3">{listing.type}</Badge>
            <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">{listing.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-white/55">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-accent-soft" /> {listing.neighborhood ? `${listing.neighborhood}, ` : ''}{listing.city}</span>
              {listing.rating != null && <span className="inline-flex items-center gap-1.5 text-amber-300"><Star className="h-4 w-4 fill-current" /> {listing.rating} · {listing.reviews} reviews</span>}
            </div>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-y border-white/10 py-4 text-sm text-white/70">
              <span className="inline-flex items-center gap-2"><Users className="h-4 w-4 text-accent-soft" /> {listing.maxGuests} guests</span>
              <span className="inline-flex items-center gap-2"><BedDouble className="h-4 w-4 text-accent-soft" /> {listing.bedrooms} bedrooms · {listing.beds} beds</span>
              <span className="inline-flex items-center gap-2"><Bath className="h-4 w-4 text-accent-soft" /> {listing.baths} baths</span>
            </div>

            {listing.description && <p className="mt-6 leading-relaxed text-white/60">{listing.description}</p>}
            <p className="mt-4 text-sm text-white/45">Hosted by {listing.host}</p>

            <h3 className="mt-8 text-lg font-semibold">What this place offers</h3>
            <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {listing.amenities.map((a) => (
                <li key={a} className="inline-flex items-center gap-2 text-sm text-white/65">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-accent/15"><Check className="h-3 w-3 text-accent-soft" /></span>
                  {a}
                </li>
              ))}
            </ul>

            <h3 className="mt-8 text-lg font-semibold">Where you'll be</h3>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-white/45">
              <MapPin className="h-3.5 w-3.5 text-accent-soft" /> {listing.neighborhood ? `${listing.neighborhood}, ` : ''}{listing.city}
            </p>
            <div className="mt-3 overflow-hidden rounded-3xl border border-white/10">
              <LocationMap city={listing.city} seed={listing.id} className="h-64 w-full" />
            </div>

            <div className="mt-10">
              <Reviews listingId={listing.id} />
            </div>
          </div>

          {/* Booking panel */}
          <div>
            <GlassCard strong glow className="sticky top-28 p-6">
              <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-3xl font-bold text-gradient">{formatMAD(listing.pricePerNight)}</span>
                  <span className="text-sm text-white/45">/ night</span>
                </div>
                {listing.rating != null && (
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-white/70">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {listing.rating}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
                <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent-soft" /> Free cancellation</span>
                <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent-soft" /> Instant book</span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Stepper label="Nights" value={nights} min={1} max={60} onChange={setNights} />
                <Stepper label="Guests" value={guests} min={1} max={listing.maxGuests} onChange={setGuests} />
              </div>

              <label className="mt-3 block rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
                <span className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-wide text-white/45">
                  <CalendarDays className="h-3.5 w-3.5" /> Check-in
                </span>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full bg-transparent text-white [color-scheme:dark] focus:outline-none"
                />
              </label>

              <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-sm text-white/60">
                <div className="flex justify-between"><span>{formatMAD(listing.pricePerNight)} × {nights} nights</span><span>{formatMAD(total)}</span></div>
                <div className="flex justify-between font-semibold text-white"><span>Total</span><span className="text-gradient">{formatMAD(total)}</span></div>
              </div>

              <div className="mt-5">
                {state === 'done' ? (
                  <div className="rounded-2xl bg-emerald-400/15 px-4 py-3 text-center text-sm text-emerald-300">
                    <CheckCircle2 className="mx-auto mb-1 h-5 w-5" />
                    Booked! See it in <Link to="/trips" className="underline">My trips</Link>.
                  </div>
                ) : state === 'needAuth' ? (
                  <Link to="/sign-in" className="flex w-full items-center justify-center gap-2 rounded-full border border-accent/40 px-5 py-3 text-sm font-medium text-accent-soft hover:bg-accent/10">
                    <LogIn className="h-4 w-4" /> Sign in to book
                  </Link>
                ) : (
                  <button
                    onClick={book}
                    disabled={state === 'loading'}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#1d4ed8,#3b82f6)] px-5 py-3 text-sm font-semibold text-[#fff] transition-transform hover:scale-[1.02] disabled:opacity-60"
                    data-cursor="hover"
                  >
                    {state === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {state === 'error' ? 'Retry booking' : 'Book now'}
                  </button>
                )}
                <p className="mt-2 text-center text-xs text-white/35">You won't be charged — this is a demo marketplace.</p>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
