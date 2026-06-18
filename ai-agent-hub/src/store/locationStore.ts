import { create } from 'zustand';
import type { UserLocation } from '@/lib/ai/types';

type LocationStatus = 'idle' | 'locating' | 'granted' | 'denied' | 'error';

interface LocationState {
  location: UserLocation | null;
  status: LocationStatus;
  detect: () => Promise<void>;
  setManual: (city: string) => Promise<boolean>;
  clear: () => void;
}

const STORAGE_KEY = 'omnia.location';

function persist(loc: UserLocation | null) {
  try {
    if (loc) localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function loadPersisted(): UserLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UserLocation) : null;
  } catch {
    return null;
  }
}

/** Reverse-geocode coordinates to a city name (free, keyless). */
async function reverseGeocode(lat: number, lon: number): Promise<{ city?: string; country?: string }> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
    );
    if (!res.ok) return {};
    const d = (await res.json()) as { city?: string; locality?: string; countryName?: string };
    return { city: d.city || d.locality, country: d.countryName };
  } catch {
    return {};
  }
}

/** Forward-geocode a typed city name to coordinates (OpenStreetMap Nominatim). */
async function forwardGeocode(query: string): Promise<UserLocation | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
      { headers: { Accept: 'application/json' } },
    );
    if (!res.ok) return null;
    const list = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!list.length) return null;
    const top = list[0];
    return {
      lat: parseFloat(top.lat),
      lon: parseFloat(top.lon),
      city: top.display_name.split(',')[0]?.trim(),
      country: top.display_name.split(',').pop()?.trim(),
    };
  } catch {
    return null;
  }
}

export const useLocationStore = create<LocationState>((set) => ({
  location: loadPersisted(),
  status: loadPersisted() ? 'granted' : 'idle',

  async detect() {
    if (!('geolocation' in navigator)) {
      set({ status: 'error' });
      return;
    }
    set({ status: 'locating' });
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const place = await reverseGeocode(latitude, longitude);
          const loc: UserLocation = { lat: latitude, lon: longitude, ...place };
          persist(loc);
          set({ location: loc, status: 'granted' });
          resolve();
        },
        () => {
          set({ status: 'denied' });
          resolve();
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
      );
    });
  },

  async setManual(city: string) {
    set({ status: 'locating' });
    const loc = await forwardGeocode(city);
    if (loc) {
      persist(loc);
      set({ location: loc, status: 'granted' });
      return true;
    }
    set({ status: 'error' });
    return false;
  },

  clear() {
    persist(null);
    set({ location: null, status: 'idle' });
  },
}));
