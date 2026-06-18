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
  return [Math.sin(h) * scale, Math.cos(h * 1.7) * scale];
}

export function offsetCoord([lat, lon]: LatLng, [dlat, dlon]: LatLng): LatLng {
  return [lat + dlat, lon + dlon];
}
