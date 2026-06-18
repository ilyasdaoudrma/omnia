import { Logger } from '@nestjs/common';
import type { AIProvider } from '../ai/ai-provider.interface';
import type { ToolsService, FoodVendor, StayListing, RideClass, MenuItem } from '../tools/tools.service';
import type {
  CheckoutDraft,
  CheckoutOutcome,
  ClarifyRequest,
  ChatMessage,
  UserLocation,
  RideOption,
  TripPlan,
  ItineraryDay,
  MenuView,
  MenuItemView,
} from '../ai/agent.types';

const logger = new Logger('CheckoutBuilder');

const ACTION = /\b(order|buy|purchase|grab|book|reserve|i want|i'?ll have|i need|need a|need an|get me|commande|commander|je veux|réserve|reserve)\b/i;
const FOOD = /(food|eat|dinner|lunch|breakfast|meal|dish|pizza|burger|sushi|tagine|couscous|salad|juice|coke|soda|fries|drink|restaurant|kitchen|combo|menu)/i;
const STAY = /(\bstay\b|\broom\b|riad|apartment|appartement|villa|studio|hotel|hôtel|guesthouse|loft|\bnights?\b|\bnuits?\b|place to stay|somewhere to stay)/i;
// Accommodation words that read as a stay only when it's NOT a ride request
// ("book a home in Casa" → stay; "drive me home", "a car ride home" → ride).
const HOME_STAY = /\b(home|house|accommodation|accomodation|lodging|airbnb|air\s?bnb)\b/i;
const RIDE = /(\bride\b|\brides\b|\btaxi\b|\bcab\b|\bcar\b|\bdriver\b|\bchauffeur\b|pick me up|pick-?up|drop ?off|drop me|\blift\b|to the airport|airport transfer|\bmoto\b|\bscooter\b|\btrajet\b|\bsuv\b|\b4x4\b|\bvan\b|\bsedan\b|\bporsche\b|\bcayenne\b|\bbmw\b|\bx6\b|\bmercedes\b|\bglc\b|\bsandero\b|\bdacia\b|\bpeugeot\b|\btucson\b|\bhyundai\b)/i;
// Whole-trip planning ("plan my trip to Rabat") → assemble stay + meal + ride.
const TRIP = /\b(full|whole|entire|complete)\s+(trip|weekend|getaway|day|experience)\b|\bplan\b[\s\S]{0,40}\b(trip|weekend|getaway|vacation|holiday|visit|escape)\b|\btrip to\b|\bweekend in\b|\bplan my (visit|stay|day)\b/i;

// The ONLY cities OMNIA operates in. Anything else is politely refused.
export const SUPPORTED_CITIES = ['Rabat', 'Casablanca', 'Marrakech', 'Tanger', 'Oujda', 'Agadir'] as const;

// Canonical city ← every spelling/alias/common misspelling we accept. Generous on
// purpose: "casa" → Casablanca, "marakech/marrakesh" → Marrakech, "tangier/tanja"
// → Tanger, etc., so a typo never reads as an unknown city.
const CITY_ALIASES: { re: RegExp; city: string }[] = [
  { re: /\b(casa\s?blanca|casablanca|casablaca|casablana|casabalanca|casa|dar\s?(el\s?)?beida|كازا(بلانكا)?|الدار\s?البيضاء)\b/i, city: 'Casablanca' },
  { re: /\b(rabat|rabbat|rabatt|rbat|الرباط)\b/i, city: 'Rabat' },
  { re: /\b(marrakech|marrakesh|marakech|marakesh|marrakch|marakch|marrackech|marrakche|marrakeche|merrakech|mrakech|marrekech|marrakeche|marakkech|مراكش)\b/i, city: 'Marrakech' },
  { re: /\b(tanger|tangier|tangiers|tangja|tanja|tanjah|tanger?city|طنجة)\b/i, city: 'Tanger' },
  { re: /\b(oujda|oudjda|oujida|ouijda|wajda|wejda|wujda|oudja|وجدة)\b/i, city: 'Oujda' },
  { re: /\b(agadir|agadeer|agadire|aghadir|agadi?r|أكادير|اكادير)\b/i, city: 'Agadir' },
];

/** Canonical city for any recognised spelling, else undefined. */
function matchCity(text: string): string | undefined {
  for (const { re, city } of CITY_ALIASES) if (re.test(text)) return city;
  return undefined;
}

/** The supported city mentioned LAST in a block of text (e.g. recent conversation)
 *  — used to keep a vendor follow-up in the city just discussed. */
function lastCityInText(text: string): string | undefined {
  const lower = text.toLowerCase();
  let best: { city: string; idx: number } | undefined;
  for (const { re, city } of CITY_ALIASES) {
    const m = lower.match(re);
    if (m && m.index !== undefined && (!best || m.index > best.idx)) best = { city, idx: m.index };
  }
  return best?.city;
}

/** Back-compat alias used throughout the builder (resolves any spelling). */
function extractCity(text: string): string | undefined {
  return matchCity(text);
}

// Generic intra-city destinations ("to the airport", "to the medina") — these
// are NOT cities, so they must never trip the unsupported-city refusal.
const NON_CITY_PLACE =
  /^(the\s+)?(airport|aeroport|airfield|station|gare|bus|train|tram|terminal|beach|plage|corniche|medina|old\s?town|new\s?town|downtown|uptown|city\s?(centre|center)|centre|center|port|marina|harbou?r|mall|souks?|market|hotel|riad|guest\s?house|home|house|my\s?place|apartment|appartement|work|office|restaurant|cafe|caf[ée]|mosque|square|stadium|hospital|clinic|pharmacy|gym|beachfront|seaside|address)\b/i;

// Single tokens after "to/in" that are obviously verbs/objects, not place names
// ("going to eat", "book a table in advance") — guard against false refusals.
const NOT_A_PLACE = new Set([
  'eat', 'sleep', 'drink', 'order', 'book', 'go', 'get', 'see', 'do', 'rest', 'relax', 'party',
  'shop', 'dinner', 'lunch', 'breakfast', 'brunch', 'bed', 'play', 'meet', 'visit', 'stay',
  'travel', 'town', 'city', 'somewhere', 'anywhere', 'there', 'here', 'advance', 'room', 'table',
  'food', 'me', 'us', 'my', 'you', 'the', 'a', 'an', 'it', 'chill', 'unwind', 'wander',
  'explore', 'wander', 'celebrate', 'work', 'home',
]);

// Movement/booking words that introduce a destination, e.g. "trip to X",
// "weekend in X", "ride to X", "staying in X".
const DEST_RE =
  /\b(?:trip|travel(?:l?ing)?|getaway|weekend|holiday|vacation|honeymoon|tour|visit(?:ing)?|go(?:ing)?|head(?:ing|ed)?|fly(?:ing)?|flight|drive|driving|ride|book(?:ing)?|stay(?:ing)?|explore|escape)\s+(?:to|in|into|toward|towards|around|at)\s+([a-zà-ÿ][a-zà-ÿ'’.\- ]{1,30})/i;

export type Destination =
  | { kind: 'city'; city: string }
  | { kind: 'unsupported'; name: string }
  | { kind: 'none' };

/**
 * Trip-planner resolver (high recall). A trip names its destination, so resolve
 * the destination FIRST ("from Rabat to Paris" → Paris, not the origin), then
 * fall back to a whole-text city scan and the world gazetteer. Any clearly-named
 * place that isn't one of the 6 → refuse, so we never silently book the wrong city.
 */
export function resolveTripCity(text: string): Destination {
  const dest = extractDestinationName(text);
  if (dest) {
    const c = matchCity(dest);
    return c ? { kind: 'city', city: c } : { kind: 'unsupported', name: titleCase(dest) };
  }
  const city = matchCity(text);
  if (city) return { kind: 'city', city };
  const known = matchUnsupportedCity(text);
  if (known) return { kind: 'unsupported', name: known };
  return { kind: 'none' };
}

/**
 * Direct order/stay/ride resolver (high precision). Only refuse when a well-known
 * city/country we don't serve is named — so an intra-city neighbourhood
 * ("a riad in Gueliz", "ride to Gueliz") is never mistaken for an unknown city,
 * while "a riad in Lisbon" is correctly refused.
 */
export function resolveNamedCity(text: string): Destination {
  const city = matchCity(text);
  if (city) return { kind: 'city', city };
  const known = matchUnsupportedCity(text);
  if (known) return { kind: 'unsupported', name: known };
  return { kind: 'none' };
}

/**
 * Pull the destination place-name from a trip request, or undefined. Scans the
 * movement phrase plus any "to/in <place>" and returns the LAST candidate, since
 * the destination usually follows the origin. Filters out generic intra-city
 * spots ("the airport") and non-places ("eat", "relax").
 */
function extractDestinationName(text: string): string | undefined {
  const candidates: string[] = [];
  const collect = (re: RegExp) => {
    const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g');
    for (const m of text.matchAll(g)) {
      const c = cleanPlace(m[1]);
      if (c) candidates.push(c);
    }
  };
  collect(DEST_RE);
  collect(/\b(?:to|in|into|toward|towards|around)\s+([a-zà-ÿ][a-zà-ÿ'’.\- ]{1,30})/i);
  return candidates.length ? candidates[candidates.length - 1] : undefined;
}

function cleanPlace(raw: string): string | undefined {
  let name = raw.trim().replace(/^(the|a|an|my|our)\s+/i, '');
  name = name
    .split(/\s+(?:for|with|on|at|this|next|during|over|from|and|please|tonight|tomorrow|today|in|to|near|by)\b/i)[0]
    .trim();
  name = name.replace(/\d.*$/, '').replace(/[.,;:!?].*$/, '').trim();
  name = name.replace(/\s+(city|town|area|region)$/i, '').trim();
  if (name.length < 2) return undefined;
  if (NON_CITY_PLACE.test(name)) return undefined; // "airport", "medina"…
  if (name.toLowerCase().split(/\s+/).some((w) => NOT_A_PLACE.has(w))) return undefined; // "eat"…
  return name;
}

function titleCase(s: string): string {
  return s.replace(/\b[a-zà-ÿ]/gi, (c) => c.toUpperCase());
}

// ── World gazetteer: well-known cities/countries OMNIA does NOT serve. Curated to
// avoid entries that double as common words (no "Nice", "Turkey", "Sale", "Tours"…),
// so a food/booking phrase never trips a false refusal. Powers the precise
// direct-action check and backs up the trip resolver. {re, canonical display name}.
const UNSUPPORTED_CITIES: { re: RegExp; name: string }[] = [
  // Moroccan cities we don't serve (with common spellings)
  { re: /\b(fes|fez|f[èe]s)\b/i, name: 'Fes' },
  { re: /\b(meknes|mekn[èe]s)\b/i, name: 'Meknes' },
  { re: /\b(tetouan|tetuan|t[ée]touan)\b/i, name: 'Tetouan' },
  { re: /\b(chefchaouen|chaouen|chefchawen)\b/i, name: 'Chefchaouen' },
  { re: /\b(essaouira|essawira|mogador)\b/i, name: 'Essaouira' },
  { re: /\b(el\s?jadida|eljadida)\b/i, name: 'El Jadida' },
  { re: /\b(kenitra|k[ée]nitra)\b/i, name: 'Kenitra' },
  { re: /\b(nador)\b/i, name: 'Nador' },
  { re: /\b(ifrane)\b/i, name: 'Ifrane' },
  { re: /\b(ouarzazate|warzazat)\b/i, name: 'Ouarzazate' },
  { re: /\b(dakhla)\b/i, name: 'Dakhla' },
  { re: /\b(laayoune|la[âa]youne)\b/i, name: 'Laayoune' },
  { re: /\b(safi|asfi)\b/i, name: 'Safi' },
  { re: /\b(mohammedia)\b/i, name: 'Mohammedia' },
  { re: /\b(beni\s?mellal)\b/i, name: 'Beni Mellal' },
  { re: /\b(taza)\b/i, name: 'Taza' },
  { re: /\b(settat)\b/i, name: 'Settat' },
  { re: /\b(khouribga)\b/i, name: 'Khouribga' },
  { re: /\b(berkane)\b/i, name: 'Berkane' },
  { re: /\b(taroudant)\b/i, name: 'Taroudant' },
  { re: /\b(errachidia)\b/i, name: 'Errachidia' },
  { re: /\b(tiznit)\b/i, name: 'Tiznit' },
  { re: /\b(zagora)\b/i, name: 'Zagora' },
  { re: /\b(merzouga)\b/i, name: 'Merzouga' },
  { re: /\b(asilah|arzila)\b/i, name: 'Asilah' },
  { re: /\b(al\s?hoceima|alhucemas)\b/i, name: 'Al Hoceima' },
  { re: /\b(larache)\b/i, name: 'Larache' },
  { re: /\b(guelmim)\b/i, name: 'Guelmim' },
  { re: /\b(azrou)\b/i, name: 'Azrou' },
  { re: /\b(midelt)\b/i, name: 'Midelt' },
  // International cities
  { re: /\b(paris)\b/i, name: 'Paris' },
  { re: /\b(london|londres)\b/i, name: 'London' },
  { re: /\b(madrid)\b/i, name: 'Madrid' },
  { re: /\b(barcelona|barcelone)\b/i, name: 'Barcelona' },
  { re: /\b(lisbon|lisboa|lisbonne)\b/i, name: 'Lisbon' },
  { re: /\b(rome|roma)\b/i, name: 'Rome' },
  { re: /\b(milan|milano)\b/i, name: 'Milan' },
  { re: /\b(berlin)\b/i, name: 'Berlin' },
  { re: /\b(munich)\b/i, name: 'Munich' },
  { re: /\b(amsterdam)\b/i, name: 'Amsterdam' },
  { re: /\b(brussels|bruxelles)\b/i, name: 'Brussels' },
  { re: /\b(vienna|vienne)\b/i, name: 'Vienna' },
  { re: /\b(dublin)\b/i, name: 'Dublin' },
  { re: /\b(marseille)\b/i, name: 'Marseille' },
  { re: /\b(geneva|gen[èe]ve)\b/i, name: 'Geneva' },
  { re: /\b(zurich)\b/i, name: 'Zurich' },
  { re: /\b(dubai)\b/i, name: 'Dubai' },
  { re: /\b(abu\s?dhabi)\b/i, name: 'Abu Dhabi' },
  { re: /\b(doha)\b/i, name: 'Doha' },
  { re: /\b(riyadh)\b/i, name: 'Riyadh' },
  { re: /\b(jeddah|jedda)\b/i, name: 'Jeddah' },
  { re: /\b(cairo)\b/i, name: 'Cairo' },
  { re: /\b(tunis)\b/i, name: 'Tunis' },
  { re: /\b(algiers|alger)\b/i, name: 'Algiers' },
  { re: /\b(oran)\b/i, name: 'Oran' },
  { re: /\b(istanbul)\b/i, name: 'Istanbul' },
  { re: /\b(athens)\b/i, name: 'Athens' },
  { re: /\b(new\s?york|nyc)\b/i, name: 'New York' },
  { re: /\b(los\s?angeles)\b/i, name: 'Los Angeles' },
  { re: /\b(miami)\b/i, name: 'Miami' },
  { re: /\b(toronto)\b/i, name: 'Toronto' },
  { re: /\b(montreal|montr[ée]al)\b/i, name: 'Montreal' },
  { re: /\b(tokyo)\b/i, name: 'Tokyo' },
  { re: /\b(beijing)\b/i, name: 'Beijing' },
  { re: /\b(shanghai)\b/i, name: 'Shanghai' },
  { re: /\b(singapore)\b/i, name: 'Singapore' },
  { re: /\b(bangkok)\b/i, name: 'Bangkok' },
  { re: /\b(mumbai|bombay)\b/i, name: 'Mumbai' },
  { re: /\b(sydney)\b/i, name: 'Sydney' },
  { re: /\b(melbourne)\b/i, name: 'Melbourne' },
  { re: /\b(dakar)\b/i, name: 'Dakar' },
  { re: /\b(cape\s?town)\b/i, name: 'Cape Town' },
  // Countries
  { re: /\b(france)\b/i, name: 'France' },
  { re: /\b(spain|espagne|espa[ñn]a)\b/i, name: 'Spain' },
  { re: /\b(portugal)\b/i, name: 'Portugal' },
  { re: /\b(italy|italie|italia)\b/i, name: 'Italy' },
  { re: /\b(germany|allemagne)\b/i, name: 'Germany' },
  { re: /\b(netherlands|holland)\b/i, name: 'Netherlands' },
  { re: /\b(belgium|belgique)\b/i, name: 'Belgium' },
  { re: /\b(england|angleterre)\b/i, name: 'England' },
  { re: /\b(ireland|irlande)\b/i, name: 'Ireland' },
  { re: /\b(switzerland|suisse)\b/i, name: 'Switzerland' },
  { re: /\b(egypt|[ée]gypte)\b/i, name: 'Egypt' },
  { re: /\b(tunisia|tunisie)\b/i, name: 'Tunisia' },
  { re: /\b(algeria|alg[ée]rie)\b/i, name: 'Algeria' },
  { re: /\b(senegal|s[ée]n[ée]gal)\b/i, name: 'Senegal' },
  { re: /\b(saudi\s?arabia)\b/i, name: 'Saudi Arabia' },
  { re: /\b(qatar)\b/i, name: 'Qatar' },
];

/** First well-known unsupported city/country named in the text, if any. */
function matchUnsupportedCity(text: string): string | undefined {
  for (const { re, name } of UNSUPPORTED_CITIES) if (re.test(text)) return name;
  return undefined;
}

/** Friendly refusal naming the 6 cities we actually serve. */
export function unsupportedCityMessage(name: string): string {
  const cities = `${SUPPORTED_CITIES.slice(0, -1).join(', ')}, and ${SUPPORTED_CITIES[SUPPORTED_CITIES.length - 1]}`;
  return (
    `Sorry — OMNIA doesn't operate in ${name} yet, so I can't book a stay, order food, or arrange a ride there. ` +
    `We currently serve only these 6 Moroccan cities: ${cities}. ` +
    `Tell me which one you'd like and I'll plan it for you.`
  );
}

// A word that, on its own, picks ONE option from several — so the follow-up
// isn't actually ambiguous and we shouldn't stop to ask.
const RESOLVER =
  /\b(cheapest|priciest|dearest|most expensive|best|top|highest[- ]rated|first|second|third|fourth|last|nearest|closest|both|all|everything|either)\b/i;

/**
 * Detects a concrete "place this order / book this stay" request — possibly BOTH
 * in one sentence ("book the riad ... and order ... from Dar Tagine") — and
 * assembles confirm-ready CheckoutDrafts by resolving against live OMNIA
 * Stays/Eats inventory. Returns null when it's a browse/search, not an action.
 */
export async function buildCheckout(
  provider: AIProvider,
  tools: ToolsService,
  prompt: string,
  location?: UserLocation,
  history: ChatMessage[] = [],
): Promise<CheckoutOutcome | null> {
  // Whole-trip planning ("plan a trip to Agadir for 4 people"). Gather the
  // effective request (original message + any answers the user gave), then ask
  // for whatever's still missing — party size AND nights — before assembling,
  // since both drive the home's price/capacity and how much food to order.
  const tripText = gatherTrip(prompt, history);
  if (tripText) {
    // Refuse a trip to a city we don't serve BEFORE asking guests/nights — never
    // silently fall back to the user's location and book the wrong city.
    const dest = resolveTripCity(tripText);
    if (dest.kind === 'unsupported') return { kind: 'message', text: unsupportedCityMessage(dest.name) };
    const missing = missingTripInfo(tripText);
    if (missing) return { kind: 'clarify', clarify: missing };
    const trip = await buildTrip(tools, tripText, location);
    if (trip.drafts.length) return { kind: 'drafts', drafts: trip.drafts, trip: trip.plan };
  }

  // A strong ride request ("SUV from Casablanca airport to downtown, 15km") is an
  // action even without an order verb — a vehicle/ride noun plus a from/to/endpoint.
  const ridesNoun =
    /\b(ride|taxi|cab|car|driver|chauffeur|suv|porsche|cayenne|bmw|x6|mercedes|glc|sandero|dacia|peugeot|tucson|hyundai|sedan|4x4|van|moto|scooter)\b/i.test(prompt);
  const directRide =
    ridesNoun &&
    (/\b(from|to|pick ?up|drop ?off|airport|downtown|centre|center|station)\b/i.test(prompt) ||
      // "ride in Tanger" with no endpoints is still a ride request (we default the route).
      resolveNamedCity(prompt).kind === 'city');
  // A bare drink request ("just a water please", "a drink") is an order even with
  // no verb — when a vendor is named or the recent chat was about food/a place.
  const recentText = history.map((m) => m.content).join('\n').toLowerCase();
  const directDrink =
    isDrinkOnly(prompt) &&
    (NAMES_VENDOR_RE.test(prompt) ||
      /\b(restaurant|food|menu|eat|dish|drink|vendor|kitchen)\b/i.test(recentText) ||
      NAMES_VENDOR_RE.test(recentText));
  // "from another restaurant" / "a different place" after a food turn is a food
  // re-order intent even without an order verb — let it through to the switch clarify.
  const directFoodSwitch =
    /\b(another|different|other|else ?where|somewhere else)\b/i.test(prompt) &&
    /\b(restaurant|place|vendor|kitchen|spot|one)\b/i.test(prompt) &&
    (NAMES_VENDOR_RE.test(recentText) || /\b(restaurant|food|menu|eat|dish|order|vendor|kitchen)\b/i.test(recentText));
  if (!ACTION.test(prompt) && !directRide && !directDrink && !directFoodSwitch) return null;

  // Direct order/booking/ride that names a city we don't serve → refuse rather
  // than defaulting to the user's location (e.g. "book a riad in Lisbon").
  const named = resolveNamedCity(prompt);
  if (named.kind === 'unsupported') return { kind: 'message', text: unsupportedCityMessage(named.name) };

  // Recent conversation so follow-ups like "order the cheapest one" resolve
  // against what was just discussed (which doesn't repeat the food/stay word).
  // Skip empty messages — the chat UI appends an empty assistant placeholder
  // before sending, which would otherwise hide the real last reply.
  const meaningful = history.filter(
    (m) => (m.role === 'user' || m.role === 'assistant') && m.content.trim().length > 0,
  );
  const recent = meaningful
    .slice(-10)
    .map((m) => `${m.role === 'user' ? 'User' : 'Agent'}: ${m.content}`)
    .join('\n');
  const lastAssistant = [...meaningful].reverse().find((m) => m.role === 'assistant')?.content ?? '';
  // The vendor the user most recently said they're ordering from — so a bare
  // "just a water" sticks to that place, not whatever was named first/earlier.
  const activeVendorText =
    [...meaningful].reverse().find((m) => m.role === 'user' && NAMES_VENDOR_RE.test(m.content))?.content ?? '';

  // Canonical city for the marketplace lookup. Priority: a supported city named in
  // the prompt → a city named in the recent conversation (so "a coke from Dar Tagine"
  // after "...in Rabat" stays in Rabat) → the user's NORMALISED GPS city.
  const city =
    (named.kind === 'city' ? named.city : undefined) ??
    lastCityInText(recent) ??
    matchCity(location?.city ?? '') ??
    location?.city;

  // Domain from the current message; if it's an ambiguous follow-up, infer it
  // from what the agent was just talking about. A dish named in the prompt
  // ("order the pastilla") counts as naming food even if it's not a FOOD keyword.
  // Naming one of our restaurants ("order from Green Bowl") is a food intent even
  // when no word in FOOD/DISHES appears (e.g. "bowl" isn't a dish keyword).
  const promptFood = FOOD.test(prompt) || detectDish(prompt) !== undefined || NAMES_VENDOR_RE.test(prompt);
  const promptRide = RIDE.test(prompt);
  // "home"/"house" count as a stay only when it isn't a ride ("a home in Casa" →
  // stay; "a car ride home" → ride). This keeps a plain "book a home" off the
  // context-food fallback below, so a stay request never drags in unasked food.
  const promptStay = STAY.test(prompt) || (HOME_STAY.test(prompt) && !promptRide);
  // Fall back to the wider recent context (which includes the user's prior
  // turns), not just the last reply, so inference doesn't hinge on the exact
  // wording the model happened to use.
  const ctx = `${lastAssistant}\n${recent}`;
  const wantsFood = promptFood || (!promptStay && !promptRide && FOOD.test(ctx));
  const wantsStay = promptStay || (!promptFood && !promptRide && STAY.test(ctx));
  const wantsRide = promptRide;

  // A drink-only request ("just a water please", "get me a coke") is unambiguous
  // about WHAT (a drink) — resolve it (vendor from the prompt/context) BEFORE the
  // generic "which restaurant?" clarify, so a drink follow-up keeps the chosen place.
  if (wantsFood && isDrinkOnly(prompt)) {
    const drink = await buildDrinkOnly(tools, prompt, recent, city, activeVendorText);
    if (drink) return drink;
  }

  // Before committing, catch the genuinely-ambiguous follow-up — "order one"
  // after several distinct dishes/places were discussed, with nothing in the
  // request that picks between them. Ask instead of guessing.
  const clarify = detectAmbiguity({ prompt, recent, wantsFood, wantsStay, promptFood, promptStay });
  if (clarify) return { kind: 'clarify', clarify };

  // A bare "order one" after a restaurant browse → ask which place, listing the
  // city's REAL vendors (so no option is ever dropped because the model's prose
  // didn't name it verbatim).
  if (wantsFood && !promptFood) {
    const vendorClarify = await buildVendorClarify(tools, prompt, recent, city);
    if (vendorClarify) return { kind: 'clarify', clarify: vendorClarify };
  }

  // "from another restaurant" / "a different place" → switch vendor: list the
  // city's OTHER restaurants to pick from (so it never refuses or guesses).
  if (
    wantsFood &&
    /\b(another|different|other|else ?where|somewhere else)\b/i.test(prompt) &&
    /\b(restaurant|place|vendor|kitchen|spot|one)\b/i.test(prompt)
  ) {
    const alt = await buildAltVendorClarify(tools, recent, city);
    if (alt) return { kind: 'clarify', clarify: alt };
  }

  const [stayR, eatsR, rideR] = await Promise.all([
    wantsStay ? buildStay(provider, tools, prompt, recent, city) : Promise.resolve<BuildResult>(null),
    wantsFood ? buildEats(provider, tools, prompt, recent, city) : Promise.resolve<BuildResult>(null),
    wantsRide ? buildRide(tools, prompt, city) : Promise.resolve<BuildResult>(null),
  ]);

  const results = [stayR, eatsR, rideR];
  const drafts = results
    .map((r) => (r && 'draft' in r ? r.draft : null))
    .filter((d): d is CheckoutDraft => d !== null);
  if (drafts.length) return { kind: 'drafts', drafts };

  // No drafts — if a requested marketplace was unreachable, say so (vs "no results").
  const down = results.find((r): r is { unavailable: Marketplace } => !!r && 'unavailable' in r);
  if (down) return { kind: 'message', text: marketplaceDownMessage(down.unavailable) };
  return null;
}

type Marketplace = 'eats' | 'stays' | 'rides';
/** A direct builder either assembled a draft, found a marketplace down, or had no match. */
type BuildResult = { draft: CheckoutDraft } | { unavailable: Marketplace } | null;

function marketplaceDownMessage(m: Marketplace): string {
  const name = m === 'eats' ? 'OMNIA Eats' : m === 'stays' ? 'OMNIA Stays' : 'OMNIA Rides';
  const port = m === 'eats' ? '3002' : m === 'stays' ? '3001' : '3003';
  return `I couldn't reach ${name} just now, so I can't put that together. Please make sure it's running (port ${port}) and try again.`;
}

interface AmbiguityInput {
  prompt: string;
  recent: string;
  wantsFood: boolean;
  wantsStay: boolean;
  promptFood: boolean;
  promptStay: boolean;
}

/**
 * Returns a clarifying question when the request is a context-dependent
 * follow-up ("order one", "book it") that names no specific item itself, the
 * conversation offered 2+ distinct candidates, and no resolver word ("cheapest",
 * "first"…) settles the choice. Otherwise null — let the builder proceed.
 */
function detectAmbiguity(a: AmbiguityInput): ClarifyRequest | null {
  if (RESOLVER.test(a.prompt)) return null;

  // Food follow-up that doesn't name a dish in the prompt itself.
  if (a.wantsFood && !a.promptFood) {
    const dishes = distinctDishes(a.recent).slice(0, 4);
    if (dishes.length >= 2) {
      return {
        question: `You mentioned a few dishes — ${joinChoices(dishes)}. Which one should I order?`,
        options: dishes.map((d) => `Order the ${d}`),
      };
    }
    // (A bare "order one" after a list of RESTAURANTS is handled by the async
    //  buildVendorClarify in buildCheckout, which lists the city's real vendors.)
  }

  // Stay follow-up that doesn't name a place type in the prompt itself.
  if (a.wantsStay && !a.promptStay) {
    const types = distinctStayTypes(a.recent).slice(0, 4);
    if (types.length >= 2) {
      return {
        question: `You looked at a few places — ${joinChoices(types)}. Which one should I book?`,
        options: types.map((t) => `Book the ${t}`),
      };
    }
  }

  return null;
}

function joinChoices(items: string[]): string {
  const a = items.map((i) => `the ${i}`);
  if (a.length === 2) return `${a[0]} or ${a[1]}`;
  return `${a.slice(0, -1).join(', ')}, or ${a[a.length - 1]}`;
}

/** Join proper nouns (vendor names) naturally, without a leading "the". */
function joinNames(items: string[]): string {
  if (items.length === 2) return `${items[0]} or ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, or ${items[items.length - 1]}`;
}

// The 5 seeded OMNIA Eats vendor base names — used to detect when a browse listed
// several restaurants so a bare "order one" can ask which place.
const VENDOR_NAMES = ['Smashed & Co', 'Dar Tagine', 'Sakura', 'Napoli', 'Green Bowl'];
// Matches any of our 5 seeded restaurant base names in free text.
const NAMES_VENDOR_RE = /\b(napoli|sakura|smashed|dar\s*tagine|green\s*bowl)\b/i;
function distinctVendors(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return VENDOR_NAMES.filter((v) => lower.includes(v.toLowerCase()));
}

/**
 * Ask which restaurant when a browse surfaced several — the options are the city's
 * REAL vendors (fetched live), so no choice is dropped because the model's prose
 * didn't name it verbatim. Fires only on a bare food follow-up ("order one") that
 * names no vendor/dish/resolver and follows a multi-restaurant browse.
 */
async function buildVendorClarify(tools: ToolsService, prompt: string, recent: string, city?: string): Promise<ClarifyRequest | null> {
  if (RESOLVER.test(prompt)) return null;
  if (distinctVendors(prompt).length) return null; // the prompt already names a place
  if (distinctVendors(recent).length < 2) return null; // wasn't a multi-restaurant browse
  const res = await tools.getEatsVendorsResult(city);
  if (!res.ok) return null;
  const names = [...new Set(res.items.map((v) => v.name.split('·')[0].trim()).filter(Boolean))].slice(0, 5);
  if (names.length < 2) return null;
  return {
    question: `A few places came up — ${joinNames(names)}. Which one should I order from?`,
    options: names.map((n) => `Order from ${n}`),
  };
}

// Asking to SEE a vendor's menu (not order yet).
const MENU_VIEW_RE = /\b(menu|what'?s (on|in)|what do (they|you|i) (have|serve|offer|get)|which dishes|what dishes|see (the )?(menu|food)|their menu|show .*menu)\b/i;

/**
 * "Show me the menu of Napoli" → fetch that vendor's LIVE menu and present it,
 * grouped Mains / Sides / Drinks with prices. Resolves the vendor by name (in the
 * prompt, else from the recent browse), preferring the named/located city.
 * Returns null when it isn't a menu request or no vendor can be matched — the
 * normal flow then lists restaurants instead.
 */
export async function buildMenuView(
  tools: ToolsService,
  prompt: string,
  history: ChatMessage[] = [],
  location?: UserLocation,
): Promise<MenuView | null> {
  if (!MENU_VIEW_RE.test(prompt)) return null;
  const recent = history.slice(-6).map((m) => m.content).join(' \n ');
  const d = resolveNamedCity(prompt);
  const city = d.kind === 'city' ? d.city : location?.city;

  let vendor: FoodVendor | undefined;
  if (city) {
    const inCity = await tools.getEatsVendors(city);
    vendor = findNamedVendor(inCity, prompt) || findNamedVendor(inCity, recent);
  }
  if (!vendor) {
    const all = await tools.getEatsVendors();
    vendor = findNamedVendor(all, prompt) || findNamedVendor(all, recent);
  }
  if (!vendor) return null;
  return toMenuView(vendor);
}

/** Shape a live vendor into a visual menu (grouped Mains / Sides / Drinks, with images). */
function toMenuView(v: FoodVendor): MenuView {
  const norm = (c?: string): MenuItemView['category'] | null =>
    c === 'Mains' || c === 'Sides' || c === 'Drinks' ? c : null;
  const categoryOf = (i: MenuItem): MenuItemView['category'] =>
    norm(i.category) ?? (DRINK_NAME_RE.test(i.name) ? 'Drinks' : SUPPLEMENT_NAME_RE.test(i.name) ? 'Sides' : 'Mains');
  return {
    vendorId: v.id,
    vendorName: v.name,
    subtitle: [v.cuisine, v.city].filter(Boolean).join(' · '),
    image: v.image,
    deliveryFee: v.deliveryFee,
    etaMinutes: v.etaMinutes,
    items: v.items.map((i) => ({ id: i.id, name: i.name, price: i.price, image: i.image ?? null, category: categoryOf(i) })),
  };
}

/** "From another restaurant" → list the city's OTHER vendors (excluding ones already
 *  discussed) so the user can switch with one tap. */
async function buildAltVendorClarify(tools: ToolsService, recent: string, city?: string): Promise<ClarifyRequest | null> {
  const res = await tools.getEatsVendorsResult(city);
  if (!res.ok) return null;
  const prior = distinctVendors(recent);
  const names = [...new Set(res.items.map((v) => v.name.split('·')[0].trim()).filter(Boolean))]
    .filter((n) => !prior.some((p) => n.toLowerCase().includes(p.toLowerCase())))
    .slice(0, 5);
  if (!names.length) return null;
  return {
    question: `Sure — which restaurant would you like instead? ${joinNames(names)}.`,
    options: names.map((n) => `Order from ${n}`),
  };
}

/** Find the live vendor whose base name is named in the prompt ("...from Napoli"). */
function findNamedVendor(vendors: FoodVendor[], prompt: string): FoodVendor | undefined {
  const lower = prompt.toLowerCase();
  return vendors.find((v) => {
    const base = v.name.split('·')[0].trim().toLowerCase();
    if (!base) return false;
    return lower.includes(base) || base.split(/[\s&]+/).some((w) => w.length >= 4 && lower.includes(w));
  });
}

/** The vendor whose base name appears LAST in the text — the most recently discussed
 *  place — so a follow-up resolves the active vendor, not the first ever mentioned. */
function lastNamedVendor(vendors: FoodVendor[], text: string): FoodVendor | undefined {
  const lower = text.toLowerCase();
  let best: FoodVendor | undefined;
  let bestIdx = -1;
  for (const v of vendors) {
    const base = v.name.split('·')[0].trim().toLowerCase();
    if (!base) continue;
    const idx = lower.lastIndexOf(base);
    if (idx > bestIdx) {
      bestIdx = idx;
      best = v;
    }
  }
  return best;
}

const QTY_WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

/**
 * Deterministically match a vendor's menu items named in the prompt
 * ("a Margherita and 2 Coca-Colas") with quantities + a couple of drink synonyms.
 * Longer names match first (so "Coca-Cola Zero" beats "Coca-Cola"), and each match
 * is consumed so it can't be counted twice. Exact + reliable — used in preference
 * to the LLM mapping, which a small model can get wrong (e.g. returning Tiramisu).
 */
function matchVendorItems(vendor: FoodVendor, prompt: string): EatsLine[] {
  let work = ` ${prompt.toLowerCase().replace(/,/g, ' ')} `;
  // Neutralise the vendor's OWN name so it can't be parsed as a dish — e.g. the
  // "from Dar Tagine" clause must not order a Lamb Tagine, nor "Smashed & Co" a
  // burger. Only blanks the vendor-name phrase; a separate dish word survives.
  const vendorBase = vendor.name.split('·')[0].trim().toLowerCase();
  if (vendorBase) {
    work = work.split(vendorBase).join(' '.repeat(vendorBase.length));
  }
  const out = new Map<string, EatsLine>();
  const byLen = [...vendor.items].sort((a, b) => b.name.length - a.name.length);
  for (const mi of byLen) {
    const pat = mi.name.toLowerCase().replace(/[^a-z0-9]+/g, '[\\s-]*');
    const re = new RegExp(`(?:(\\d+|a|an|one|two|three|four|five|six)\\s+)?\\b${pat}s?\\b`, 'i');
    const m = work.match(re);
    if (!m || m.index === undefined) continue;
    const q = m[1] ? (QTY_WORDS[m[1]] ?? (parseInt(m[1], 10) || 1)) : 1;
    out.set(mi.id, { menuItemId: mi.id, name: mi.name, qty: clampQty(q), price: mi.price });
    work = work.slice(0, m.index) + ' '.repeat(m[0].length) + work.slice(m.index + m[0].length);
  }
  // Synonyms for items the user names colloquially.
  if (/\b(coke|coca|cola|pepsi|soda)\b/i.test(work)) {
    const cola =
      vendor.items.find((i) => /coca-?cola/i.test(i.name) && !/zero|diet|light/i.test(i.name)) ??
      vendor.items.find((i) => /cola/i.test(i.name));
    if (cola && !out.has(cola.id)) out.set(cola.id, { menuItemId: cola.id, name: cola.name, qty: 1, price: cola.price });
  }
  if (/\b(oj|orange juice)\b/i.test(work)) {
    const oj = vendor.items.find((i) => /orange juice/i.test(i.name));
    if (oj && !out.has(oj.id)) out.set(oj.id, { menuItemId: oj.id, name: oj.name, qty: 1, price: oj.price });
  }
  // Generic dish/drink KEYWORDS — a bare "couscous" / "tagine" / "water" maps to
  // the qualified menu item ("Chicken Couscous", "Lamb Tagine", "Still Water")
  // that the full-name pass above misses. Skips items already matched and consumes
  // the matched span so a keyword can't double-count.
  for (const kw of ITEM_KEYWORDS) {
    const re = new RegExp(`(?:(\\d+|a|an|one|two|three|four|five|six)\\s+)?(?:${kw.source})`, 'i');
    const m = work.match(re);
    if (!m || m.index === undefined) continue;
    // The dish word the user actually typed (qty stripped, de-pluralised) — prefer a
    // menu item whose NAME contains it ("cheeseburger" → "Classic Cheeseburger", not
    // the first burger), else fall back to any item of that family.
    const word = m[0].replace(/^\s*(?:\d+|a|an|one|two|three|four|five|six)\s+/i, '').trim().replace(/s$/i, '');
    const candidates = byLen.filter((i) => kw.test(i.name) && !out.has(i.id));
    const mi = (word && candidates.find((i) => i.name.toLowerCase().includes(word))) || candidates[0];
    if (!mi) continue;
    const q = m[1] ? (QTY_WORDS[m[1]] ?? (parseInt(m[1], 10) || 1)) : 1;
    out.set(mi.id, { menuItemId: mi.id, name: mi.name, qty: clampQty(q), price: mi.price });
    work = work.slice(0, m.index) + ' '.repeat(m[0].length) + work.slice(m.index + m[0].length);
  }
  return [...out.values()];
}

// Generic dish/drink words → matched against a vendor's qualified menu-item names
// so "couscous" resolves to "Chicken Couscous" and "water" to "Still Water".
const ITEM_KEYWORDS: RegExp[] = [
  /\btajines?\b|\btagines?\b/i,
  /\bcouscous\b/i,
  /\bpastillas?\b/i,
  /\bharira\b/i,
  /\b(cheese)?burgers?\b|\bsmash\b/i,
  /\bpizzas?\b/i,
  /\bpoke\b/i,
  /\bsushi\b/i,
  /\bsalads?\b/i,
  /\bpastas?\b/i,
  /\btiramisu\b/i,
  /\bwaters?\b/i,
  /\bjuice\b/i,
  /\blemonade\b/i,
  /\bteas?\b/i,
  /\bsmoothie\b/i,
  /\blatte\b/i,
  /\bcoffee\b/i,
];

async function buildEats(provider: AIProvider, tools: ToolsService, prompt: string, context: string, city?: string): Promise<BuildResult> {
  const res = await tools.getEatsVendorsResult(city);
  if (!res.ok) return { unavailable: 'eats' };
  const vendors = res.items;
  if (!vendors.length) return null;

  // Unless the user explicitly mentions a drink/side, hide supplements from the
  // model so "the cheapest one" / "a dish" resolves to a real MAIN — never an
  // 8 MAD water. Explicit "...and a coke" keeps the full menu so it can be added.
  const wantsSupplement = SUPPLEMENT_NAME_RE.test(prompt);
  const catalog = vendors.map((v) => {
    const items = (wantsSupplement ? v.items : v.items.filter((i) => !SUPPLEMENT_NAME_RE.test(i.name)));
    return {
      vendorId: v.id,
      name: v.name,
      cuisine: v.cuisine,
      items: (items.length ? items : v.items).map((i) => ({ menuItemId: i.id, name: i.name, price: i.price })),
    };
  });

  // Detect the dish the user is after (handles tajine≈tagine), from the
  // current message first, else the recent conversation. But if the user named a
  // specific vendor ("order from Napoli"), don't inherit a dish from context — a
  // vendor name like "Dar Tagine" must not force a tagine onto an Italian place.
  const namesVendor = /\b(napoli|sakura|smashed|dar\s*tagine|green\s*bowl)\b/i.test(prompt);
  const dish = detectDish(prompt) ?? (namesVendor ? undefined : detectDish(context));
  // "Order from Napoli" with no dish/drink/quantity → order ONE signature item,
  // not the whole menu (the model tends to over-order on a bare vendor pick).
  const bareVendorOrder = namesVendor && !dish && !SUPPLEMENT_NAME_RE.test(prompt) && !/\d/.test(prompt);

  let vendor: FoodVendor | undefined;
  let items: EatsLine[] = [];

  // Deterministic first: when the user names a vendor + specific menu items
  // ("a Margherita and a Coca-Cola from Napoli"), match them straight from the
  // prompt. Exact + reliable, so it wins over the LLM mapping below.
  const nvNamed = namesVendor ? findNamedVendor(vendors, prompt) : undefined;
  const direct = nvNamed && !bareVendorOrder ? matchVendorItems(nvNamed, prompt) : [];
  if (nvNamed && direct.length) {
    vendor = nvNamed;
    items = direct;
  } else {
    const system =
      'You assemble a food order for OMNIA Eats. Pick exactly ONE vendor and EVERY menu item the user mentions — mains, sides AND drinks. ' +
      'Capture sides and drinks too (e.g. "fries", "a Coke", "an orange juice", "water") by matching them to the closest menu item; every kitchen carries Fries, sodas, water and juices. ' +
      'Use the CONVERSATION to resolve references like "the cheapest one", "that place", or "the first one". ' +
      'When a target dish is given, you MUST order that dish (its closest menu item). "cheapest" then means the lowest-priced variant of THAT dish — never an unrelated cheaper item like a drink. ' +
      'Return ONLY JSON: {"vendorId":"...","items":[{"menuItemId":"...","qty":1}]}. If truly nothing matches, return {"vendorId":null,"items":[]}.';
    const user =
      `Conversation so far:\n${context || '(none)'}\n\n` +
      (dish ? `Target dish the user is ordering: "${dish}". Order the menu item that is this dish.\n\n` : '') +
      `Vendors and menus (JSON):\n${JSON.stringify(catalog)}\n\nLatest user request: "${prompt}"\nReturn the order JSON now.`;

    const parsed = parseJson<{ vendorId: string | null; items: { menuItemId: string; qty: number }[] }>(
      await safeComplete(provider, system, user),
    );

    vendor = parsed?.vendorId ? vendors.find((v) => v.id === parsed.vendorId) : undefined;
    items =
      vendor && parsed?.items?.length
        ? parsed.items
            .map((line) => {
              const mi = vendor!.items.find((i) => i.id === line.menuItemId);
              return mi ? { menuItemId: mi.id, name: mi.name, qty: clampQty(line.qty), price: mi.price } : null;
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
        : [];
  }

  // Force a single signature item for a bare vendor order, or fall back to it when
  // the model returned nothing orderable for a named vendor.
  if (bareVendorOrder || (!items.length && namesVendor)) {
    const nv = findNamedVendor(vendors, prompt);
    const mains = nv ? nv.items.filter((i) => !SUPPLEMENT_NAME_RE.test(i.name)) : [];
    const pick = [...(mains.length ? mains : nv?.items ?? [])].sort((a, b) => a.price - b.price)[0];
    if (nv && pick) {
      vendor = nv;
      items = [{ menuItemId: pick.id, name: pick.name, qty: 1, price: pick.price }];
    }
  }

  if (!vendor || !items.length) return null;

  // Don't silently drop a requested item the menu doesn't carry — substitute an
  // available drink when possible, otherwise note that it was left off.
  const { items: finalItems, note } = reconcileEats(prompt, vendor, items);

  const subtotal = finalItems.reduce((s, i) => s + i.price * i.qty, 0);
  return {
    draft: {
      marketplace: 'eats',
      refId: vendor.id,
      title: vendor.name,
      subtitle: [vendor.cuisine, vendor.city].filter(Boolean).join(' · '),
      image: vendor.image,
      items: finalItems,
      note,
      supplements: suggestSupplements(vendor, finalItems),
      total: subtotal + vendor.deliveryFee,
      currency: 'MAD',
    },
  };
}

// A request for a DRINK and nothing edible — "I want a drink", "get me a coke",
// "something to drink from the nearest place".
const DRINK_INTENT_RE =
  /\b(drinks?|beverages?|soft ?drinks?|sodas?|coca|coke|cola|pepsi|sprite|fanta|hawai|water|juice|lemonade|mojito|smoothie|milkshake|latte|iced tea|mint tea|coffee|something (?:cold|to drink))\b/i;
// Edible food words / dishes — if any appear, it's NOT a drink-only request.
const FOOD_DISH_RE =
  /\b(food|meal|dinner|lunch|breakfast|brunch|dish|combo|eat|hungry|pizzas?|burgers?|sushi|poke|tagines?|tajines?|couscous|salads?|pastas?|pastillas?|harira|soups?|fries|onion rings?|garlic bread|sandwich|wrap|tacos?|snacks?|desserts?|tiramisu|appetizers?|sides?)\b/i;

/** True when the user wants a drink and named no food — so we order only a drink.
 *  Vendor names are stripped first so "a drink from Dar Tagine" isn't read as a dish;
 *  detectDish covers dish PROPER names (Margherita, Pepperoni…) the keyword list misses. */
function isDrinkOnly(prompt: string): boolean {
  let p = prompt.toLowerCase();
  for (const name of VENDOR_NAMES) p = p.split(name.toLowerCase()).join(' ');
  return DRINK_INTENT_RE.test(p) && !FOOD_DISH_RE.test(p) && !detectDish(p);
}

/**
 * Build a drink-only order. A specifically-named drink ("a coke", "a water") is
 * matched deterministically against the vendor's drink menu; a generic "a drink"
 * returns a clarify listing the real drinks so we never guess a dish. Vendor =
 * the one named (in the prompt or recent context), else the city's top vendor.
 */
async function buildDrinkOnly(
  tools: ToolsService,
  prompt: string,
  context: string,
  city?: string,
  activeVendorText = '',
): Promise<CheckoutOutcome | null> {
  const res = await tools.getEatsVendorsResult(city);
  if (!res.ok) return { kind: 'message', text: marketplaceDownMessage('eats') };
  const vendors = res.items;
  if (!vendors.length) return null;

  // Prefer the vendor named in the prompt, then the one the USER most recently said
  // they're ordering from ("I am ordering from Dar Tagine" → that stays active),
  // then the last vendor mentioned anywhere in context, else the city's top vendor.
  const vendor =
    findNamedVendor(vendors, prompt) ??
    findNamedVendor(vendors, activeVendorText) ??
    lastNamedVendor(vendors, context) ??
    vendors[0];
  const drinks = vendor.items.filter((i) => DRINK_NAME_RE.test(i.name));
  if (!drinks.length) return null;

  // Safety net: if the prompt actually names a FOOD item on this vendor's menu,
  // it's NOT drink-only — bail so buildEats handles the full order (drink + food).
  if (matchVendorItems(vendor, prompt).some((i) => !DRINK_NAME_RE.test(i.name))) return null;

  // Deterministic match against the vendor's drinks only — never a dish.
  const lines = matchVendorItems({ ...vendor, items: drinks }, prompt);
  if (lines.length) {
    const subtotal = lines.reduce((s, i) => s + i.price * i.qty, 0);
    return {
      kind: 'drafts',
      drafts: [
        {
          marketplace: 'eats',
          refId: vendor.id,
          title: vendor.name,
          subtitle: [vendor.cuisine, vendor.city].filter(Boolean).join(' · '),
          image: vendor.image,
          items: lines,
          total: subtotal + vendor.deliveryFee,
          currency: 'MAD',
        },
      ],
    };
  }

  // Generic "a drink" → ask which one, showing the real drinks on the menu.
  return {
    kind: 'clarify',
    clarify: {
      question: `Sure — which drink would you like from ${vendor.name}?`,
      options: drinks.slice(0, 6).map((d) => `Order a ${d.name} from ${vendor.name}`),
    },
  };
}

/**
 * Offer up to 6 one-tap drink/side upsells (drinks first) when the order has food
 * but no drink/side yet — so the agent can ask "want a drink with that?". Returns
 * undefined when the order already includes a supplement or the vendor has none.
 */
function suggestSupplements(vendor: FoodVendor, items: EatsLine[]): { menuItemId: string; name: string; price: number }[] | undefined {
  if (items.some((i) => SUPPLEMENT_NAME_RE.test(i.name))) return undefined;
  const ordered = new Set(items.map((i) => i.menuItemId));
  const opts = vendor.items
    .filter((mi) => SUPPLEMENT_NAME_RE.test(mi.name) && !ordered.has(mi.id))
    .sort((a, b) => (DRINK_NAME_RE.test(b.name) ? 1 : 0) - (DRINK_NAME_RE.test(a.name) ? 1 : 0))
    .slice(0, 6)
    .map((mi) => ({ menuItemId: mi.id, name: mi.name, price: mi.price }));
  return opts.length ? opts : undefined;
}

interface EatsLine {
  menuItemId: string;
  name: string;
  qty: number;
  price: number;
}

// Drinks the user might ask for. Used to detect an unavailable requested item
// and to find a sensible on-menu substitute.
const DRINKS = ['coke', 'cola', 'coca', 'pepsi', 'fanta', 'sprite', 'soda', 'soft drink', 'drink', 'lemonade', 'water', 'juice', 'smoothie', 'iced tea', 'mint tea', 'tea', 'coffee'];

// Words that refer to the same on-menu drink — so a requested "coke" is treated
// as present when the menu/order has "Coca-Cola" (which contains "cola").
const DRINK_SYNONYMS: Record<string, string[]> = {
  coke: ['coke', 'coca', 'cola'],
  coca: ['coca', 'cola', 'coke'],
  cola: ['cola', 'coca'],
  pepsi: ['pepsi', 'cola'],
  soda: ['soda', 'cola', 'sprite', 'fanta'],
};

// Any side OR drink a kitchen carries — used to offer a one-tap upsell when the
// order has food but no drink/side, and to know when not to bother (already has one).
const SUPPLEMENT_NAME_RE = /\b(coca|coke|cola|pepsi|sprite|fanta|hawai|soda|water|juice|lemonade|mojito|latte|smoothie|fries|onion rings?|garlic bread|milkshake|mint tea|iced tea)\b/i;
// Drinks specifically — so the upsell leads with drinks before sides.
const DRINK_NAME_RE = /\b(coca|coke|cola|pepsi|sprite|fanta|hawai|soda|water|juice|lemonade|mojito|latte|smoothie|milkshake|tea)\b/i;

/**
 * Compare what the user concretely asked for against what got ordered + what the
 * vendor carries. For a requested item the menu lacks: substitute an available
 * drink if the missing item is a drink, else add a note so it's never silently dropped.
 */
function reconcileEats(prompt: string, vendor: FoodVendor, items: EatsLine[]): { items: EatsLine[]; note?: string } {
  const lower = prompt.toLowerCase();
  const orderedNames = items.map((i) => i.name.toLowerCase());
  const menuNames = vendor.items.map((m) => m.name.toLowerCase());

  // Dishes are matched at the FAMILY level so "pizza" is satisfied by ordering a
  // "Pepperoni" (both map to the pizza family) — avoids false "not on the menu".
  const missingDishes = DISH_FAMILIES.filter(
    (f) => f.re.test(lower) && !orderedNames.some((n) => f.re.test(n)) && !menuNames.some((n) => f.re.test(n)),
  ).map((f) => f.label);

  // Drinks are matched by the specific word the user used (coke, water, …),
  // but resolved through synonyms so "coke" is satisfied by a menu "Coca-Cola".
  const reqDrinks = DRINKS.filter((d) => new RegExp(`\\b${d.replace(/\s+/g, '\\s+')}\\b`, 'i').test(lower));
  const drinkPresent = (d: string, names: string[]): boolean =>
    (DRINK_SYNONYMS[d] ?? [d]).some((syn) => names.some((n) => n.includes(syn)));
  const missingDrinks = reqDrinks.filter((d) => !drinkPresent(d, orderedNames) && !drinkPresent(d, menuNames));

  if (!missingDishes.length && !missingDrinks.length) return { items };

  // A missing drink (and no missing dish) → substitute an available vendor drink.
  if (missingDrinks.length && !missingDishes.length) {
    const sub = vendor.items.find(
      (mi) => DRINKS.some((d) => mi.name.toLowerCase().includes(d)) && !orderedNames.includes(mi.name.toLowerCase()),
    );
    if (sub) {
      return {
        items: [...items, { menuItemId: sub.id, name: sub.name, qty: 1, price: sub.price }],
        note: `${cap(missingDrinks[0])} isn't on ${vendor.name}'s menu — I added ${sub.name} instead. Say the word if you'd rather skip it.`,
      };
    }
  }

  const missing = [...missingDishes, ...missingDrinks];
  const list = missing.map(cap).join(' and ');
  const plural = missing.length > 1;
  return {
    items,
    note: `Heads up — ${list} ${plural ? "aren't" : "isn't"} on ${vendor.name}'s menu, so I left ${plural ? 'them' : 'it'} off. Want me to find a place that has ${plural ? 'them' : 'it'}?`,
  };
}

// Generic stay-type words, ignored when matching a listing by its distinctive name.
const STAY_TYPE_WORDS = /^(riads?|villas?|apartments?|appartements?|studios?|hotels?|h[oô]tels?|lofts?|guesthouses?|houses?|home|rooms?|suites?|stay|place|the|a|an|that|this)$/i;

/** Find the listing the user named by title ("the Medina Guesthouse", "Riad Zitoun"),
 *  matching the full title or any distinctive (non-type) title word. */
function matchNamedListing(listings: StayListing[], text: string): StayListing | undefined {
  const lp = ` ${text.toLowerCase()} `;
  let best: StayListing | undefined;
  let score = 0;
  for (const l of listings) {
    const title = l.title.toLowerCase();
    if (lp.includes(title)) return l; // full title named
    let s = 0;
    for (const w of title.split(/\s+/)) {
      if (w.length >= 4 && !STAY_TYPE_WORDS.test(w) && lp.includes(` ${w} `)) s += 1;
    }
    if (s > score) {
      score = s;
      best = l;
    }
  }
  return score >= 1 ? best : undefined;
}

async function buildStay(provider: AIProvider, tools: ToolsService, prompt: string, context: string, city?: string): Promise<BuildResult> {
  const combined = `${context}\n${prompt}`;
  const maxPrice = num(prompt, /(?:under|below|max|less than|moins de)\s*(\d{2,5})/i) ?? num(prompt, /(\d{2,5})\s*mad/i);
  // parseGuests handles "1 guest" (singular), word-numbers, and "me and my wife".
  const guests = parseGuests(prompt) ?? parseGuests(combined) ?? 2;
  // Understands "for a week" (7), "two weeks" (14), "5 nights", "3 days", and
  // word-numbers — not just a bare "N nights" (which defaulted "a week" to 2).
  const nights = parseStayNights(prompt) ?? parseStayNights(combined) ?? 2;

  const res = await tools.getStaysResult(city, maxPrice, guests);
  if (!res.ok) return { unavailable: 'stays' };
  const listings = res.items;
  if (!listings.length) return null;

  // Deterministic first: if the user named a specific stay ("book the Medina
  // Guesthouse", "the Riad Zitoun"), match it by title before asking the LLM —
  // exact + reliable, so a named listing is never missed.
  let chosen = matchNamedListing(listings, prompt) ?? matchNamedListing(listings, context);
  if (!chosen) {
    const candidates = listings.slice(0, 12).map((l) => ({
      listingId: l.id,
      title: l.title,
      type: (l as StayListing).neighborhood,
      pricePerNight: l.pricePerNight,
      maxGuests: l.maxGuests,
    }));
    const system =
      'You pick ONE stay from OMNIA Stays that best matches what the user wants (type, area, price, guests). ' +
      'Use the CONVERSATION to resolve references like "the cheapest one", "that riad", or "the first one". "cheapest" → lowest pricePerNight. ' +
      'Return ONLY JSON: {"listingId":"..."}. If none fit, return {"listingId":null}.';
    const user = `Conversation so far:\n${context || '(none)'}\n\nListings (JSON):\n${JSON.stringify(candidates)}\n\nLatest user request: "${prompt}"\nReturn the choice JSON now.`;

    const parsed = parseJson<{ listingId: string | null }>(await safeComplete(provider, system, user));
    chosen = (listings.find((l) => l.id === parsed?.listingId) ?? listings[0]) as StayListing;
  }

  return {
    draft: {
      marketplace: 'stays',
      refId: chosen.id,
      title: chosen.title,
      subtitle: [chosen.neighborhood, chosen.city].filter(Boolean).join(' · '),
      image: chosen.images?.[0],
      nights,
      guests,
      total: chosen.pricePerNight * nights,
      currency: 'MAD',
    },
  };
}

/** Assemble a single ride booking from "book me a comfort ride to the airport". */
async function buildRide(tools: ToolsService, prompt: string, city?: string): Promise<BuildResult> {
  const res = await tools.getRidesResult(city);
  if (!res.ok) return { unavailable: 'rides' };
  const rides = res.items;
  if (!rides.length) return null;

  const chosen = pickRideClass(rides, prompt);
  const distanceKm = num(prompt, /(\d{1,3})\s*km/i) ?? 8;
  const minutes = Math.max(5, Math.round(distanceKm * 2.2));
  const { pickup, dropoff } = parseEndpoints(prompt, chosen.city);

  return {
    draft: {
      marketplace: 'rides',
      refId: chosen.id,
      title: chosen.name,
      subtitle: [chosen.vehicle, chosen.city].filter(Boolean).join(' · '),
      image: chosen.image,
      pickup,
      dropoff,
      distanceKm,
      minutes,
      rideOptions: buildRideOptions(rides, distanceKm, minutes),
      total: computeFare(chosen, distanceKm, minutes),
      currency: 'MAD',
    },
  };
}

/** Fare for a ride tier over a given trip — base + per-km + per-min. */
function computeFare(r: RideClass, distanceKm: number, minutes: number): number {
  return Math.round(r.baseFare + r.perKm * distanceKm + r.perMin * minutes);
}

/** All ride tiers priced for the SAME trip, cheapest first — lets the UI switch tier. */
function buildRideOptions(rides: RideClass[], distanceKm: number, minutes: number): RideOption[] {
  return rides
    .map((r) => ({
      refId: r.id,
      name: r.name,
      vehicle: r.vehicle,
      total: computeFare(r, distanceKm, minutes),
      baseFare: r.baseFare,
      perKm: r.perKm,
      perMin: r.perMin,
    }))
    .sort((a, b) => a.total - b.total);
}

const MEALS_PER_DAY = 3;

const WORD_NUM: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

/** Parse the party size if the user stated it — digits ("4 guests", "1 guest",
 *  "we are 4"), word-numbers ("for two", "three of us"), or phrases ("just me",
 *  "me and my wife"). Returns undefined when no party size is stated. */
function parseGuests(t: string): number | undefined {
  const digits =
    num(t, /(\d{1,2})\s*(?:people|guests?|persons?|adults?|pax|personnes|travel(?:l)?ers?|invit\w*)/i) ??
    num(t, /\b(?:we(?:'re| are)|party of|group of)\s*(\d{1,2})\b/i) ??
    // "for 2" (digit) — but NOT "for 3 days/nights" or "for 3000 dirhams".
    num(t, /\bfor\s+(\d{1,2})\b(?!\s*(?:days?|nights?|weeks?|hours?|mad|dh|dirhams?|euros?|dollars?))/i);
  if (digits != null) return digits;

  const lower = t.toLowerCase();
  const w =
    lower.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*(?:people|guests?|persons?|adults?|of us)\b/) ||
    lower.match(/\bfor\s+(one|two|three|four|five|six|seven|eight|nine|ten)\b(?!\s+(?:days?|nights?|weeks?|hours?))/);
  if (w) return WORD_NUM[w[1]];
  if (/\b(just me|only me|by myself|myself|solo|on my own|alone)\b/.test(lower)) return 1;
  if (/\bme\s+(?:and|&|\+)\s+my\s+(?:wife|husband|partner|girlfriend|boyfriend|spouse|fianc[ée]e?)\b/.test(lower)) return 2;
  if (/\bmy\s+(?:wife|husband|partner)\s+and\s+(?:i|me)\b/.test(lower)) return 2;
  if (/\b(?:a couple|as a couple)\b/.test(lower)) return 2;
  return undefined;
}
function parseDays(t: string): number | undefined {
  // [\s-]* so a hyphenated "3-day trip" parses the same as "3 day trip".
  const d = num(t, /(\d{1,2})[\s-]*(?:days?|jours?)\b/i);
  if (d != null) return d;
  const w = t.toLowerCase().match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)[\s-]*(?:days?|jours?)\b/);
  return w ? WORD_NUM[w[1]] : undefined;
}
function parseNights(t: string): number | undefined {
  const d = num(t, /(\d{1,2})[\s-]*(?:nights?|nuits?)\b/i);
  if (d != null) return d;
  const w = t.toLowerCase().match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)[\s-]*(?:nights?|nuits?)\b/);
  return w ? WORD_NUM[w[1]] : undefined;
}
/** Parse a duration given in weeks: "a week"→1, "two weeks"→2, "3 weeks"→3,
 *  "a fortnight"→2. Returns the number of WEEKS (callers ×7 for nights). */
function parseWeeks(t: string): number | undefined {
  if (/\bfortnight\b/i.test(t)) return 2;
  const d = num(t, /(\d{1,2})[\s-]*weeks?\b/i);
  if (d != null) return d;
  const w = t.toLowerCase().match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)[\s-]*weeks?\b/);
  if (w) return WORD_NUM[w[1]];
  if (/\ba\s+week\b/i.test(t)) return 1;
  return undefined;
}
/** Nights for a single stay: weeks→×7, else nights, else days (a "7-day stay"
 *  reads as 7 nights conversationally). Undefined when no duration is stated. */
function parseStayNights(t: string): number | undefined {
  const weeks = parseWeeks(t);
  if (weeks != null) return weeks * 7;
  return parseNights(t) ?? parseDays(t);
}
function parseBudget(t: string): number | undefined {
  return (
    num(t, /(?:under|below|max|less than|budget of|up to|moins de)\s*(\d{3,6})/i) ??
    num(t, /(\d{3,6})\s*(?:mad|dh|dirhams?)\b/i)
  );
}

/**
 * Reconstruct the effective trip request — the original TRIP message plus any
 * short answers the user has since given to our questions. Returns null when
 * this message isn't a trip request or an answer to one.
 */
function gatherTrip(prompt: string, history: ChatMessage[]): string | null {
  // A re-stated request (e.g. a tapped chip) is self-contained.
  if (TRIP.test(prompt)) return prompt;

  // Typed answer path: only if we just asked a trip question and have the
  // original request in history.
  const meaningful = history.filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content.trim().length > 0);
  const lastAssistant = [...meaningful].reverse().find((m) => m.role === 'assistant')?.content ?? '';
  if (!/how many (guests|nights)/i.test(lastAssistant)) return null;

  let tripIdx = -1;
  for (let i = meaningful.length - 1; i >= 0; i--) {
    if (meaningful[i].role === 'user' && TRIP.test(meaningful[i].content)) {
      tripIdx = i;
      break;
    }
  }
  if (tripIdx === -1) return null;

  const userMsgs = meaningful.slice(tripIdx).filter((m) => m.role === 'user').map((m) => m.content);
  if (userMsgs[userMsgs.length - 1] === prompt) userMsgs.pop(); // drop the (unexpanded) current msg
  return [...userMsgs, expandBareAnswer(prompt, lastAssistant)].join(' ');
}

/** Turn a bare number reply into the right unit based on the question we asked. */
function expandBareAnswer(prompt: string, lastAssistant: string): string {
  if (!/^\d{1,2}$/.test(prompt.trim())) return prompt;
  if (/how many nights/i.test(lastAssistant)) return `${prompt} nights`;
  if (/how many guests/i.test(lastAssistant)) return `${prompt} guests`;
  return prompt;
}

/** Ask for whatever the trip is still missing (party size first, then nights). */
function missingTripInfo(text: string): ClarifyRequest | null {
  if (parseGuests(text) == null) return buildTripClarify(text, 'guests');
  if (parseNights(text) == null && parseDays(text) == null && parseWeeks(text) == null) return buildTripClarify(text, 'nights');
  return null;
}

function buildTripClarify(base: string, field: 'guests' | 'nights'): ClarifyRequest {
  // Strip any guest/night qualifier we already appended so re-asks never stack
  // (e.g. avoid "...for 1 guest for 1 guest").
  const b = base.trim().replace(/\s+/g, ' ').replace(/\s*\bfor\s+\d{1,2}\s+(?:guests?|nights?)\b/gi, '').trim();
  if (field === 'guests') {
    return {
      question: 'How many guests are travelling? Home prices and how much food to order both depend on it.',
      options: [1, 2, 4, 6].map((n) => `${b} for ${n} ${n === 1 ? 'guest' : 'guests'}`),
    };
  }
  return {
    question: 'How many nights should the trip be? It sets the stay length and how much food to order.',
    options: [2, 3, 5, 7].map((n) => `${b} for ${n} nights`),
  };
}

/**
 * Build a full-trip receipt — a stay + enough food + a ride — honouring the
 * stated duration, party size, and total budget (a hard cap when given).
 *   • nights  = explicit nights, else days
 *   • food    = MEALS_PER_DAY × days × guests servings (capped to the budget)
 *   • budget  = stay ≤ ~55%, ride small, food = whatever's left
 */
async function buildTrip(
  tools: ToolsService,
  prompt: string,
  location?: UserLocation,
  guestsOverride?: number,
): Promise<{ drafts: CheckoutDraft[]; plan?: TripPlan }> {
  const city = extractCity(prompt) ?? matchCity(location?.city ?? '') ?? location?.city;
  const guests = guestsOverride ?? parseGuests(prompt) ?? 2;
  // "a week"/"two weeks" set both day and night counts (7/14…) so a week-long
  // trip isn't quietly truncated to the 2-night default.
  const weeks = parseWeeks(prompt);
  const explicitDays = parseDays(prompt) ?? (weeks != null ? weeks * 7 : undefined);
  const explicitNights = parseNights(prompt) ?? (weeks != null ? weeks * 7 : undefined);
  const days = explicitDays ?? explicitNights ?? 2;
  // "6 days" → 5 nights (arrive day 1, leave day 6). An explicit nights count wins.
  const nights = explicitNights ?? (explicitDays != null ? Math.max(1, explicitDays - 1) : days);
  const budget = parseBudget(prompt);

  const [stays, vendors, rides] = await Promise.all([
    tools.getStays(city, undefined, guests),
    tools.getEatsVendors(city),
    tools.getRides(city),
  ]);
  const drafts: CheckoutDraft[] = [];

  // Budget allocation: stay gets the lion's share, ride a sliver, food the rest.
  const stayAlloc = budget ? Math.round(budget * 0.55) : undefined;

  // ── Stay ──
  const stay = chooseStay(stays, guests, nights, stayAlloc);
  let stayTotal = 0;
  let stayDraft: CheckoutDraft | undefined;
  if (stay) {
    stayTotal = stay.pricePerNight * nights;
    stayDraft = {
      marketplace: 'stays',
      refId: stay.id,
      title: stay.title,
      subtitle: [stay.neighborhood, stay.city].filter(Boolean).join(' · '),
      image: stay.images?.[0],
      nights,
      guests,
      total: stayTotal,
      currency: 'MAD',
    };
    drafts.push(stayDraft);
  }

  // ── Ride ──
  let rideTotal = 0;
  let rideDraft: CheckoutDraft | undefined;
  if (rides.length) {
    const r = pickRideClass(rides, prompt);
    const distanceKm = 12;
    const minutes = Math.max(5, Math.round(distanceKm * 2.2));
    rideTotal = computeFare(r, distanceKm, minutes);
    rideDraft = {
      marketplace: 'rides',
      refId: r.id,
      title: r.name,
      subtitle: [r.vehicle, r.city].filter(Boolean).join(' · '),
      image: r.image,
      pickup: 'Airport pickup',
      dropoff: `${city ?? 'City'} centre`,
      distanceKm,
      minutes,
      rideOptions: buildRideOptions(rides, distanceKm, minutes),
      total: rideTotal,
      currency: 'MAD',
    };
    drafts.push(rideDraft);
  }

  // ── Food: enough for the whole party for the whole trip, within the budget ──
  const foodAlloc = budget != null ? Math.max(0, budget - stayTotal - rideTotal) : undefined;
  const food = buildTripFood(vendors, days, guests, foodAlloc);
  if (food) drafts.push(food);

  const plan = buildTripPlan({ city, nights, guests, days, budget, stayDraft, rideDraft, food, stayTotal, rideTotal });
  return { drafts, plan };
}

interface TripPlanInput {
  city?: string;
  nights: number;
  guests: number;
  days: number;
  budget?: number;
  stayDraft?: CheckoutDraft;
  rideDraft?: CheckoutDraft;
  food: CheckoutDraft | null;
  stayTotal: number;
  rideTotal: number;
}

/** Assemble the day-by-day itinerary + budget breakdown shown next to the receipt. */
function buildTripPlan(i: TripPlanInput): TripPlan {
  const dayCount = Math.max(i.nights, i.days, 1);
  // Order dishes by price so breakfast gets a lighter/cheaper item and dinner the
  // heaviest — a "Breakfast · Lamb Tagine" reads wrong; "Breakfast · Fresh Juice" doesn't.
  const sorted = [...(i.food?.items ?? [])].sort((a, b) => a.price - b.price).map((it) => it.name);
  const cheap = sorted.slice(0, Math.max(1, Math.ceil(sorted.length / 2)));
  const pricey = sorted.slice(Math.floor(sorted.length / 2));

  const days: ItineraryDay[] = [];
  for (let d = 0; d < dayCount; d++) {
    const meals = sorted.length
      ? [
          `Breakfast · ${cheap[d % cheap.length]}`,
          `Lunch · ${sorted[(d + 1) % sorted.length]}`,
          `Dinner · ${pricey[d % pricey.length]}`,
        ]
      : [];
    days.push({
      day: d + 1,
      title: d === 0 ? 'Arrival' : d === dayCount - 1 ? 'Departure' : `Day ${d + 1}`,
      stay: i.stayDraft?.title,
      ride: d === 0 && i.rideDraft ? `${i.rideDraft.pickup} → ${i.rideDraft.dropoff}` : undefined,
      meals,
    });
  }

  const foodTotal = i.food?.total ?? 0;
  const total = i.stayTotal + i.rideTotal + foodTotal;
  return {
    city: i.city,
    nights: i.nights,
    guests: i.guests,
    days,
    budget: {
      stay: i.stayTotal,
      ride: i.rideTotal,
      food: foodTotal,
      total,
      budget: i.budget,
      remaining: i.budget != null ? i.budget - total : undefined,
      overBudget: i.budget != null && total > i.budget,
    },
  };
}

/** Pick a stay that sleeps the party, the priciest that fits the budget, else cheapest. */
function chooseStay(stays: StayListing[], guests: number, nights: number, stayAlloc?: number): StayListing | undefined {
  const fit = stays.filter((l) => (l.maxGuests ?? 1) >= guests);
  const pool = fit.length ? fit : stays;
  if (!pool.length) return undefined;
  if (stayAlloc != null) {
    const within = pool
      .filter((l) => l.pricePerNight * nights <= stayAlloc)
      .sort((a, b) => b.pricePerNight - a.pricePerNight);
    if (within.length) return within[0];
    return [...pool].sort((a, b) => a.pricePerNight - b.pricePerNight)[0]; // none fit → cheapest
  }
  return pool[0];
}

/**
 * Order food sized to MEALS_PER_DAY × days × guests, spread across the vendor's
 * menu for variety. When a budget is given, scale quantities down to fit it.
 */
function buildTripFood(vendors: FoodVendor[], days: number, guests: number, foodAlloc?: number): CheckoutDraft | null {
  const vendor = vendors.find((v) => v.items && v.items.length);
  if (!vendor) return null;
  // Meals must be real dishes — never let a cheap soda/water/fries become a
  // "Breakfast" slot (every vendor now carries drinks/sides as supplements).
  const mains = vendor.items.filter((i) => !SUPPLEMENT_NAME_RE.test(i.name));
  const menu = [...(mains.length ? mains : vendor.items)].sort((a, b) => a.price - b.price);

  const totalMeals = MEALS_PER_DAY * days; // distinct meal-slots across the trip
  const mealCount = new Map<string, number>();
  for (let m = 0; m < totalMeals; m++) {
    const it = menu[m % menu.length];
    mealCount.set(it.id, (mealCount.get(it.id) ?? 0) + 1);
  }

  let items = [...mealCount.entries()].map(([id, slots]) => {
    const it = menu.find((x) => x.id === id)!;
    return { menuItemId: id, name: it.name, qty: slots * guests, price: it.price };
  });
  let subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  // Budget cap: scale every line down proportionally, then trim if still over.
  if (foodAlloc != null) {
    const cap = Math.max(0, foodAlloc - vendor.deliveryFee);
    if (subtotal > cap && subtotal > 0) {
      const scale = cap / subtotal;
      items = items.map((i) => ({ ...i, qty: Math.max(1, Math.floor(i.qty * scale)) }));
      subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
      items.sort((a, b) => b.price * b.qty - a.price * a.qty);
      while (subtotal + vendor.deliveryFee > foodAlloc && items.length > 1) {
        const removed = items.shift()!;
        subtotal -= removed.price * removed.qty;
      }
    }
  }
  if (!items.length) return null;

  return {
    marketplace: 'eats',
    refId: vendor.id,
    title: vendor.name,
    subtitle: [vendor.cuisine, vendor.city].filter(Boolean).join(' · '),
    image: vendor.image,
    items,
    total: subtotal + vendor.deliveryFee,
    currency: 'MAD',
  };
}

/** Choose a ride tier from the prompt's hints, defaulting to Economy (cheapest). */
function pickRideClass(rides: RideClass[], prompt: string): RideClass {
  const byName = (kw: RegExp) => rides.find((r) => kw.test(r.name) || kw.test(r.vehicle));
  if (/\b(elite|porsche|flagship|best|top|sport|fastest|cayenne)\b/i.test(prompt)) return byName(/elite|porsche/i) ?? rides[rides.length - 1];
  if (/\b(luxury|lux|bmw|x6)\b/i.test(prompt)) return byName(/luxury|bmw/i) ?? rides[rides.length - 1];
  if (/\b(prestige|premium|executive|business|black|mercedes|glc|vip)\b/i.test(prompt)) return byName(/prestige|mercedes/i) ?? rides[rides.length - 1];
  if (/\b(suv|xl|van|group|six|6|family|luggage|big|tucson)\b/i.test(prompt)) return byName(/suv|tucson/i) ?? rides[rides.length - 1];
  if (/\b(city|peugeot|208|comfort)\b/i.test(prompt)) return byName(/city|peugeot/i) ?? rides[0];
  // cheapest / economy / moto-legacy / default
  return byName(/economy|sandero/i) ?? rides[0];
}

/**
 * Split "from X to Y" cleanly. The captured place ends at the next clause
 * boundary — the other marker (" to " / " from "), a comma, or a trailing
 * "..., about 12 km" — so the pickup never bleeds into the dropoff.
 *   "from Rabat Agdal station to Rabat airport, about 12 km"
 *     → pickup "Rabat Agdal station", dropoff "Rabat airport"
 */
function parseEndpoints(prompt: string, city: string): { pickup: string; dropoff: string } {
  const isAirport = /\bairport\b/i.test(prompt);

  const grab = (marker: RegExp, stop: RegExp): string | undefined => {
    const m = prompt.match(marker);
    if (!m || m.index == null) return undefined;
    const rest = prompt.slice(m.index + m[0].length);
    const cut = rest.search(stop);
    const raw = (cut >= 0 ? rest.slice(0, cut) : rest).replace(/^(the|a|my|our)\s+/i, '').trim();
    const val = raw.replace(/\s+(please|now|thanks|thank you)$/i, '').trim();
    return val.length >= 2 ? val : undefined;
  };

  // Pickup stops before the destination marker; dropoff stops before an origin
  // marker. Both stop at punctuation and at a trailing distance ("about 12 km").
  const DIST = /(?:about|around|approximately|roughly)\b|~?\d/;
  const from = grab(/\bfrom\s+/i, new RegExp(`\\s+to\\b|\\s+towards?\\b|\\s+then\\b|[,;.!?]|\\s+${DIST.source}`, 'i'));
  const to = grab(/\b(?:to|towards?)\s+/i, new RegExp(`\\s+from\\b|[,;.!?]|\\s+${DIST.source}`, 'i'));

  const pickup = from ? cap(from) : 'Current location';
  const dropoff = to ? cap(to) : isAirport ? 'Airport' : `${city} centre`;
  return { pickup, dropoff };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function safeComplete(provider: AIProvider, system: string, user: string): Promise<string> {
  try {
    return await provider.complete(system, user);
  } catch (err) {
    logger.warn(`complete() failed: ${(err as Error).message}`);
    return '';
  }
}

function parseJson<T>(text: string): T | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(body.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

const DISHES = [
  'tajine', 'tagine', 'couscous', 'pastilla', 'harira', 'burger', 'cheeseburger', 'smash', 'pizza',
  'margherita', 'pepperoni', 'sushi', 'salmon', 'tuna', 'teriyaki', 'poke', 'salad', 'pasta', 'tiramisu',
];

/** Find the dish the user referenced (most recent match), if any. */
function detectDish(text: string): string | undefined {
  if (!text) return undefined;
  const lower = text.toLowerCase();
  let best: { dish: string; idx: number } | undefined;
  for (const d of DISHES) {
    const idx = lower.lastIndexOf(d);
    if (idx !== -1 && (!best || idx > best.idx)) best = { dish: d === 'tagine' ? 'tajine' : d, idx };
  }
  return best?.dish;
}

// Dish families for ambiguity detection — variants of one dish collapse to a
// single choice (margherita/pepperoni → "pizza") so we only ask when genuinely
// DIFFERENT dishes were discussed, not when two pizzas were listed.
const DISH_FAMILIES: { re: RegExp; label: string }[] = [
  { re: /\btajines?\b|\btagines?\b/i, label: 'tajine' },
  { re: /\bcouscous\b/i, label: 'couscous' },
  { re: /\bpastillas?\b/i, label: 'pastilla' },
  { re: /\bharira\b/i, label: 'harira' },
  { re: /\b(cheese)?burgers?\b|\bsmash\b/i, label: 'burger' },
  { re: /\bpizzas?\b|\bmargheritas?\b|\bpepperoni\b/i, label: 'pizza' },
  { re: /\bsushi\b|\bpoke\b|\bsalmon\b|\btuna\b|\bteriyaki\b/i, label: 'sushi' },
  { re: /\bsalads?\b/i, label: 'salad' },
  { re: /\bpastas?\b/i, label: 'pasta' },
  { re: /\btiramisu\b/i, label: 'tiramisu' },
];

const STAY_TYPES: { re: RegExp; label: string }[] = [
  { re: /\briads?\b/i, label: 'riad' },
  { re: /\b(apartments?|appartements?)\b/i, label: 'apartment' },
  { re: /\bvillas?\b/i, label: 'villa' },
  { re: /\bstudios?\b/i, label: 'studio' },
  { re: /\b(hotels?|hôtels?)\b/i, label: 'hotel' },
  { re: /\blofts?\b/i, label: 'loft' },
  { re: /\bguest ?houses?\b/i, label: 'guesthouse' },
];

/** Distinct dish families present in the text, in first-seen order. */
function distinctDishes(text: string): string[] {
  return distinctMatches(text, DISH_FAMILIES);
}

/** Distinct stay types present in the text, in first-seen order. */
function distinctStayTypes(text: string): string[] {
  return distinctMatches(text, STAY_TYPES);
}

function distinctMatches(text: string, table: { re: RegExp; label: string }[]): string[] {
  if (!text) return [];
  const found: string[] = [];
  for (const { re, label } of table) {
    if (re.test(text) && !found.includes(label)) found.push(label);
  }
  return found;
}

function num(text: string, re: RegExp): number | undefined {
  const m = text.match(re);
  return m ? parseInt(m[1], 10) : undefined;
}
function clampQty(q: number): number {
  return Math.max(1, Math.min(20, Math.round(q || 1)));
}
