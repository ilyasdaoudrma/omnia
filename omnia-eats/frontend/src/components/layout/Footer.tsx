import { Heart } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

export function Footer() {
  return (
    <footer className="relative z-10 mt-section border-t border-white/10 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-white/40 md:flex-row">
        <div className="flex items-center gap-2">
          <Logo />
          <span className="text-xs uppercase tracking-[0.25em] text-accent-soft">Eats</span>
        </div>
        <p>© {new Date().getFullYear()} OMNIA Eats · Order from the best kitchens in Morocco.</p>
      </div>
      <p className="mx-auto mt-6 flex max-w-6xl items-center justify-center gap-1.5 text-xs text-white/35">
        Created by <span className="text-white/60">El Asmi Ilyas Daoud</span> with
        <Heart className="h-3 w-3 fill-accent text-accent" />
      </p>
    </footer>
  );
}
