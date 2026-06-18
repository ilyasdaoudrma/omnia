import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'framer-motion';
import { Check, Loader2, Star, MapPin, Navigation, Phone } from 'lucide-react';
import { cityCoords, jitter, offsetCoord, pointAlong, type LatLng } from '@/lib/geo';
import { formatMAD } from '@/lib/utils';

const SIM_MS = 60000; // the whole simulation plays over 60s
const TRIP_MIN = 18; // …but the displayed ETA counts a realistic ~18 min down

const PHASES = [
  { key: 'assigned', label: 'Finding your driver', until: 0.08 },
  { key: 'enroute', label: 'Driver heading to you', until: 0.42 },
  { key: 'arriving', label: 'Arriving now', until: 0.5 },
  { key: 'transit', label: 'On the way to your stop', until: 0.97 },
  { key: 'done', label: 'You’ve arrived', until: 1.01 },
];

const DRIVERS = [
  { name: 'Youssef', plate: '1234-A-56', rating: 4.9 },
  { name: 'Karim', plate: '8821-B-12', rating: 4.8 },
  { name: 'Salma', plate: '4407-D-09', rating: 5.0 },
  { name: 'Mehdi', plate: '6650-C-33', rating: 4.9 },
];

interface Props {
  city: string;
  pickup: string;
  dropoff: string;
  rideId: string;
  className: string;
  vehicle: string;
  fare: number;
}

export function RideTracker({ city, pickup, dropoff, rideId, className, vehicle, fare }: Props) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const driverRef = useRef<L.Marker | null>(null);
  const [progress, setProgress] = useState(0);

  const { path, pickupPt, dropoffPt } = useMemo(() => {
    const center = cityCoords(city);
    const pickupPt = offsetCoord(center, jitter(rideId + 'p', 0.028));
    const dropoffPt = offsetCoord(center, jitter(rideId + 'd', 0.05));
    const driverStart = offsetCoord(pickupPt, jitter(rideId + 'v', 0.03));
    return { path: [driverStart, pickupPt, dropoffPt] as LatLng[], pickupPt, dropoffPt };
  }, [city, rideId]);

  const driver = useMemo(() => {
    let h = 0;
    for (let i = 0; i < rideId.length; i++) h = (h * 31 + rideId.charCodeAt(i)) | 0;
    return DRIVERS[Math.abs(h) % DRIVERS.length];
  }, [rideId]);

  // Init Leaflet map once.
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const m = L.map(mapEl.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: true,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(m);
    L.polyline([pickupPt, dropoffPt], { color: '#16a34a', weight: 4, opacity: 0.85, dashArray: '1 8', lineCap: 'round' }).addTo(m);
    L.marker(pickupPt, { icon: dotIcon('#16a34a') }).addTo(m);
    L.marker(dropoffPt, { icon: pinIcon('#0f172a') }).addTo(m);
    driverRef.current = L.marker(path[0], { icon: carIcon(), zIndexOffset: 1000 }).addTo(m);
    m.fitBounds(L.latLngBounds(path), { padding: [44, 44] });
    mapRef.current = m;
    return () => {
      m.remove();
      mapRef.current = null;
    };
  }, [path, pickupPt, dropoffPt]);

  // Drive the simulation.
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / SIM_MS);
      setProgress(t);
      driverRef.current?.setLatLng(pointAlong(path, t));
      if (t >= 1) clearInterval(id);
    }, 180);
    return () => clearInterval(id);
  }, [path]);

  const phaseIdx = PHASES.findIndex((p) => progress < p.until);
  const currentIdx = phaseIdx === -1 ? PHASES.length - 1 : phaseIdx;
  const etaMin = Math.max(0, Math.ceil((1 - progress) * TRIP_MIN));
  const done = progress >= 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] shadow-[0_18px_54px_-22px_rgba(15,23,42,0.3)]"
    >
      <div ref={mapEl} className="h-64 w-full sm:h-72" />

      <div className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/45">{done ? 'Trip complete' : `Arriving in`}</p>
            <p className="font-display text-2xl font-bold">
              {done ? 'Enjoy your stay' : <span className="text-gradient">{etaMin} min</span>}
            </p>
          </div>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent-soft">{className.replace(/ · .*/, '')}</span>
        </div>

        {/* Status steps */}
        <ol className="mt-4 space-y-2.5">
          {PHASES.slice(0, 4).map((p, i) => {
            const state = i < currentIdx ? 'done' : i === currentIdx ? 'active' : 'todo';
            return (
              <li key={p.key} className="flex items-center gap-3 text-sm">
                <span
                  className={
                    state === 'done'
                      ? 'grid h-6 w-6 place-items-center rounded-full bg-accent text-[#fff]'
                      : state === 'active'
                        ? 'grid h-6 w-6 place-items-center rounded-full bg-accent/15 text-accent-soft ring-2 ring-accent/40'
                        : 'grid h-6 w-6 place-items-center rounded-full bg-white/5 text-white/30'
                  }
                >
                  {state === 'done' ? <Check className="h-3.5 w-3.5" /> : state === 'active' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                </span>
                <span className={state === 'todo' ? 'text-white/40' : 'text-white/80'}>{p.label}</span>
              </li>
            );
          })}
        </ol>

        {/* Driver card */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/15 text-lg">🧑‍✈️</span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-semibold">
              {driver.name}
              <span className="inline-flex items-center gap-0.5 text-amber-500"><Star className="h-3 w-3 fill-current" />{driver.rating}</span>
            </p>
            <p className="truncate text-xs text-white/50">{vehicle} · {driver.plate}</p>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-full border border-white/10 text-accent-soft hover:bg-accent/10" title="Call driver" data-cursor="hover">
            <Phone className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 space-y-1 text-xs text-white/55">
          <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-accent-soft" /> {pickup}</p>
          <p className="flex items-center gap-1.5"><Navigation className="h-3.5 w-3.5 text-accent-soft" /> {dropoff}</p>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-sm">
          <span className="text-white/50">Fare</span>
          <span className="font-display text-lg font-bold text-gradient">{formatMAD(fare)}</span>
        </div>
      </div>
    </motion.div>
  );
}

function dotIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:14px;height:14px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 0 0 2px ${color}55"></span>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}
function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.4)"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 18],
  });
}
function carIcon() {
  return L.divIcon({
    className: '',
    html: `<span style="display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:#16a34a;color:#fff;box-shadow:0 6px 16px rgba(0,0,0,.35);font-size:16px">🚗</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}
