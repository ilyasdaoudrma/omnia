export type LatLng = [number, number];

/** Approx city-centre coordinates for the 6 OMNIA cities. */
export const CITY_COORDS: Record<string, LatLng> = {
  Rabat: [34.0209, -6.8416],
  Casablanca: [33.5731, -7.5898],
  Oujda: [34.6814, -1.9086],
  Tanger: [35.7595, -5.834],
  Marrakech: [31.6295, -7.9811],
  Agadir: [30.4278, -9.5981],
};

export function cityCoords(city?: string): LatLng {
  return (city && CITY_COORDS[city]) || CITY_COORDS.Rabat;
}

/** Deterministic small offset (degrees) from a seed string — stable per id. */
export function jitter(seed: string, scale = 0.04): LatLng {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const a = Math.sin(h) * scale;
  const b = Math.cos(h * 1.7) * scale;
  return [a, b];
}

export function offsetCoord([lat, lon]: LatLng, [dlat, dlon]: LatLng): LatLng {
  return [lat + dlat, lon + dlon];
}

export function lerp(a: LatLng, b: LatLng, t: number): LatLng {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Position along a multi-point path by progress t (0..1), evenly across segments. */
export function pointAlong(path: LatLng[], t: number): LatLng {
  if (path.length < 2) return path[0];
  const clamped = Math.max(0, Math.min(1, t));
  const seg = clamped * (path.length - 1);
  const i = Math.min(path.length - 2, Math.floor(seg));
  return lerp(path[i], path[i + 1], seg - i);
}
