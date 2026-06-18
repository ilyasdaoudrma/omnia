import { Logger } from '@nestjs/common';
import type { ToolsService } from '../tools/tools.service';
import type {
  AccountBooking,
  AccountOrder,
  AccountRide,
  AccountSnapshot,
  CheckoutDraft,
  ManageAction,
  UserLocation,
} from '../ai/agent.types';

const logger = new Logger('ManageBuilder');

const CANCEL = /\b(cancel|annule|annuler|call (it )?off|scrap|drop)\b/i;
const REORDER =
  /\b(re-?order|order (it )?again|order the same|same (thing )?again|same as (last|before)|my usual|the usual|encore la m[êe]me|la m[êe]me chose)\b/i;
// A verb that signals changing an existing item (not creating a new one).
const MODIFY_VERB = /\b(change|update|modify|edit|make|set|extend|shorten|switch|move|increase|reduce|push|bump)\b/i;

// Explicit references to an item the user already has ("my booking", "this order").
const STAY_POSSESSIVE = /\b(my|this|that)\b[\s\S]{0,40}\b(booking|stay|reservation|trip|riad|apartment|villa|studio|hotel|loft|guesthouse|room)\b/i;
const ORDER_POSSESSIVE = /\b(my|this|that)\b[\s\S]{0,30}\b(order|meal|food)\b/i;

// Item edits to an existing order: "add a mint tea to my order", "make it 2 tagines".
const EDIT_TRIGGER = /\b(add|remove|drop|delete|extra|another|one more|swap)\b/i;
const ADD_TO_ORDER = /\b(add|put|include|throw in)\b[\s\S]{0,40}\bto (my|the|this) (order|meal|cart)\b/i;
const MAKE_IT = /\bmake it\b/i;

const EATS_HINT = /\b(order|meal|food|dish|eat|tajine|tagine|pizza|burger|sushi|couscous|tea|drink)\b/i;
const STAY_HINT = /\b(booking|reservation|stay|trip|riad|apartment|villa|studio|hotel|loft|guesthouse|room|nights?)\b/i;

// Ride management. "trip" is intentionally excluded (too stay-ambiguous).
const RIDE_HINT = /\b(ride|taxi|cab|driver|chauffeur|car|pick-?up|pickup|drop-?off|dropoff)\b/i;
const AGAIN = /\b(again|same|usual|previous|last (one|ride|time)|re-?book|re-?order)\b/i;
const RIDE_PICKUP_CHANGE = /\b(change|update|set|move|switch)\b[\s\S]{0,30}\b(pick-?up|pickup)\b/i;
const RIDE_DROPOFF_CHANGE = /\b(change|update|set|move|switch)\b[\s\S]{0,30}\b(drop-?off|dropoff|destination)\b/i;

/** What the manage path decided to do with an existing order/booking. */
export type ManageOutcome =
  | { kind: 'action'; action: ManageAction } // cancel / modify → needs a confirm tap
  | { kind: 'reorder'; drafts: CheckoutDraft[] } // rebuilt past order → reuse checkout flow
  | { kind: 'message'; text: string }; // nothing actionable — just answer

/**
 * Handles requests against EXISTING orders/bookings — cancel, modify a stay's
 * nights/guests, or reorder "my usual". Resolves the target against the user's
 * own account history (passed in from the client, which holds the Clerk token),
 * so matching is done on the user's real items, not guesses. Returns null when
 * the message isn't a manage request — the normal agent flow then takes over.
 */
export async function buildManage(
  tools: ToolsService,
  prompt: string,
  account: AccountSnapshot | undefined,
  location?: UserLocation,
): Promise<ManageOutcome | null> {
  const isReorder = REORDER.test(prompt);
  const isCancel = CANCEL.test(prompt);
  const isModify = MODIFY_VERB.test(prompt);
  const isEdit = EDIT_TRIGGER.test(prompt);

  // Ride intents: re-book the same ride, change pickup/dropoff, cancel a ride.
  const isRidePickup = RIDE_PICKUP_CHANGE.test(prompt);
  const isRideDropoff = RIDE_DROPOFF_CHANGE.test(prompt);
  const isRideReorder = RIDE_HINT.test(prompt) && AGAIN.test(prompt);
  const isRideManage = isRidePickup || isRideDropoff || isRideReorder;

  if (!isReorder && !isCancel && !isModify && !isEdit && !isRideManage) return null;

  const orders = account?.eatsOrders ?? [];
  const bookings = account?.stayBookings ?? [];
  const rides = account?.rideTrips ?? [];
  const activeOrders = orders.filter((o) => o.status !== 'cancelled');
  const activeBookings = bookings.filter((b) => b.status !== 'cancelled');
  const activeRides = rides.filter((r) => r.status !== 'cancelled' && r.status !== 'completed');

  // ── Ride management (re-book / change pickup-dropoff / cancel a ride) ─────
  // Ride phrasing routes here first so "cancel my ride" never hits the eats/stays path.
  if (isRideManage || (isCancel && RIDE_HINT.test(prompt))) {
    if (!rides.length) {
      return { kind: 'message', text: signedOutOrEmpty(account, "You don't have any rides yet — tell me where to and I'll book one.") };
    }

    if (isRideReorder) {
      const source = bestRide(rides, prompt).item ?? mostRecent(rides);
      const draft = source ? await reorderRideDraft(tools, source) : null;
      if (draft) return { kind: 'reorder', drafts: [draft] };
      return { kind: 'message', text: "I found your ride but couldn't rebuild it — want me to book a fresh one?" };
    }

    const target = bestRide(activeRides, prompt).item ?? mostRecent(activeRides);
    if (!target) return { kind: 'message', text: 'You have no active rides to change. Want me to book a new one?' };

    if (isCancel) return { kind: 'action', action: toCancelRideAction(target) };

    const newPickup = isRidePickup ? parseNewEndpoint(prompt, 'pickup') : undefined;
    const newDropoff = isRideDropoff ? parseNewEndpoint(prompt, 'dropoff') : undefined;
    if (!newPickup && !newDropoff) {
      return { kind: 'message', text: 'Tell me the new spot, e.g. "change my ride pickup to Rabat Agdal station" or "change my ride dropoff to the airport".' };
    }
    return {
      kind: 'action',
      action: {
        kind: 'modify',
        marketplace: 'rides',
        id: target.id,
        title: target.className ?? 'Your ride',
        subtitle: [target.vehicle, [target.pickup, target.dropoff].filter(Boolean).join(' → ')].filter(Boolean).join(' · '),
        currency: 'MAD',
        prevPickup: target.pickup,
        prevDropoff: target.dropoff,
        pickup: newPickup ?? target.pickup,
        dropoff: newDropoff ?? target.dropoff,
        newTotal: target.fare,
      },
    };
  }

  // ── Reorder / "my usual" ────────────────────────────────────────────────
  if (isReorder) {
    if (!orders.length) {
      return { kind: 'message', text: signedOutOrEmpty(account, "You don't have any past food orders yet — tell me what you're craving and I'll put it together.") };
    }
    // "Usual" = your habit, so ignore cancelled orders and favour the vendor you
    // order from most (not a one-off, recently-cancelled big order).
    const pool = orders.filter((o) => o.status !== 'cancelled');
    if (!pool.length) {
      return { kind: 'message', text: "Your only past orders were cancelled — tell me what you're craving and I'll put together a fresh one." };
    }
    // Prefer orders with a real dish so "usual" never resolves to a lone water/soda.
    const meals = pool.filter(isMeaningfulOrder);
    const usable = meals.length ? meals : pool;
    const isUsual = /\busual\b/i.test(prompt);
    const target = isUsual ? mostFrequentOrder(usable) : pickOrder(usable, prompt);
    if (!target) return { kind: 'message', text: "I couldn't find a past order to repeat — want me to build a fresh one?" };
    const draft = await reorderDraft(tools, target, location);
    if (!draft) {
      return { kind: 'message', text: `I found your order from ${target.vendorName ?? 'that place'}, but its menu has changed and I couldn't rebuild it exactly. Want me to find something similar?` };
    }
    return { kind: 'reorder', drafts: [draft] };
  }

  // ── Cancel an order or booking ──────────────────────────────────────────
  if (isCancel) {
    if (!activeOrders.length && !activeBookings.length) {
      return { kind: 'message', text: signedOutOrEmpty(account, 'You have no active orders or bookings to cancel.') };
    }
    const target = chooseTarget(prompt, activeOrders, activeBookings);
    if (!target) return { kind: 'message', text: "I'm not sure which one to cancel — could you name the order or booking?" };
    return { kind: 'action', action: toCancelAction(target) };
  }

  // ── Modify a stay's nights / guests ─────────────────────────────────────
  // Only when the user clearly points at an EXISTING booking — by possessive
  // ("my riad booking") or by naming it — so we never hijack a new booking.
  // A follow-up adjustment like "make it 3 guests instead" / "2 nights now" points
  // at an existing booking even without a possessive — as long as it isn't creating
  // a NEW booking ("book a place for 3 guests"). Gated on a guests/nights count.
  const adjustsStayCount =
    !/\b(book|reserve|reservation|find|a place|somewhere)\b/i.test(prompt) &&
    /\b\d{1,2}\s*(guests?|people|persons?|adults?|nights?|nuits?)\b/i.test(prompt) &&
    /\b(make it|set it|change it|update it|instead|now|to \d)\b/i.test(prompt);
  const refsBooking = STAY_POSSESSIVE.test(prompt) || namedBooking(activeBookings, prompt) || adjustsStayCount;
  if (refsBooking && activeBookings.length) {
    const booking = bestBooking(activeBookings, prompt).item ?? mostRecent(activeBookings);
    if (!booking) return null;
    const nights = num(prompt, /(\d{1,2})\s*(nights?|nuits?)/i) ?? booking.nights ?? 1;
    const guests = num(prompt, /(\d{1,2})\s*(guests?|people|persons?|adults?|pax|personnes)/i) ?? booking.guests ?? 1;
    if (nights === booking.nights && guests === booking.guests) return null; // nothing actually changed

    const perNight = booking.nights ? Math.round((booking.total ?? 0) / booking.nights) : 0;
    return {
      kind: 'action',
      action: {
        kind: 'modify',
        marketplace: 'stays',
        id: booking.id,
        title: booking.title ?? 'Your stay',
        subtitle: booking.city,
        prevNights: booking.nights,
        prevGuests: booking.guests,
        prevTotal: booking.total,
        nights,
        guests,
        newTotal: perNight * nights,
        currency: 'MAD',
      },
    };
  }

  // Edit an existing food order's items: "add a mint tea to my order", "make it 2 tagines".
  const wantsOrderEdit =
    activeOrders.length > 0 &&
    (ADD_TO_ORDER.test(prompt) ||
      ORDER_POSSESSIVE.test(prompt) ||
      namedOrder(activeOrders, prompt) ||
      // "make it 2 tagines" / an edit verb: route here when there's only one order,
      // OR when the prompt clearly references an item in one of the user's orders.
      ((MAKE_IT.test(prompt) || isEdit) && (activeOrders.length === 1 || bestOrder(activeOrders, prompt).score > 0)));
  if (wantsOrderEdit) {
    const order = bestOrder(activeOrders, prompt).item ?? mostRecent(activeOrders);
    if (order) {
      const draft = await buildOrderEdit(tools, prompt, order, location);
      if (draft) return { kind: 'reorder', drafts: [draft] };
    }
    return { kind: 'message', text: 'I couldn\'t work out that change — try "add a mint tea to my order" or "make it 2 tagines".' };
  }

  return null; // a modify-ish word but no target we own — let the normal flow handle it
}

/** True when the prompt contains a booking's full title. */
function namedBooking(bookings: AccountBooking[], prompt: string): boolean {
  const lp = prompt.toLowerCase();
  return bookings.some((b) => b.title && lp.includes(b.title.toLowerCase()));
}

/** True when the prompt names an order's vendor or one of its items. */
function namedOrder(orders: AccountOrder[], prompt: string): boolean {
  const lp = prompt.toLowerCase();
  return orders.some(
    (o) =>
      (o.vendorName && lp.includes(o.vendorName.toLowerCase())) ||
      (o.items ?? []).some((i) => lp.includes(i.name.toLowerCase())),
  );
}

// ── Target resolution ──────────────────────────────────────────────────────

interface Target {
  marketplace: 'eats' | 'stays';
  order?: AccountOrder;
  booking?: AccountBooking;
}

function chooseTarget(prompt: string, orders: AccountOrder[], bookings: AccountBooking[]): Target | null {
  const o = bestOrder(orders, prompt);
  const b = bestBooking(bookings, prompt);

  // A named match wins; otherwise fall back to domain hints, then most recent.
  if (o.score > 0 || b.score > 0) {
    return o.score >= b.score && o.item
      ? { marketplace: 'eats', order: o.item }
      : { marketplace: 'stays', booking: b.item! };
  }
  if (STAY_HINT.test(prompt) && bookings.length) return { marketplace: 'stays', booking: mostRecent(bookings)! };
  if (EATS_HINT.test(prompt) && orders.length) return { marketplace: 'eats', order: mostRecent(orders)! };

  // No hint at all — only auto-pick if there's exactly one place it could mean.
  if (orders.length && !bookings.length) return { marketplace: 'eats', order: mostRecent(orders)! };
  if (bookings.length && !orders.length) return { marketplace: 'stays', booking: mostRecent(bookings)! };
  return null;
}

function pickOrder(orders: AccountOrder[], prompt: string): AccountOrder | undefined {
  const best = bestOrder(orders, prompt);
  return best.score > 0 ? best.item : mostRecent(orders);
}

/** The user's habitual order — most-ordered vendor (ties → most recent). */
function mostFrequentOrder(orders: AccountOrder[]): AccountOrder | undefined {
  if (!orders.length) return undefined;
  const key = (o: AccountOrder) => (o.vendorName ?? o.vendorId ?? '').toLowerCase();
  const counts = new Map<string, number>();
  for (const o of orders) counts.set(key(o), (counts.get(key(o)) ?? 0) + 1);
  let topKey = '';
  let top = 0;
  for (const [k, c] of counts) if (c > top) { top = c; topKey = k; }
  return mostRecent(orders.filter((o) => key(o) === topKey)) ?? mostRecent(orders);
}

function bestOrder(orders: AccountOrder[], prompt: string): { item?: AccountOrder; score: number } {
  let item: AccountOrder | undefined;
  let score = 0;
  for (const o of orders) {
    const s = orderScore(o, prompt);
    if (s > score) {
      score = s;
      item = o;
    }
  }
  return { item, score };
}

function bestBooking(bookings: AccountBooking[], prompt: string): { item?: AccountBooking; score: number } {
  let item: AccountBooking | undefined;
  let score = 0;
  for (const b of bookings) {
    const s = bookingScore(b, prompt);
    if (s > score) {
      score = s;
      item = b;
    }
  }
  return { item, score };
}

/** Score an order against the prompt using the user's REAL vendor + item names. */
function orderScore(o: AccountOrder, prompt: string): number {
  const lp = prompt.toLowerCase();
  let score = 0;
  if (o.vendorName && lp.includes(o.vendorName.toLowerCase())) score += 4;
  for (const it of o.items ?? []) {
    const name = it.name.toLowerCase();
    if (lp.includes(name)) score += 4;
    else for (const tok of name.split(/\s+/)) if (tok.length >= 4 && lp.includes(tok)) score += 1;
  }
  return score;
}

function bookingScore(b: AccountBooking, prompt: string): number {
  const lp = prompt.toLowerCase();
  let score = 0;
  if (b.title && lp.includes(b.title.toLowerCase())) score += 4;
  else for (const tok of (b.title ?? '').toLowerCase().split(/\s+/)) if (tok.length >= 4 && lp.includes(tok)) score += 1;
  if (b.city && lp.includes(b.city.toLowerCase())) score += 2;
  return score;
}

function mostRecent<T extends { createdAt?: string }>(rows: T[]): T | undefined {
  if (!rows.length) return undefined;
  return [...rows].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))[0];
}

// ── Builders ────────────────────────────────────────────────────────────────

function toCancelAction(t: Target): ManageAction {
  if (t.marketplace === 'eats' && t.order) {
    const o = t.order;
    const items = (o.items ?? []).map((i) => `${i.qty}× ${i.name}`).join(', ');
    return {
      kind: 'cancel',
      marketplace: 'eats',
      id: o.id,
      title: o.vendorName ?? 'Your order',
      subtitle: items || undefined,
      currency: 'MAD',
      newTotal: o.total,
    };
  }
  const b = t.booking!;
  return {
    kind: 'cancel',
    marketplace: 'stays',
    id: b.id,
    title: b.title ?? 'Your booking',
    subtitle: [b.nights ? `${b.nights} night(s)` : null, b.guests ? `${b.guests} guest(s)` : null, b.city]
      .filter(Boolean)
      .join(' · '),
    currency: 'MAD',
    newTotal: b.total,
  };
}

function toCancelRideAction(r: AccountRide): ManageAction {
  return {
    kind: 'cancel',
    marketplace: 'rides',
    id: r.id,
    title: r.className ?? 'Your ride',
    subtitle: [r.vehicle, [r.pickup, r.dropoff].filter(Boolean).join(' → ')].filter(Boolean).join(' · '),
    currency: 'MAD',
    newTotal: r.fare,
  };
}

/** Score a ride against the prompt by class, vehicle, and endpoints. */
function bestRide(ridesList: AccountRide[], prompt: string): { item?: AccountRide; score: number } {
  let item: AccountRide | undefined;
  let score = 0;
  for (const r of ridesList) {
    const s = rideScore(r, prompt);
    if (s > score) {
      score = s;
      item = r;
    }
  }
  return { item, score };
}

function rideScore(r: AccountRide, prompt: string): number {
  const lp = prompt.toLowerCase();
  let s = 0;
  if (r.className && lp.includes(r.className.toLowerCase())) s += 3;
  if (r.vehicle && lp.includes(r.vehicle.toLowerCase())) s += 3;
  for (const ep of [r.pickup, r.dropoff]) if (ep && lp.includes(ep.toLowerCase())) s += 2;
  return s;
}

/** Rebuild a past ride against the live tiers so the rideClassId + fare are current. */
async function reorderRideDraft(tools: ToolsService, ride: AccountRide): Promise<CheckoutDraft | null> {
  try {
    const classes = await tools.getRides(); // all cities — match the exact class by id
    if (!classes.length) return null;
    const rc =
      (ride.rideClassId && classes.find((c) => c.id === ride.rideClassId)) ||
      (ride.className && classes.find((c) => c.name.toLowerCase() === ride.className!.toLowerCase())) ||
      (ride.vehicle && classes.find((c) => c.vehicle.toLowerCase() === ride.vehicle!.toLowerCase())) ||
      classes[0];

    const cityClasses = classes.filter((c) => c.city === rc.city);
    const distanceKm = ride.distanceKm ?? 8;
    const minutes = Math.max(5, Math.round(distanceKm * 2.2));
    const fare = (c: typeof rc) => Math.round(c.baseFare + c.perKm * distanceKm + c.perMin * minutes);

    return {
      marketplace: 'rides',
      refId: rc.id,
      title: rc.name,
      subtitle: [rc.vehicle, rc.city].filter(Boolean).join(' · '),
      image: rc.image,
      pickup: ride.pickup ?? 'Current location',
      dropoff: ride.dropoff ?? `${rc.city} centre`,
      distanceKm,
      minutes,
      rideOptions: cityClasses
        .map((c) => ({ refId: c.id, name: c.name, vehicle: c.vehicle, total: fare(c), baseFare: c.baseFare, perKm: c.perKm, perMin: c.perMin }))
        .sort((a, b) => a.total - b.total),
      total: fare(rc),
      currency: 'MAD',
    };
  } catch (err) {
    logger.warn(`ride reorder failed: ${(err as Error).message}`);
    return null;
  }
}

/** Pull the new pickup/dropoff out of "change my ride pickup to X" / "dropoff to Y". */
function parseNewEndpoint(prompt: string, which: 'pickup' | 'dropoff'): string | undefined {
  let m: RegExpMatchArray | null = null;
  if (which === 'pickup') {
    m =
      prompt.match(/\bpick-?\s?up\s+(?:point\s+|location\s+|spot\s+)?to\s+(.+)$/i) ||
      prompt.match(/\bpickup\s+to\s+(.+)$/i) ||
      prompt.match(/\bfrom\s+(.+)$/i);
  } else {
    m =
      prompt.match(/\bdrop-?\s?off\s+(?:point\s+|location\s+|spot\s+)?to\s+(.+)$/i) ||
      prompt.match(/\bdropoff\s+to\s+(.+)$/i) ||
      prompt.match(/\bdestination\s+(?:to\s+)?(.+)$/i) ||
      prompt.match(/\bto\s+(.+)$/i);
  }
  if (!m) return undefined;
  let v = m[1].trim().replace(/^(the|a|my|our)\s+/i, '');
  v = v.split(/[,;.!?]/)[0].replace(/\s+(please|now|instead|thanks|thank you)$/i, '').trim();
  return v.length >= 2 ? cap(v) : undefined;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Rebuild a past order against the live menu so menuItemIds are current. */
async function reorderDraft(tools: ToolsService, order: AccountOrder, _location?: UserLocation): Promise<CheckoutDraft | null> {
  try {
    // Fetch ALL vendors (every city) — the past order's vendor may not be in the
    // user's current GPS city, so a city-filtered fetch would miss it.
    const vendors = await tools.getEatsVendors();
    if (!vendors.length) return null;

    const vendor =
      (order.vendorId && vendors.find((v) => v.id === order.vendorId)) ||
      (order.vendorName && vendors.find((v) => v.name.toLowerCase() === order.vendorName!.toLowerCase())) ||
      (order.vendorName && vendors.find((v) => v.name.toLowerCase().includes(order.vendorName!.toLowerCase())));
    if (!vendor) return null;

    const items = (order.items ?? [])
      .map((snap) => {
        const name = snap.name.toLowerCase();
        const mi =
          vendor.items.find((i) => i.name.toLowerCase() === name) ||
          vendor.items.find((i) => i.name.toLowerCase().includes(name) || name.includes(i.name.toLowerCase()));
        if (!mi) return null;
        return { menuItemId: mi.id, name: mi.name, qty: clampQty(snap.qty), price: mi.price };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (!items.length) return null;

    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
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
  } catch (err) {
    logger.warn(`reorder failed: ${(err as Error).message}`);
    return null;
  }
}

interface DraftLine {
  menuItemId: string;
  name: string;
  qty: number;
  price: number;
}

/**
 * Apply an item edit ("add a mint tea", "make it 2 tagines", "remove the soup")
 * to an existing order and return a fresh draft that, once confirmed, replaces
 * the original order (orders are immutable snapshots, so edit = cancel + replace).
 */
async function buildOrderEdit(
  tools: ToolsService,
  prompt: string,
  order: AccountOrder,
  _location?: UserLocation,
): Promise<CheckoutDraft | null> {
  // All vendors (every city) — the order's vendor may be in another city than GPS.
  const vendors = await tools.getEatsVendors();
  const vendor =
    (order.vendorId && vendors.find((v) => v.id === order.vendorId)) ||
    (order.vendorName && vendors.find((v) => v.name.toLowerCase().includes(order.vendorName!.toLowerCase())));
  if (!vendor) return null;

  // Start from the existing order, mapped onto the live menu.
  const lines = new Map<string, DraftLine>();
  for (const snap of order.items ?? []) {
    const mi = findMenuItem(vendor.items, snap.name);
    if (mi) lines.set(mi.id, { menuItemId: mi.id, name: mi.name, qty: snap.qty, price: mi.price });
  }

  const changed = applyEdit(prompt, vendor.items, lines);
  if (!changed) return null;

  const items = [...lines.values()].filter((l) => l.qty > 0);
  if (!items.length) return null;

  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  return {
    marketplace: 'eats',
    refId: vendor.id,
    title: vendor.name,
    subtitle: [vendor.cuisine, vendor.city].filter(Boolean).join(' · '),
    image: vendor.image,
    items,
    total: subtotal + vendor.deliveryFee,
    currency: 'MAD',
    replacesOrderId: order.id,
  };
}

/** Mutates `lines` per the prompt. Returns true if anything actually changed. */
function applyEdit(prompt: string, menu: { id: string; name: string; price: number }[], lines: Map<string, DraftLine>): boolean {
  const lower = prompt.toLowerCase();

  // Remove: "remove the soup", "drop the mint tea", "no tea"
  const rm = lower.match(/\b(?:remove|drop|delete|without|no more)\s+(?:the\s+|my\s+)?([a-z][\w ]{2,30})/);
  if (rm) {
    const mi = findMenuItem(menu, rm[1]);
    if (mi && lines.has(mi.id)) {
      lines.delete(mi.id);
      return true;
    }
  }

  // Set quantity: "make it 2 tagines", "change the tea to 3", "set tagine to 2"
  const setQty =
    lower.match(/\bmake it\s+(\d+)\s+([a-z][\w ]{2,30})/) ||
    lower.match(/\b(?:change|set)\s+(?:the\s+)?([a-z][\w ]{2,30}?)\s+to\s+(\d+)/);
  if (setQty) {
    const isMakeIt = /\bmake it\b/.test(lower);
    const qty = clampQty(parseInt(isMakeIt ? setQty[1] : setQty[2], 10));
    const dish = (isMakeIt ? setQty[2] : setQty[1]).trim();
    const mi = findMenuItem(menu, dish);
    if (mi) {
      const existing = lines.get(mi.id);
      lines.set(mi.id, { menuItemId: mi.id, name: mi.name, qty, price: mi.price });
      return existing?.qty !== qty || !existing;
    }
  }

  // Add: "add a mint tea (to my order)", "add 2 tagines", "another tea", "one more soup"
  const add =
    lower.match(/\b(?:add|put|include|throw in)\s+(?:(\d+)\s+)?(?:an?\s+)?([a-z][\w ]{2,30}?)(?:\s+to\b|$|[.,])/) ||
    lower.match(/\b(?:another|one more|an extra|extra)\s+([a-z][\w ]{2,30})/);
  if (add) {
    const hasQty = /\d/.test(add[1] ?? '');
    const qty = hasQty ? clampQty(parseInt(add[1], 10)) : 1;
    const dish = (add[2] ?? add[1]).trim();
    const mi = findMenuItem(menu, dish);
    if (mi) {
      const existing = lines.get(mi.id);
      lines.set(mi.id, { menuItemId: mi.id, name: mi.name, qty: (existing?.qty ?? 0) + qty, price: mi.price });
      return true;
    }
  }

  return false;
}

/** Loose menu-item match by name, tolerant of tajine≈tagine, coke≈Coca-Cola, and plurals. */
function findMenuItem(menu: { id: string; name: string; price: number }[], text: string): { id: string; name: string; price: number } | undefined {
  let t = text.toLowerCase().replace(/\btajines?\b|\btagines?\b/g, 'tagine').trim();
  // "coke" → prefer the PLAIN "Coca-Cola" over "Coca-Cola Zero"/Diet/Light unless asked.
  if (/\b(coke|coca|cola|pepsi)\b/.test(t)) {
    const wantsLite = /\b(zero|diet|light)\b/.test(t);
    const colas = menu.filter((i) => i.name.toLowerCase().includes('cola'));
    const pick = wantsLite
      ? colas.find((i) => /zero|diet|light/i.test(i.name))
      : colas.find((i) => !/zero|diet|light/i.test(i.name));
    if (pick ?? colas[0]) return pick ?? colas[0];
  }
  if (/\borange juice\b|\boj\b/.test(t)) t = 'orange juice';
  t = t.replace(/s\b/, '').trim();
  return (
    menu.find((i) => i.name.toLowerCase().includes(t)) ||
    menu.find((i) => t.split(/\s+/).some((w) => w.length >= 4 && i.name.toLowerCase().includes(w)))
  );
}

function signedOutOrEmpty(account: AccountSnapshot | undefined, emptyMsg: string): string {
  return account ? emptyMsg : 'Sign in first and I can manage your orders and bookings.';
}

function num(text: string, re: RegExp): number | undefined {
  const m = text.match(re);
  return m ? parseInt(m[1], 10) : undefined;
}
function clampQty(q: number): number {
  return Math.max(1, Math.min(20, Math.round(q || 1)));
}

// Drinks/sides — so "your usual" can prefer orders that contain an actual meal.
const SUPPLEMENT_ITEM_RE = /\b(coca|coke|cola|pepsi|sprite|fanta|hawai|soda|water|juice|lemonade|mojito|latte|smoothie|fries|onion rings?|garlic bread|milkshake|mint tea|iced tea)\b/i;
/** True when an order has at least one real dish (not only drinks/sides). */
function isMeaningfulOrder(o: AccountOrder): boolean {
  return (o.items ?? []).some((i) => !SUPPLEMENT_ITEM_RE.test(i.name));
}
