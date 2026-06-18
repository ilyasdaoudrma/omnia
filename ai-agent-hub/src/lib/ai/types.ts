/**
 * Core agent-system types. These describe the contract between the UI and any
 * AI provider (mock, Claude, OpenAI, or a future backend agent runtime).
 */

export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
}

/** A tool the agent can invoke. Mirrors the backend tool registry. */
export type ToolId =
  | 'travel'
  | 'maps'
  | 'restaurant'
  | 'shopping'
  | 'calendar'
  | 'notification';

export interface ToolDescriptor {
  id: ToolId;
  name: string;
  description: string;
}

/** Lifecycle status shared by tasks and steps. */
export type StepStatus = 'pending' | 'running' | 'done' | 'error';

/** One decomposed task from the Planner agent. */
export interface AgentTask {
  id: string;
  title: string;
  tool: ToolId;
  status: StepStatus;
}

/** A single observable step in the agent's run — drives the Activity Center. */
export interface AgentStep {
  id: string;
  label: string;
  detail?: string;
  tool?: ToolId;
  status: StepStatus;
  startedAt?: number;
  endedAt?: number;
}

/** A structured option the agent recommends (hotel, dish, ride, product…). */
export interface Recommendation {
  id: string;
  tool: ToolId;
  title: string;
  subtitle?: string;
  price?: number;
  rating?: number;
  meta?: string[];
  image?: string;
  badge?: string;
  best?: boolean;
  /** When set, the card is bookable/orderable from an OMNIA marketplace. */
  refId?: string;
  action?: 'book' | 'order';
  marketplace?: 'stays' | 'eats';
  orderItemId?: string;
}

/** An alternative ride tier the user can switch to on the receipt (same trip). */
export interface RideOption {
  refId: string;
  name: string;
  vehicle: string;
  total: number;
  // Rate components, so the receipt can recompute the fare when the km changes.
  baseFare: number;
  perKm: number;
  perMin: number;
}

/** A ready-to-confirm order/booking the agent assembled from natural language. */
export interface CheckoutDraft {
  marketplace: 'eats' | 'stays' | 'rides';
  refId: string;
  title: string;
  subtitle?: string;
  image?: string;
  items?: { menuItemId: string; name: string; qty: number; price: number }[];
  nights?: number;
  guests?: number;
  // Rides:
  pickup?: string;
  dropoff?: string;
  distanceKm?: number;
  minutes?: number;
  rideOptions?: RideOption[];
  // A heads-up about the assembly (e.g. a requested item wasn't on the menu).
  note?: string;
  // When set, confirming this draft also cancels the order it replaces (item edit).
  replacesOrderId?: string;
  // Eats only — optional drink/side upsells to one-tap add (or skip) on the receipt.
  supplements?: { menuItemId: string; name: string; price: number }[];
  total: number;
  currency: string;
}

/** One day in a planned trip's itinerary. */
export interface ItineraryDay {
  day: number;
  title: string;
  stay?: string;
  ride?: string;
  meals: string[];
}

/** How a trip's cost breaks down against the stated budget. */
export interface TripBudget {
  stay: number;
  ride: number;
  food: number;
  total: number;
  budget?: number;
  remaining?: number;
  overBudget: boolean;
}

/** A planned full trip — itinerary + budget reasoning shown alongside the receipt. */
export interface TripPlan {
  city?: string;
  nights: number;
  guests: number;
  days: ItineraryDay[];
  budget: TripBudget;
}

/** A past order/booking the user already has — passed to the agent for manage & reorder. */
export interface AccountOrder {
  id: string;
  vendorId?: string;
  vendorName?: string;
  items?: { name: string; qty: number; price: number }[];
  total?: number;
  status?: string;
  createdAt?: string;
}
export interface AccountBooking {
  id: string;
  listingId?: string;
  title?: string;
  city?: string;
  nights?: number;
  guests?: number;
  total?: number;
  status?: string;
  createdAt?: string;
}
export interface AccountRide {
  id: string;
  rideClassId?: string;
  className?: string;
  vehicle?: string;
  pickup?: string;
  dropoff?: string;
  distanceKm?: number;
  fare?: number;
  status?: string;
  createdAt?: string;
}
export interface AccountSnapshot {
  eatsOrders?: AccountOrder[];
  stayBookings?: AccountBooking[];
  rideTrips?: AccountRide[];
}

/** One item on a vendor's menu, for the visual menu card. */
export interface MenuItemView {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  category: 'Mains' | 'Sides' | 'Drinks';
}

/** A vendor's full menu rendered as a visual card ("show me the menu of Napoli"). */
export interface MenuView {
  vendorId: string;
  vendorName: string;
  subtitle?: string;
  image?: string;
  deliveryFee: number;
  etaMinutes: number;
  items: MenuItemView[];
}

/** A recurring agent task ("order my usual every Friday"), as shown to the user. */
export interface RecurrenceView {
  id: string;
  label: string;
  prompt: string;
  marketplace?: 'eats' | 'stays' | 'rides' | null;
  cadence: 'daily' | 'weekly';
  weekday?: number | null; // 0=Sun..6=Sat
  hour: number;
  minute: number;
  active: boolean;
  nextRunAt: string;
  lastRunAt?: string | null;
  lastStatus?: string | null;
  runCount: number;
  /** Human-readable schedule, e.g. "Every Friday at 09:00". */
  scheduleLabel: string;
}

/** A confirm-ready change to an existing order/booking/ride (cancel or modify). */
export interface ManageAction {
  kind: 'cancel' | 'modify';
  marketplace: 'eats' | 'stays' | 'rides';
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  currency?: string;
  nights?: number;
  guests?: number;
  prevNights?: number;
  prevGuests?: number;
  prevTotal?: number;
  newTotal?: number;
  // Ride modify: the new pickup/dropoff the user is confirming.
  pickup?: string;
  dropoff?: string;
  prevPickup?: string;
  prevDropoff?: string;
}

/** Streamed events the provider emits while working a request. */
export type AgentEvent =
  | { type: 'plan'; tasks: AgentTask[] }
  | { type: 'step'; step: AgentStep }
  | { type: 'step_update'; id: string; status: StepStatus; detail?: string }
  | { type: 'token'; text: string }
  | { type: 'recommendations'; items: Recommendation[] }
  | { type: 'checkout'; drafts: CheckoutDraft[]; trip?: TripPlan }
  | { type: 'clarify'; question: string; options: string[] }
  | { type: 'manage'; action: ManageAction }
  | { type: 'scheduled'; recurrence: RecurrenceView }
  | { type: 'menu'; menu: MenuView }
  | { type: 'done'; messageId: string; conversationId?: string }
  | { type: 'error'; message: string };

export interface UserLocation {
  lat: number;
  lon: number;
  city?: string;
  country?: string;
}

export interface RunInput {
  prompt: string;
  history: ChatMessage[];
  signal?: AbortSignal;
  conversationId?: string;
  location?: UserLocation;
  account?: AccountSnapshot;
}

/** The pluggable provider contract. Swap Mock ↔ Claude ↔ OpenAI freely. */
export interface AIProvider {
  readonly id: string;
  run(input: RunInput): AsyncGenerator<AgentEvent, void, unknown>;
}
