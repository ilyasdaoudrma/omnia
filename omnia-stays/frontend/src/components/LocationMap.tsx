import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cityCoords, jitter, offsetCoord } from '@/lib/geo';

interface Props {
  city: string;
  seed: string;
  className?: string;
}

/** Static neighbourhood map with a themed marker — shows roughly where a stay is. */
export function LocationMap({ city, seed, className }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const point = offsetCoord(cityCoords(city), jitter(seed, 0.02));
    const m = L.map(el.current, { zoomControl: false, attributionControl: false, scrollWheelZoom: false, dragging: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(m);
    L.circle(point, { radius: 700, color: '#2563eb', weight: 1, fillColor: '#2563eb', fillOpacity: 0.12 }).addTo(m);
    L.marker(point, { icon: pinIcon('#2563eb') }).addTo(m);
    m.setView(point, 14);
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, [city, seed]);

  return <div ref={el} className={className ?? 'h-56 w-full'} />;
}

function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<span style="display:block;width:20px;height:20px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.4)"></span>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  });
}
