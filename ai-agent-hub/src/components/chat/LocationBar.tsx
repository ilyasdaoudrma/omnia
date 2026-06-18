import { useState } from 'react';
import { MapPin, Loader2, Crosshair, Check, X } from 'lucide-react';
import { useLocationStore } from '@/store/locationStore';
import { cn } from '@/lib/utils';

export function LocationBar() {
  const { location, status, detect, setManual } = useLocationStore();
  const [editing, setEditing] = useState(false);
  const [city, setCity] = useState('');

  const submitManual = async () => {
    if (!city.trim()) return;
    const ok = await setManual(city.trim());
    if (ok) {
      setEditing(false);
      setCity('');
    }
  };

  const locating = status === 'locating';

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 px-1 text-sm">
      {location && !editing ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/25 bg-accent/10 px-3 py-1 text-accent-soft">
          <MapPin className="h-3.5 w-3.5" />
          {location.city ?? `${location.lat.toFixed(2)}, ${location.lon.toFixed(2)}`}
        </span>
      ) : null}

      {editing ? (
        <span className="inline-flex items-center gap-1.5">
          <input
            autoFocus
            value={city}
            onChange={(e) => setCity(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitManual()}
            placeholder="Type a city…"
            className="h-8 w-40 rounded-full border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/35 focus:border-accent/40 focus:outline-none"
          />
          <button onClick={submitManual} className="grid h-8 w-8 place-items-center rounded-full bg-accent/15 text-accent-soft hover:bg-accent/25" title="Set">
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </button>
          <button onClick={() => setEditing(false)} className="grid h-8 w-8 place-items-center rounded-full text-white/40 hover:bg-white/10" title="Cancel">
            <X className="h-4 w-4" />
          </button>
        </span>
      ) : (
        <span className="inline-flex items-center gap-2">
          {!location && (
            <button
              onClick={detect}
              disabled={locating}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-white/70 transition-colors hover:border-accent/40 hover:text-white',
                locating && 'opacity-60',
              )}
              data-cursor="hover"
            >
              {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
              {locating ? 'Locating…' : 'Use my location'}
            </button>
          )}
          <button
            onClick={() => setEditing(true)}
            className="inline-flex min-h-[32px] items-center rounded-full px-2.5 py-1.5 text-xs text-white/45 underline-offset-2 hover:bg-white/5 hover:text-white hover:underline"
            data-cursor="hover"
          >
            {location ? 'Change' : 'or set a city'}
          </button>
          {status === 'denied' && !location && (
            <span className="text-xs text-amber-300/80">Location blocked — set a city instead.</span>
          )}
        </span>
      )}
    </div>
  );
}
