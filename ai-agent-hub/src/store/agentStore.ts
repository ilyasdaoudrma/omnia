import { create } from 'zustand';
import { aiProvider } from '@/lib/ai';
import type { ChatMessage, AgentTask, AgentStep, Recommendation, CheckoutDraft, ManageAction, TripPlan, RecurrenceView, MenuView } from '@/lib/ai/types';
import { uid } from '@/lib/utils';
import { ensureNotifyPermission, notify } from '@/lib/notify';
import { useLocationStore } from '@/store/locationStore';
import {
  placeEatsOrder,
  bookStayFull,
  bookRide,
  cancelEatsOrder,
  cancelStayBooking,
  modifyStayBooking,
  cancelRide,
  modifyRide,
  fetchAccountSnapshot,
  fetchMyEatsOrders,
  fetchMyStays,
} from '@/lib/market';
import {
  fetchConversations as apiFetchConversations,
  fetchConversation as apiFetchConversation,
  deleteConversation as apiDeleteConversation,
  toChatMessage,
  type ConversationSummary,
} from '@/lib/api';

export type CheckoutState = 'idle' | 'confirming' | 'done' | 'needAuth' | 'error';

/** Pluralize a count + noun naturally: 1 night, 2 nights. */
const plural = (n: number, w: string): string => `${n} ${w}${n === 1 ? '' : 's'}`;

/** Derived from the user's cross-app history — powers "your usual", ordered-here badges, and proactive suggestions. */
export interface Personalization {
  usualVendor: { refId: string; name: string } | null;
  orderedVendorIds: string[];
  orderedVendorNames: string[];
  /** A single smart, contextual next-action the agent surfaces up-front. */
  proactive: { text: string; prompt: string } | null;
}

interface AgentState {
  messages: ChatMessage[];
  tasks: AgentTask[];
  steps: AgentStep[];
  recommendations: Recommendation[];
  checkout: CheckoutDraft[] | null;
  checkoutTrip: TripPlan | null;
  clarify: { question: string; options: string[] } | null;
  manage: ManageAction | null;
  manageState: CheckoutState;
  /** A recurring task the agent just scheduled (renders a confirmation card). */
  scheduled: RecurrenceView | null;
  /** A vendor menu the agent surfaced (renders a visual menu card). */
  menu: MenuView | null;
  checkoutState: CheckoutState;
  isRunning: boolean;
  activeTool: string | null;
  error: string | null;

  // Persistence
  conversationId: string | null;
  conversations: ConversationSummary[];
  conversationsLoading: boolean;

  // Personalization (your usual / ordered-here)
  personalization: Personalization;
  loadPersonalization: () => Promise<void>;

  sendMessage: (prompt: string) => Promise<void>;
  confirmCheckout: () => Promise<void>;
  confirmManage: () => Promise<void>;
  /** Replace the editable receipt drafts (qty/remove/nights/guests/ride-tier edits). */
  updateCheckout: (drafts: CheckoutDraft[]) => void;
  stop: () => void;
  newConversation: () => void;
  loadConversation: (id: string) => Promise<void>;
  refreshConversations: () => Promise<void>;
  removeConversation: (id: string) => Promise<void>;
}

let currentController: AbortController | null = null;

// Lightweight client-side gate: when a message looks like it's about an
// existing order/booking, we attach the user's history so the agent can
// cancel/modify/reorder. Normal sends skip the extra fetch.
const MANAGE_HINT =
  /\b(cancel|re-?order|re-?book|usual|same as|again|change|modify|update|edit|extend|shorten|make (it|my)|pick-?up|drop-?off|my (order|booking|trip|stay|reservation|ride))\b/i;

// Scheduling a recurring task may reorder "my usual", which needs the user's
// history — so fetch the snapshot for schedule phrases too.
const SCHEDULE_HINT = /\b(every|each|daily|weekly|recurring|scheduled?)\b/i;

const GREETING: ChatMessage = {
  id: uid('msg'),
  role: 'assistant',
  content:
    "Hey — I'm OMNIA. Make a wish in plain language (a trip, a meal, a ride, a whole weekend) and I'll plan it, compare real options near you, and get it ready.",
  createdAt: Date.now(),
};

function freshGreeting(): ChatMessage {
  return { ...GREETING, id: uid('msg'), createdAt: Date.now() };
}

// Persist the transcript so a page reload doesn't wipe the conversation — the
// agent keeps remembering everything that was said. Mirrors the localStorage
// pattern used by the location store. Last 60 messages, capped for size.
const CHAT_STORAGE_KEY = 'omnia.chat';
interface PersistedChat {
  messages: ChatMessage[];
  conversationId: string | null;
}
function loadPersistedChat(): PersistedChat | null {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedChat;
    if (!Array.isArray(data.messages) || !data.messages.length) return null;
    return { messages: data.messages, conversationId: data.conversationId ?? null };
  } catch {
    return null;
  }
}
function savePersistedChat(messages: ChatMessage[], conversationId: string | null): void {
  try {
    const trimmed = messages.slice(-60);
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify({ messages: trimmed, conversationId }));
  } catch {
    /* localStorage unavailable / quota — non-fatal, conversation just won't persist */
  }
}
const persistedChat = typeof window !== 'undefined' ? loadPersistedChat() : null;

/**
 * Pick ONE proactive next-action from the user's cross-app history:
 * an upcoming stay to round out, else a recent city to revisit, else a reorder.
 */
function computeProactive(
  orders: { vendorName: string }[],
  stays: { title: string; city: string; status: string; checkIn?: string | null }[],
  usualVendor: { refId: string; name: string } | null,
): { text: string; prompt: string } | null {
  const now = Date.now();
  const upcoming = stays
    .filter((b) => b.status !== 'cancelled' && b.checkIn && new Date(b.checkIn).getTime() > now)
    .sort((a, b) => new Date(a.checkIn!).getTime() - new Date(b.checkIn!).getTime())[0];
  if (upcoming) {
    const days = Math.max(0, Math.ceil((new Date(upcoming.checkIn!).getTime() - now) / 86400000));
    const when = days === 0 ? 'today' : `in ${days} day${days > 1 ? 's' : ''}`;
    return {
      text: `Your stay at ${upcoming.title} in ${upcoming.city} is ${when} — want me to line up dinner and an airport ride for it?`,
      prompt: `plan dinner and an airport ride in ${upcoming.city} for my upcoming stay`,
    };
  }
  const recentStay = stays.find((b) => b.status !== 'cancelled');
  if (recentStay && !orders.length) {
    return { text: `Welcome back — plan another trip to ${recentStay.city}?`, prompt: `plan a trip to ${recentStay.city}` };
  }
  if (usualVendor) {
    return { text: `Welcome back — reorder your usual from ${usualVendor.name}?`, prompt: 'order my usual' };
  }
  return null;
}

// Every agent response renders in exactly ONE panel; this clears them all so a new
// result can never appear beneath a stale one from a previous turn.
const EMPTY_RESULTS = {
  recommendations: [] as Recommendation[],
  checkout: null as CheckoutDraft[] | null,
  checkoutTrip: null as TripPlan | null,
  clarify: null as { question: string; options: string[] } | null,
  manage: null as ManageAction | null,
  scheduled: null as RecurrenceView | null,
  menu: null as MenuView | null,
};

export const useAgentStore = create<AgentState>((set, get) => ({
  messages: persistedChat?.messages ?? [freshGreeting()],
  tasks: [],
  steps: [],
  recommendations: [],
  checkout: null,
  checkoutTrip: null,
  clarify: null,
  manage: null,
  manageState: 'idle',
  scheduled: null,
  menu: null,
  checkoutState: 'idle',
  isRunning: false,
  activeTool: null,
  error: null,
  conversationId: persistedChat?.conversationId ?? null,
  conversations: [],
  conversationsLoading: false,
  personalization: { usualVendor: null, orderedVendorIds: [], orderedVendorNames: [], proactive: null },

  async loadPersonalization() {
    const [orders, stays] = await Promise.all([fetchMyEatsOrders(), fetchMyStays()]);

    // Most-ordered vendor (ties broken by recency — orders come back newest-first).
    let usualVendor: { refId: string; name: string } | null = null;
    if (orders.length) {
      const counts = new Map<string, number>();
      for (const o of orders) counts.set(o.vendorName, (counts.get(o.vendorName) ?? 0) + 1);
      let topName = orders[0].vendorName;
      let topCount = 0;
      for (const o of orders) {
        const c = counts.get(o.vendorName) ?? 0;
        if (c > topCount) {
          topCount = c;
          topName = o.vendorName;
        }
      }
      const top = orders.find((o) => o.vendorName === topName);
      if (top) usualVendor = { refId: top.vendorId ?? '', name: top.vendorName };
    }

    set({
      personalization: {
        usualVendor,
        orderedVendorIds: [...new Set(orders.map((o) => o.vendorId).filter((v): v is string => Boolean(v)))],
        orderedVendorNames: [...new Set(orders.map((o) => o.vendorName.toLowerCase()))],
        proactive: computeProactive(orders, stays, usualVendor),
      },
    });
  },

  async sendMessage(prompt: string) {
    const text = prompt.trim();
    if (!text || get().isRunning) return;

    currentController?.abort();
    currentController = new AbortController();

    const userMsg: ChatMessage = { id: uid('msg'), role: 'user', content: text, createdAt: Date.now() };
    const assistantId = uid('msg');
    const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '', createdAt: Date.now() };

    set((s) => ({
      messages: [...s.messages, userMsg, assistantMsg],
      tasks: [],
      steps: [],
      recommendations: [],
      checkout: null,
      checkoutTrip: null,
      clarify: null,
      manage: null,
      manageState: 'idle',
      scheduled: null,
      menu: null,
      checkoutState: 'idle',
      isRunning: true,
      activeTool: null,
      error: null,
    }));

    try {
      // Only load the user's order/booking history when the message looks like a
      // manage or personalization request — keeps normal sends fast.
      const account = MANAGE_HINT.test(text) || SCHEDULE_HINT.test(text) ? await fetchAccountSnapshot() : undefined;

      const stream = aiProvider.run({
        prompt: text,
        history: get().messages,
        signal: currentController.signal,
        conversationId: get().conversationId ?? undefined,
        location: useLocationStore.getState().location ?? undefined,
        account,
      });

      for await (const event of stream) {
        switch (event.type) {
          case 'plan':
            set({ tasks: event.tasks });
            break;
          case 'step':
            set((s) => ({ steps: [...s.steps, event.step], activeTool: event.step.tool ?? s.activeTool }));
            break;
          case 'step_update':
            set((s) => ({
              steps: s.steps.map((st) =>
                st.id === event.id
                  ? { ...st, status: event.status, detail: event.detail ?? st.detail, endedAt: event.status === 'done' ? Date.now() : st.endedAt }
                  : st,
              ),
              tasks: s.tasks.map((t) => (t.id === event.id ? { ...t, status: event.status } : t)),
            }));
            break;
          case 'token':
            set((s) => ({
              messages: s.messages.map((m) => (m.id === assistantId ? { ...m, content: m.content + event.text } : m)),
            }));
            break;
          // Each response panel is mutually exclusive — clear the others so a
          // checkout/menu/etc. never renders under stale recommendation cards from
          // an earlier turn (sendMessage clears at start; this guards mid-stream too).
          case 'recommendations':
            set({ ...EMPTY_RESULTS, recommendations: event.items });
            break;
          case 'checkout':
            set({ ...EMPTY_RESULTS, checkout: event.drafts, checkoutTrip: event.trip ?? null, checkoutState: 'idle' });
            break;
          case 'clarify':
            set({ ...EMPTY_RESULTS, clarify: { question: event.question, options: event.options } });
            break;
          case 'manage':
            set({ ...EMPTY_RESULTS, manage: event.action, manageState: 'idle' });
            break;
          case 'scheduled':
            set({ ...EMPTY_RESULTS, scheduled: event.recurrence });
            break;
          case 'menu':
            set({ ...EMPTY_RESULTS, menu: event.menu });
            break;
          case 'error':
            set({ error: event.message });
            break;
          case 'done':
            if (event.conversationId) set({ conversationId: event.conversationId });
            break;
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        set({ error: (err as Error).message ?? 'Something went wrong.' });
      }
    } finally {
      set({ isRunning: false, activeTool: null });
      // Refresh history so a newly-created conversation appears in the sidebar.
      void get().refreshConversations();
    }
  },

  async confirmCheckout() {
    const drafts = get().checkout;
    if (!drafts || !drafts.length || get().checkoutState === 'confirming') return;
    set({ checkoutState: 'confirming' });

    try {
    // Place each action in its own marketplace (Stays + Eats) under one tap.
    const lines: string[] = [];
    let anyFail = false;
    for (const d of drafts) {
      const res =
        d.marketplace === 'eats'
          ? await placeEatsOrder(d.refId, (d.items ?? []).map((i) => ({ menuItemId: i.menuItemId, qty: i.qty })))
          : d.marketplace === 'rides'
            ? await bookRide(d.refId, d.pickup, d.dropoff, d.distanceKm)
            : await bookStayFull(d.refId, d.nights ?? 2, d.guests ?? 2);
      if (res.needAuth) {
        set({ checkoutState: 'needAuth' });
        return;
      }
      if (!res.ok) {
        anyFail = true;
        continue;
      }
      // Item edit: the revised order replaces the original — cancel the old one.
      if (d.marketplace === 'eats' && d.replacesOrderId) {
        await cancelEatsOrder(d.replacesOrderId);
      }
      lines.push(
        d.marketplace === 'eats'
          ? `🍽️ ${d.replacesOrderId ? 'Order updated' : 'Order placed'} with ${d.title} — ${res.total ?? d.total} ${d.currency}`
          : d.marketplace === 'rides'
            ? `🚗 Ride booked · ${d.title} (${d.pickup} → ${d.dropoff}) — ${res.total ?? d.total} ${d.currency}`
            : `🏠 Booked ${d.title} (${d.nights}n · ${d.guests}g) — ${res.total ?? d.total} ${d.currency}`,
      );
    }

    if (!lines.length) {
      set({ checkoutState: 'error' });
      return;
    }

    const grand = drafts.reduce((n, d) => n + d.total, 0);
    const confirmation: ChatMessage = {
      id: uid('msg'),
      role: 'assistant',
      content: `✅ All set!\n${lines.join('\n')}${drafts.length > 1 ? `\nGrand total — ${grand} ${drafts[0].currency}` : ''}${anyFail ? '\n(One item could not be placed — please retry it.)' : ''}\nYou'll find these in your trips & orders. Anything else?`,
      createdAt: Date.now(),
    };
    // Keep the drafts on success so the receipt stays mounted in its 'done' state
    // (locked from editing, shows the marketplace deep links). It's cleared only
    // by a new message / new conversation, not immediately on success.
    set((s) => ({ messages: [...s.messages, confirmation], checkoutState: anyFail ? 'error' : 'done', checkout: get().checkout }));
    // Fire an on-device notification confirming what was placed.
    if (!anyFail) void ensureNotifyPermission().then((ok) => ok && notify('OMNIA — all set! ✅', lines.join('\n')));
    void get().refreshConversations();
    } catch {
      // Never leave the receipt stuck on the spinner — surface a retryable error.
      set({ checkoutState: 'error' });
    }
  },

  updateCheckout(drafts: CheckoutDraft[]) {
    // Drop any eats draft whose items were all removed; keep the rest.
    const cleaned = drafts.filter((d) => d.marketplace !== 'eats' || (d.items?.length ?? 0) > 0);
    set({ checkout: cleaned.length ? cleaned : null });
  },

  async confirmManage() {
    const action = get().manage;
    if (!action || get().manageState === 'confirming') return;
    set({ manageState: 'confirming' });

    try {
    const res =
      action.kind === 'cancel'
        ? action.marketplace === 'eats'
          ? await cancelEatsOrder(action.id)
          : action.marketplace === 'rides'
            ? await cancelRide(action.id)
            : await cancelStayBooking(action.id)
        : action.marketplace === 'rides'
          ? await modifyRide(action.id, action.pickup, action.dropoff)
          : await modifyStayBooking(action.id, action.nights ?? action.prevNights ?? 1, action.guests ?? action.prevGuests ?? 1);

    if (res.needAuth) {
      set({ manageState: 'needAuth' });
      return;
    }
    if (!res.ok) {
      set({ manageState: 'error' });
      return;
    }

    const where = action.marketplace === 'eats' ? 'orders' : action.marketplace === 'rides' ? 'rides' : 'trips';
    const content =
      action.kind === 'cancel'
        ? `✅ Cancelled — ${action.title}${action.subtitle ? ` (${action.subtitle})` : ''} is now cancelled. It'll drop out of your ${where}. Anything else?`
        : action.marketplace === 'rides'
          ? `✅ Updated — your ride is now ${action.pickup} → ${action.dropoff}. You'll see it in your rides. Anything else?`
          : `✅ Updated — ${action.title} is now ${plural(action.nights ?? 1, 'night')} for ${plural(action.guests ?? 1, 'guest')}${res.total != null ? `, ${res.total} ${action.currency ?? 'MAD'}` : ''}. Anything else?`;
    const confirmation: ChatMessage = { id: uid('msg'), role: 'assistant', content, createdAt: Date.now() };

    set((s) => ({ messages: [...s.messages, confirmation], manageState: 'done', manage: null }));
    void get().refreshConversations();
    } catch {
      set({ manageState: 'error' });
    }
  },

  stop() {
    currentController?.abort();
    set({ isRunning: false, activeTool: null });
  },

  newConversation() {
    currentController?.abort();
    set({
      messages: [freshGreeting()],
      tasks: [],
      steps: [],
      recommendations: [],
      checkout: null,
      checkoutTrip: null,
      clarify: null,
      manage: null,
      manageState: 'idle',
      scheduled: null,
      menu: null,
      checkoutState: 'idle',
      isRunning: false,
      activeTool: null,
      error: null,
      conversationId: null,
    });
  },

  async loadConversation(id: string) {
    currentController?.abort();
    const detail = await apiFetchConversation(id);
    if (!detail) return;
    const messages = detail.messages.map(toChatMessage);
    // Surface recommendations from the most recent assistant message, if any.
    const lastWithRecs = [...detail.messages].reverse().find((m) => m.recommendations && m.recommendations.length);
    set({
      messages: messages.length ? messages : [freshGreeting()],
      recommendations: lastWithRecs?.recommendations ?? [],
      conversationId: id,
      tasks: [],
      steps: [],
      checkout: null,
      checkoutTrip: null,
      clarify: null,
      manage: null,
      manageState: 'idle',
      scheduled: null,
      menu: null,
      checkoutState: 'idle',
      isRunning: false,
      activeTool: null,
      error: null,
    });
  },

  async refreshConversations() {
    set({ conversationsLoading: true });
    try {
      const list = await apiFetchConversations();
      set({ conversations: list });
    } finally {
      set({ conversationsLoading: false });
    }
  },

  async removeConversation(id: string) {
    const ok = await apiDeleteConversation(id);
    if (!ok) return;
    set((s) => ({ conversations: s.conversations.filter((c) => c.id !== id) }));
    if (get().conversationId === id) get().newConversation();
  },
}));

// Persist the transcript whenever messages settle (not mid-stream) so a reload
// restores the full conversation. Skipped while a run is in flight to avoid
// writing on every streamed token.
let lastPersistedMessages: ChatMessage[] | null = null;
useAgentStore.subscribe((state) => {
  if (state.isRunning) return;
  if (state.messages === lastPersistedMessages) return;
  lastPersistedMessages = state.messages;
  savePersistedChat(state.messages, state.conversationId);
});
