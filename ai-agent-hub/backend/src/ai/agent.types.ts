/**
 * Agent event contract — byte-for-byte compatible with the frontend's
 * web/src/lib/ai/types.ts. The agent orchestrator emits these as SSE frames.
 */

export type Role = 'user' | 'assistant' | 'system';
export type StepStatus = 'pending' | 'running' | 'done' | 'error';
export type ToolId = 'travel' | 'maps' | 'restaurant' | 'shopping' | 'calendar' | 'notification';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
}

export interface AgentTask {
  id: string;
  title: string;
  tool: ToolId;
  status: StepStatus;
}

export interface AgentStep {
  id: string;
  label: string;
  detail?: string;
  tool?: ToolId;
  status: StepStatus;
  startedAt?: number;
  endedAt?: number;
}

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
  // When set, the recommendation is bookable/orderable from an OMNIA marketplace.
  refId?: string;
  action?: 'book' | 'order';
  marketplace?: 'stays' | 'eats';
  // For Eats orders: a default menu item to order in one tap.
  orderItemId?: string;
}

/** An alternative ride tier the user can switch to on the receipt (same trip). */
export interface RideOption {
  refId: string;
  name: string;
  vehicle: string;
  total: number;
  // Rate components, so the UI can recompute the fare when the user edits the km.
  baseFare: number;
  perKm: number;
  perMin: number;
}

/** A ready-to-confirm order/booking the agent assembled from a natural-language request. */
export interface CheckoutDraft {
  marketplace: 'eats' | 'stays' | 'rides';
  refId: string; // vendorId, listingId, or rideClassId
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
  // Other ride tiers for the same trip — lets the UI switch tier + recompute.
  rideOptions?: RideOption[];
  // A heads-up about the assembly (e.g. a requested item wasn't on the menu).
  note?: string;
  // When set, confirming this draft also cancels the order it replaces (item edit).
  replacesOrderId?: string;
  // Eats only — optional drink/side upsells the user can one-tap add (or skip)
  // on the receipt. Transient UI hint; not part of what gets ordered until added.
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

/** A quick disambiguating question the agent asks before committing to a checkout. */
export interface ClarifyRequest {
  question: string;
  /** Tappable, self-contained follow-up prompts (e.g. "Order the tajine"). */
  options: string[];
}

/**
 * Result of the direct-action fast path: confirm-ready drafts, a clarifying
 * question when the follow-up is too ambiguous, or a plain message (e.g. a
 * refusal when the requested city isn't one we serve).
 */
export type CheckoutOutcome =
  | { kind: 'drafts'; drafts: CheckoutDraft[]; trip?: TripPlan }
  | { kind: 'clarify'; clarify: ClarifyRequest }
  | { kind: 'message'; text: string };

/** A past order/booking the user already has — passed in for manage & reorder. */
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

/** A confirm-ready change to an EXISTING order/booking/ride (cancel or modify). */
export interface ManageAction {
  kind: 'cancel' | 'modify';
  marketplace: 'eats' | 'stays' | 'rides';
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  currency?: string;
  // For a modify (stays): the before/after the user is confirming.
  nights?: number;
  guests?: number;
  prevNights?: number;
  prevGuests?: number;
  prevTotal?: number;
  newTotal?: number;
  // For a ride modify: the new pickup/dropoff the user is confirming.
  pickup?: string;
  dropoff?: string;
  prevPickup?: string;
  prevDropoff?: string;
}

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

export interface RunRequest {
  prompt: string;
  history: ChatMessage[];
  provider?: 'claude' | 'openai' | 'groq';
  conversationId?: string;
  location?: UserLocation;
  account?: AccountSnapshot;
}

/** A tool's execution result, fed back to the model for the final answer. */
export interface ToolResult {
  tool: ToolId;
  summary: string;
  recommendations: Recommendation[];
}
