import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft } from 'lucide-react';
import { PageTransition } from '@/components/fx/PageTransition';
import { Reveal } from '@/components/fx/Reveal';
import { RidesHero } from '@/components/RidesHero';
import { CityCarousel } from '@/components/CityCarousel';
import { RideClassCard } from '@/components/RideClassCard';
import { fetchRideClasses } from '@/lib/api';
import { stagger } from '@/lib/motion';

export const CITIES = ['Rabat', 'Casablanca', 'Oujda', 'Tanger', 'Marrakech', 'Agadir'];

export function HomePage() {
  const [city, setCity] = useState<string | null>(null);

  return (
    <PageTransition>
      <RidesHero />
      <div id="cities" className="scroll-mt-0">
        {city ? (
          <div className="pt-16">
            <CityRides city={city} onBack={() => setCity(null)} />
          </div>
        ) : (
          <CityCarousel onPick={setCity} />
        )}
      </div>
    </PageTransition>
  );
}

function CityRides({ city, onBack }: { city: string; onBack: () => void }) {
  const { data: rideClasses = [], isLoading } = useQuery({
    queryKey: ['rides', city],
    queryFn: () => fetchRideClasses({ city }),
  });

  return (
    <section className="px-6 pb-section">
      <Reveal className="mx-auto mb-6 flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/65 transition-colors hover:border-accent/40 hover:text-white" data-cursor="hover">
            <ArrowLeft className="h-4 w-4" /> All cities
          </button>
          <h2 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
            Rides in {city}
            <span className="ml-2 align-middle text-sm font-normal text-white/40">{rideClasses.length} options</span>
          </h2>
        </div>
      </Reveal>

      {isLoading ? (
        <div className="flex justify-center py-20 text-white/40"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : rideClasses.length === 0 ? (
        <p className="py-20 text-center text-white/40">No rides found. Is the backend running on :3003?</p>
      ) : (
        <motion.div variants={stagger(0.05)} initial="hidden" animate="show" className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rideClasses.map((rc, i) => (
            <RideClassCard key={rc.id} rideClass={rc} featured={i === 0 && rideClasses.length > 2} />
          ))}
        </motion.div>
      )}
    </section>
  );
}
