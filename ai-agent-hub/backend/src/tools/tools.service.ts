import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import type { Recommendation, ToolId, ToolResult, UserLocation } from '../ai/agent.types';

export interface ToolDescriptor {
  id: ToolId;
  name: string;
  description: string;
}

export const TOOLS: Record<ToolId, ToolDescriptor> = {
  travel: { id: 'travel', name: 'OMNIA Stays', description: 'Search and book real stays from OMNIA Stays.' },
  maps: { id: 'maps', name: 'Maps', description: 'Resolve your location, distances, and travel times.' },
  restaurant: { id: 'restaurant', name: 'OMNIA Eats', description: 'Browse and order real food from OMNIA Eats.' },
  shopping: { id: 'shopping', name: 'Shopping', description: 'Find real nearby shops (OpenStreetMap).' },
  calendar: { id: 'calendar', name: 'Calendar', description: 'Schedule management and time-blocking.' },
  notification: { id: 'notification', name: 'Notifications', description: 'Alerts, reminders, and status updates.' },
};

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const img = (seed: string) => `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=600&q=70`;

// Resolve a supported city named in the prompt (so "dinner in Rabat" queries Rabat
// even when the browser location is unset or a different city). Mirrors the
// builder's alias list for the 6 served cities.
const CITY_FROM_PROMPT: { re: RegExp; city: string }[] = [
  { re: /\b(casa\s?blanca|casablanca|casa)\b/i, city: 'Casablanca' },
  { re: /\b(rabat|rbat)\b/i, city: 'Rabat' },
  { re: /\b(marrakech|marrakesh|marakech|marakesh|marrakch)\b/i, city: 'Marrakech' },
  { re: /\b(tanger|tangier|tanja)\b/i, city: 'Tanger' },
  { re: /\b(oujda|oudjda|wajda)\b/i, city: 'Oujda' },
  { re: /\b(agadir|agadeer)\b/i, city: 'Agadir' },
];
function cityFromPrompt(text: string): string | undefined {
  for (const { re, city } of CITY_FROM_PROMPT) if (re.test(text)) return city;
  return undefined;
}

interface OverpassEl {
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

export interface StayListing {
  id: string;
  title: string;
  city: string;
  neighborhood?: string;
  pricePerNight: number;
  maxGuests: number;
  bedrooms: number;
  rating?: number;
  amenities: string[];
  images: string[];
}

export interface MenuItem { id: string; name: string; price: number; image?: string | null; category?: string }
export interface FoodVendor {
  id: string;
  name: string;
  city: string;
  cuisine?: string;
  rating?: number;
  deliveryFee: number;
  etaMinutes: number;
  image?: string;
  items: MenuItem[];
}

export interface RideClass {
  id: string;
  city: string;
  name: string;
  vehicle: string;
  baseFare: number;
  perKm: number;
  perMin: number;
  etaMinutes: number;
  seats: number;
  rating?: number;
  image?: string;
  description?: string;
  estFare: number;
  sampleKm: number;
  sampleMin: number;
}

/** A marketplace fetch outcome: reachable (items, possibly empty) vs unreachable. */
export type MarketResult<T> = { ok: true; items: T[] } | { ok: false; unreachable: true };

/**
 * Bridges the agent to OMNIA's separate marketplaces:
 *   - travel      → OMNIA Stays API   (real listings, bookable)
 *   - restaurant  → OMNIA Eats API    (real vendors, orderable)
 *   - shopping    → OpenStreetMap      (real nearby shops)
 * Recommendations carry refId + marketplace so the UI can place a real
 * booking/order in the corresponding app's database (under the shared account).
 */
@Injectable()
export class ToolsService {
  private readonly logger = new Logger(ToolsService.name);
  private readonly staysApi: string;
  private readonly eatsApi: string;
  private readonly ridesApi: string;

  constructor(config: ConfigService) {
    this.staysApi = config.get<string>('STAYS_API_URL') ?? 'http://localhost:3001';
    this.eatsApi = config.get<string>('EATS_API_URL') ?? 'http://localhost:3002';
    this.ridesApi = config.get<string>('RIDES_API_URL') ?? 'http://localhost:3003';
  }

  list(): ToolDescriptor[] {
    return Object.values(TOOLS);
  }

  /**
   * Result of a marketplace fetch — distinguishes a reachable-but-empty catalog
   * (`ok` with items: []) from an unreachable marketplace (`unreachable`), so the
   * agent can say "OMNIA Eats is unreachable" instead of "no results".
   */
  // (see MarketResult<T> below)

  /** OMNIA Eats vendors as a typed result (reachable-empty vs unreachable). */
  async getEatsVendorsResult(city?: string): Promise<MarketResult<FoodVendor>> {
    const q = new URLSearchParams();
    if (city) q.set('city', city);
    return this.safeResult<FoodVendor>(`${this.eatsApi}/vendors?${q}`, 'Eats');
  }

  /** OMNIA Stays listings as a typed result. */
  async getStaysResult(city?: string, maxPrice?: number, guests?: number): Promise<MarketResult<StayListing>> {
    const q = new URLSearchParams();
    if (city) q.set('city', city);
    if (maxPrice) q.set('maxPrice', String(maxPrice));
    if (guests) q.set('guests', String(guests));
    return this.safeResult<StayListing>(`${this.staysApi}/listings?${q}`, 'Stays');
  }

  /** OMNIA Rides classes as a typed result. */
  async getRidesResult(city?: string): Promise<MarketResult<RideClass>> {
    const q = new URLSearchParams();
    if (city) q.set('city', city);
    return this.safeResult<RideClass>(`${this.ridesApi}/rides?${q}`, 'Rides');
  }

  /** Raw OMNIA Eats vendors — resilient array form ([] on outage) for trip/manage assembly. */
  async getEatsVendors(city?: string): Promise<FoodVendor[]> {
    const r = await this.getEatsVendorsResult(city);
    return r.ok ? r.items : [];
  }

  /** Raw OMNIA Stays listings — resilient array form ([] on outage). */
  async getStays(city?: string, maxPrice?: number, guests?: number): Promise<StayListing[]> {
    const r = await this.getStaysResult(city, maxPrice, guests);
    return r.ok ? r.items : [];
  }

  /** Raw OMNIA Rides classes — resilient array form ([] on outage). */
  async getRides(city?: string): Promise<RideClass[]> {
    const r = await this.getRidesResult(city);
    return r.ok ? r.items : [];
  }

  /** Fetch a JSON array as a typed result; `unreachable` on transport/HTTP failure. */
  private async safeResult<T>(url: string, label: string): Promise<MarketResult<T>> {
    try {
      return { ok: true, items: (await this.getJson<T[]>(url)) ?? [] };
    } catch (err) {
      this.logger.warn(`${label} API unreachable: ${(err as Error).message}`);
      return { ok: false, unreachable: true };
    }
  }

  async execute(tool: ToolId, prompt: string, location?: UserLocation): Promise<ToolResult> {
    switch (tool) {
      case 'travel':
        return this.travel(prompt, location);
      case 'restaurant':
        return this.restaurant(prompt, location);
      case 'shopping':
        return this.shopping(prompt, location);
      case 'maps':
        return this.maps(location);
      case 'calendar':
        return { tool, summary: 'Drafted schedule and reminders.', recommendations: [] };
      case 'notification':
        return { tool, summary: 'Prepared alerts and confirmations.', recommendations: [] };
      default:
        return { tool, summary: 'No results.', recommendations: [] };
    }
  }

  // ── OMNIA Stays (external app) ───────────────────────────
  private async travel(prompt: string, location?: UserLocation): Promise<ToolResult> {
    const maxPrice = extractNumber(prompt, /(?:under|below|max|less than)\s*(\d{2,5})/i) ?? extractNumber(prompt, /(\d{2,5})\s*mad/i);
    const guests = extractNumber(prompt, /(\d{1,2})\s*(?:people|guests|persons|adults|pax)/i);
    const city = cityFromPrompt(prompt) ?? location?.city;
    try {
      const q = new URLSearchParams();
      if (city) q.set('city', city);
      if (maxPrice) q.set('maxPrice', String(maxPrice));
      if (guests) q.set('guests', String(guests));
      const listings = await this.getJson<StayListing[]>(`${this.staysApi}/listings?${q}`);
      if (!listings?.length) return { tool: 'travel', summary: 'No stays available right now.', recommendations: [] };
      const recs: Recommendation[] = listings.slice(0, 4).map((l, i) => ({
        id: randomUUID(),
        tool: 'travel',
        title: l.title,
        subtitle: [l.neighborhood, l.city].filter(Boolean).join(' · '),
        price: l.pricePerNight,
        rating: l.rating ?? undefined,
        meta: [`${l.maxGuests} guests`, `${l.bedrooms} bd`, ...(l.amenities ?? []).slice(0, 1)],
        image: l.images?.[0],
        badge: i === 0 ? 'Top pick' : undefined,
        best: i === 0,
        refId: l.id,
        action: 'book',
        marketplace: 'stays',
      }));
      return {
        tool: 'travel',
        summary: `Found ${recs.length} OMNIA Stays${city ? ` in ${city}` : ''}${maxPrice ? ` under ${maxPrice} MAD/night` : ''}.`,
        recommendations: recs,
      };
    } catch (err) {
      this.logger.warn(`Stays API failed: ${(err as Error).message}`);
      return { tool: 'travel', summary: 'OMNIA Stays is unreachable. Is it running on :3001?', recommendations: [] };
    }
  }

  // ── OMNIA Eats (external app) ────────────────────────────
  private async restaurant(prompt: string, location?: UserLocation): Promise<ToolResult> {
    const city = cityFromPrompt(prompt) ?? location?.city;
    try {
      const q = new URLSearchParams();
      if (city) q.set('city', city);
      const vendors = await this.getJson<FoodVendor[]>(`${this.eatsApi}/vendors?${q}`);
      if (!vendors?.length) return { tool: 'restaurant', summary: 'No vendors available right now.', recommendations: [] };
      const recs: Recommendation[] = vendors.slice(0, 4).map((v, i) => {
        const cheapest = [...(v.items ?? [])].sort((a, b) => a.price - b.price)[0];
        return {
          id: randomUUID(),
          tool: 'restaurant',
          title: v.name,
          subtitle: [v.cuisine, v.city].filter(Boolean).join(' · '),
          price: cheapest?.price,
          rating: v.rating ?? undefined,
          meta: [`~${v.etaMinutes} min`, v.deliveryFee === 0 ? 'Free delivery' : `${v.deliveryFee} MAD delivery`],
          image: v.image,
          badge: i === 0 ? 'Top rated' : undefined,
          best: i === 0,
          refId: v.id,
          action: 'order',
          marketplace: 'eats',
          orderItemId: cheapest?.id,
        };
      });
      return { tool: 'restaurant', summary: `Found ${recs.length} OMNIA Eats vendors${city ? ` in ${city}` : ''}.`, recommendations: recs };
    } catch (err) {
      this.logger.warn(`Eats API failed: ${(err as Error).message}`);
      return { tool: 'restaurant', summary: 'OMNIA Eats is unreachable. Is it running on :3002?', recommendations: [] };
    }
  }

  // ── Shopping via OpenStreetMap ───────────────────────────
  private async shopping(prompt: string, location?: UserLocation): Promise<ToolResult> {
    // OpenStreetMap shops are GPS-based, so they're only relevant to where the user
    // actually is. If the request is about a DIFFERENT named city (e.g. an Agadir
    // stay search while the browser is in Rabat), skip it — don't mix in wrong-city shops.
    const namedCity = cityFromPrompt(prompt);
    if (namedCity && namedCity.toLowerCase() !== (location?.city ?? '').toLowerCase()) {
      return { tool: 'shopping', summary: `Skipped nearby shops — that request is about ${namedCity}, not your current area.`, recommendations: [] };
    }
    if (!location) return { tool: 'shopping', summary: 'Location needed to find nearby shops.', recommendations: [] };
    try {
      const body = `[out:json][timeout:15];(node(around:5000,${location.lat},${location.lon})[shop~"^(supermarket|convenience|mall|department_store)$"][name];);out body 30;`;
      const els = await this.queryOverpass(body);
      const recs = els
        .map((el) => ({ el, name: el.tags?.name, lat: el.lat, lon: el.lon }))
        .filter((x) => x.name && x.lat != null && x.lon != null)
        .slice(0, 4)
        .map((x, i) => ({
          id: randomUUID(),
          tool: 'shopping' as ToolId,
          title: x.name as string,
          subtitle: x.el.tags?.shop ? prettify(x.el.tags.shop) : 'Shop',
          meta: [formatDistance(haversine(location.lat, location.lon, x.lat!, x.lon!))],
          image: img('photo-1604719312566-8912e9227c6a'),
          best: i === 0,
        }));
      return { tool: 'shopping', summary: recs.length ? `Found ${recs.length} shops near you (OpenStreetMap).` : 'No shops found nearby.', recommendations: recs };
    } catch (err) {
      this.logger.warn(`Shopping query failed: ${(err as Error).message}`);
      return { tool: 'shopping', summary: 'Could not reach the shops service.', recommendations: [] };
    }
  }

  private maps(location?: UserLocation): ToolResult {
    if (!location) return { tool: 'maps', summary: 'No location shared yet.', recommendations: [] };
    const place = [location.city, location.country].filter(Boolean).join(', ') || `${location.lat.toFixed(3)}, ${location.lon.toFixed(3)}`;
    return { tool: 'maps', summary: `Using your location: ${place}.`, recommendations: [] };
  }

  private async getJson<T>(url: string): Promise<T | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  }

  private async queryOverpass(body: string): Promise<OverpassEl[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 14000);
    try {
      const res = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'OMNIA-Agent/1.0' },
        body: `data=${encodeURIComponent(body)}`,
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as { elements?: OverpassEl[] };
      return json.elements ?? [];
    } finally {
      clearTimeout(timer);
    }
  }
}

function extractNumber(text: string, re: RegExp): number | undefined {
  const m = text.match(re);
  return m ? parseInt(m[1], 10) : undefined;
}
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m away` : `${(m / 1000).toFixed(1)} km away`;
}
function prettify(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
