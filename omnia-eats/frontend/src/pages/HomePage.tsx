import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft } from 'lucide-react';
import { PageTransition } from '@/components/fx/PageTransition';
import { Reveal } from '@/components/fx/Reveal';
import { EatsHero } from '@/components/EatsHero';
import { CityCarousel } from '@/components/CityCarousel';
import { VendorCard } from '@/components/VendorCard';
import { fetchVendors } from '@/lib/api';
import { stagger } from '@/lib/motion';

export const CITIES = ['Rabat', 'Casablanca', 'Oujda', 'Tanger', 'Marrakech', 'Agadir'];

export function HomePage() {
  const [city, setCity] = useState<string | null>(null);

  return (
    <PageTransition>
      <EatsHero />
      <div id="cities" className="scroll-mt-0">
        {city ? (
          <div className="pt-16">
            <CityVendors city={city} onBack={() => setCity(null)} />
          </div>
        ) : (
          <CityCarousel onPick={setCity} />
        )}
      </div>
    </PageTransition>
  );
}

function CityVendors({ city, onBack }: { city: string; onBack: () => void }) {
  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors', city],
    queryFn: () => fetchVendors({ city }),
  });

  return (
    <section className="px-6 pb-section">
      <Reveal className="mx-auto mb-6 flex max-w-6xl items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white/65 transition-colors hover:border-accent/40 hover:text-white" data-cursor="hover">
            <ArrowLeft className="h-4 w-4" /> All cities
          </button>
          <h2 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
            Kitchens in {city}
            <span className="ml-2 align-middle text-sm font-normal text-white/40">{vendors.length} vendors</span>
          </h2>
        </div>
      </Reveal>

      {isLoading ? (
        <div className="flex justify-center py-20 text-white/40"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : vendors.length === 0 ? (
        <p className="py-20 text-center text-white/40">No vendors found. Is the backend running on :3002?</p>
      ) : (
        <motion.div variants={stagger(0.05)} initial="hidden" animate="show" className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {vendors.map((v, i) => (
            <VendorCard key={v.id} vendor={v} featured={i === 0 && vendors.length > 2} />
          ))}
        </motion.div>
      )}
    </section>
  );
}
