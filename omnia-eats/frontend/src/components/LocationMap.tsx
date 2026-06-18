import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { cityCoords, jitter, offsetCoord } from '@/lib/geo';

interface Props {
  city: string;
  seed: string;
  className?: string;
}

/** Map of a vendor with its delivery-radius — themed orange for OMNIA Eats. */
export function LocationMap({ city, seed, className }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!el.current || map.current) return;
    const point = offsetCoord(cityCoords(city), jitter(seed, 0.02));
    const m = L.map(el.current, { zoomControl: false, attributionControl: false, scrollWheelZoom: false, dragging: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(m);
    L.circle(point, { radius: 1400, color: '#ea580c', weight: 1, fillColor: '#ea580c', fillOpacity: 0.1 }).addTo(m);
    L.marker(point, { icon: pinIcon('#ea580c') }).addTo(m);
    m.setView(point, 13);
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
    html: `<span style="display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:${color};color:#fff;border:2px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.35);font-size:14px">🍽️</span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}
