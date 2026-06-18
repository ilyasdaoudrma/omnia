import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Star, Clock, Users, ArrowUpRight } from 'lucide-react';
import type { RideClass } from '@/lib/api';
import { formatMAD } from '@/lib/utils';
import { fadeUp } from '@/lib/motion';

function MediaChip({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 text-xs font-medium text-[#fff] backdrop-blur-md ring-1 ring-white/20 ${className}`}>
      {children}
    </span>
  );
}

function Sheen() {
  return (
    <div className="pointer-events-none absolute inset-0 -translate-x-[120%] bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.28)_50%,transparent_70%)] transition-transform duration-[900ms] ease-expo group-hover:translate-x-[120%]" />
  );
}

const seatLabel = (n: number) => `${n} ${n === 1 ? 'seat' : 'seats'}`;

export function RideClassCard({ rideClass, featured = false }: { rideClass: RideClass; featured?: boolean }) {
  if (featured) return <FeaturedRideCard rideClass={rideClass} />;

  return (
    <motion.div variants={fadeUp} className="h-full">
      <Link to={`/ride/${rideClass.id}`} data-cursor="hover" className="group block h-full">
        <article className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[#fff]/95 shadow-[0_12px_36px_-20px_rgba(15,23,42,0.28)] transition-all duration-500 ease-expo will-change-transform group-hover:-translate-y-1.5 group-hover:border-accent/40 group-hover:shadow-[0_34px_72px_-34px_rgba(22,163,74,0.6)]">
          <div className="relative aspect-[4/3] overflow-hidden">
            {rideClass.image && (
              <img src={rideClass.image} alt={rideClass.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1100ms] ease-expo group-hover:scale-[1.08]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10" />
            <Sheen />

            <div className="absolute inset-x-3 top-3 flex items-start justify-between">
              {rideClass.rating != null ? (
                <MediaChip className="text-amber-300"><Star className="h-3 w-3 fill-current" /> {rideClass.rating}</MediaChip>
              ) : <span />}
              <MediaChip className="uppercase tracking-[0.12em] text-[10px]">{seatLabel(rideClass.seats)}</MediaChip>
            </div>

            <div className="absolute inset-x-3 bottom-3 flex items-end justify-between">
              <span className="rounded-2xl bg-[#fff]/95 px-3 py-1.5 text-sm font-bold text-accent-soft shadow-lg shadow-black/20 backdrop-blur">
                from {formatMAD(rideClass.estFare)}
              </span>
              <span className="grid h-9 w-9 translate-y-2 place-items-center rounded-full bg-accent text-[#fff] opacity-0 shadow-lg shadow-accent/40 transition-all duration-500 ease-expo group-hover:translate-y-0 group-hover:opacity-100">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </div>
          </div>

          <div className="flex flex-1 flex-col p-5">
            <h3 className="truncate font-display text-[17px] font-bold leading-tight tracking-tight transition-colors group-hover:text-accent-soft">{rideClass.name}</h3>
            <p className="mt-1 truncate text-sm text-white/45">{rideClass.vehicle}</p>
            <div className="mt-4 flex items-center gap-4 border-t border-[var(--color-border)] pt-3 text-xs text-white/55">
              <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-accent-soft" /> {rideClass.etaMinutes} min</span>
              <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-accent-soft" /> {rideClass.seats}</span>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}

function FeaturedRideCard({ rideClass }: { rideClass: RideClass }) {
  return (
    <motion.div variants={fadeUp} className="sm:col-span-2 lg:col-span-3">
      <Link to={`/ride/${rideClass.id}`} data-cursor="hover" className="group block">
        <article className="relative grid overflow-hidden rounded-[2rem] border border-[var(--color-border)] bg-[#fff]/95 shadow-[0_16px_46px_-22px_rgba(15,23,42,0.32)] transition-all duration-500 ease-expo group-hover:-translate-y-1 group-hover:border-accent/40 group-hover:shadow-[0_40px_88px_-38px_rgba(22,163,74,0.62)] lg:grid-cols-2">
          <div className="relative aspect-[16/10] overflow-hidden lg:aspect-auto lg:h-full lg:min-h-[24rem]">
            {rideClass.image && (
              <img src={rideClass.image} alt={rideClass.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-[1200ms] ease-expo group-hover:scale-[1.06]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
            <Sheen />
            <div className="absolute left-4 top-4 flex gap-2">
              <MediaChip className="bg-accent/90 uppercase tracking-[0.14em] text-[10px] ring-accent/40">Featured ride</MediaChip>
              {rideClass.rating != null && <MediaChip className="text-amber-300"><Star className="h-3 w-3 fill-current" /> {rideClass.rating}</MediaChip>}
            </div>
          </div>

          <div className="flex flex-col justify-center gap-4 p-7 sm:p-9">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-accent-soft">{rideClass.vehicle} · {rideClass.city}</p>
              <h3 className="mt-2 font-serif text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{rideClass.name}</h3>
            </div>

            {rideClass.description && (
              <p className="text-sm leading-relaxed text-white/55 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden">{rideClass.description}</p>
            )}

            <div className="flex flex-wrap gap-2">
              {[seatLabel(rideClass.seats), `${rideClass.etaMinutes} min away`, rideClass.vehicle].map((chip) => (
                <span key={chip} className="rounded-full border border-[var(--color-border)] bg-white/[0.04] px-3 py-1 text-xs text-white/60">{chip}</span>
              ))}
            </div>

            <div className="mt-1 flex items-center justify-between border-t border-[var(--color-border)] pt-4">
              <div>
                <span className="text-xs text-white/40">from </span>
                <span className="font-display text-2xl font-bold text-gradient">{formatMAD(rideClass.estFare)}</span>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-[#fff] shadow-lg shadow-accent/30 transition-transform duration-300 ease-expo group-hover:scale-[1.04]">
                View ride <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </div>
          </div>
        </article>
      </Link>
    </motion.div>
  );
}
