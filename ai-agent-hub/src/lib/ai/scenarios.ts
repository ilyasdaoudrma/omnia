import type { AgentTask, Recommendation, ToolId } from './types';
import { uid } from '@/lib/utils';

/** A canned-but-rich scenario the mock provider plays back convincingly. */
export interface Scenario {
  match: RegExp;
  plan: { title: string; tool: ToolId }[];
  steps: { label: string; detail: string; tool?: ToolId; ms: number }[];
  answer: string;
  recommendations: Recommendation[];
}

const img = (seed: string) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=600&q=70`;

export const SCENARIOS: Scenario[] = [
  // ── Travel ──────────────────────────────────────────────
  {
    match: /(rabat|apartment|beachfront|stay|hotel|nights?|airbnb|accommodation)/i,
    plan: [
      { title: 'Parse trip details & budget', tool: 'travel' },
      { title: 'Locate beachfront areas in Rabat', tool: 'maps' },
      { title: 'Search stays for 3 guests · 3 nights', tool: 'travel' },
      { title: 'Filter under 500 MAD / night', tool: 'travel' },
      { title: 'Rank by value & distance to beach', tool: 'maps' },
    ],
    steps: [
      { label: 'Planner agent', detail: 'Decomposing request into 5 tasks', tool: 'travel', ms: 900 },
      { label: 'Maps tool', detail: 'Found 3 beachfront zones near Rabat', tool: 'maps', ms: 1100 },
      { label: 'Travel tool', detail: 'Queried 42 listings · 3 guests · 3 nights', tool: 'travel', ms: 1400 },
      { label: 'Filtering', detail: '11 stays under 500 MAD/night', tool: 'travel', ms: 800 },
      { label: 'Recommendation engine', detail: 'Scored by price, rating & walk time', tool: 'maps', ms: 1000 },
    ],
    answer:
      "I found 3 strong beachfront stays in Rabat for 3 guests over 3 nights, all under your 500 MAD/night budget. The Oudayas Sea View is my top pick — best value, 4.9★, and a 3-minute walk to the sand. Want me to hold it for next week?",
    recommendations: [
      {
        id: uid('rec'),
        tool: 'travel',
        title: 'Oudayas Sea View Apartment',
        subtitle: 'Kasbah des Oudayas · sleeps 4',
        price: 420,
        rating: 4.9,
        meta: ['3 min to beach', 'Sea view', 'Free cancellation'],
        image: img('photo-1502672260266-1c1ef2d93688'),
        badge: 'Best value',
        best: true,
      },
      {
        id: uid('rec'),
        tool: 'travel',
        title: 'Marina Bay Loft',
        subtitle: 'Bouregreg Marina · sleeps 3',
        price: 480,
        rating: 4.7,
        meta: ['Balcony', 'Pool access', 'Walk to marina'],
        image: img('photo-1522708323590-d24dbb6b0267'),
      },
      {
        id: uid('rec'),
        tool: 'travel',
        title: 'Harhoura Beach House',
        subtitle: 'Harhoura · sleeps 4',
        price: 390,
        rating: 4.6,
        meta: ['Direct beach access', 'Terrace', 'Quiet'],
        image: img('photo-1564013799919-ab600027ffc6'),
      },
    ],
  },

  // ── Food ────────────────────────────────────────────────
  {
    match: /(burger|hungry|food|eat|delivery|restaurant|dinner|lunch)/i,
    plan: [
      { title: 'Detect location & cuisine intent', tool: 'maps' },
      { title: 'Search burger spots with delivery', tool: 'restaurant' },
      { title: 'Filter delivery under 80 MAD', tool: 'restaurant' },
      { title: 'Rank by rating & ETA', tool: 'restaurant' },
    ],
    steps: [
      { label: 'Planner agent', detail: 'Intent: food delivery, burger', tool: 'restaurant', ms: 800 },
      { label: 'Maps tool', detail: 'Resolved your location · Agdal', tool: 'maps', ms: 700 },
      { label: 'Restaurant tool', detail: 'Scanned 28 nearby burger spots', tool: 'restaurant', ms: 1300 },
      { label: 'Filtering', detail: '9 deliver in <35 min under 80 MAD', tool: 'restaurant', ms: 700 },
      { label: 'Recommendation engine', detail: 'Top pick scored 9.4/10', tool: 'restaurant', ms: 900 },
    ],
    answer:
      "Best burger near you with delivery under 80 MAD is Smashed & Co — 4.8★, the double-smash combo is 72 MAD all-in, arriving in about 25 minutes. Two solid backups below. Should I place the order?",
    recommendations: [
      {
        id: uid('rec'),
        tool: 'restaurant',
        title: 'Smashed & Co — Double Smash Combo',
        subtitle: 'Agdal · 1.2 km away',
        price: 72,
        rating: 4.8,
        meta: ['~25 min', 'Free delivery', 'Fries + drink'],
        image: img('photo-1568901346375-23c9450c58cd'),
        badge: 'Top pick',
        best: true,
      },
      {
        id: uid('rec'),
        tool: 'restaurant',
        title: 'Grill House — Classic Beef',
        subtitle: 'Hassan · 2.0 km away',
        price: 65,
        rating: 4.6,
        meta: ['~30 min', '10 MAD delivery'],
        image: img('photo-1550547660-d9450f859349'),
      },
      {
        id: uid('rec'),
        tool: 'restaurant',
        title: 'Burger Lab — Truffle Stack',
        subtitle: 'Agdal · 1.6 km away',
        price: 78,
        rating: 4.7,
        meta: ['~28 min', 'Free delivery'],
        image: img('photo-1572802419224-296b0aeee0d9'),
      },
    ],
  },

  // ── Transportation ──────────────────────────────────────
  {
    match: /(ride|taxi|car|airport|casablanca|drive|transport|pick.?up)/i,
    plan: [
      { title: 'Extract route & time window', tool: 'maps' },
      { title: 'Estimate distance & duration', tool: 'maps' },
      { title: 'Compare ride options & fares', tool: 'travel' },
      { title: 'Schedule pickup reminder', tool: 'calendar' },
    ],
    steps: [
      { label: 'Planner agent', detail: 'Route: Rabat → Casablanca Airport', tool: 'maps', ms: 800 },
      { label: 'Maps tool', detail: '92 km · ~1h05 at that hour', tool: 'maps', ms: 1000 },
      { label: 'Travel tool', detail: 'Compared 4 providers', tool: 'travel', ms: 1100 },
      { label: 'Calendar tool', detail: 'Pickup reminder drafted', tool: 'calendar', ms: 700 },
    ],
    answer:
      "For tomorrow morning to Casablanca airport (CMN), the best value is a Comfort sedan at 540 MAD, ~1h05, with a free 60-min wait window. I can book it for a 6:30 AM pickup and set a reminder. Confirm?",
    recommendations: [
      {
        id: uid('rec'),
        tool: 'travel',
        title: 'Comfort Sedan — Door to CMN',
        subtitle: 'Rabat → Casablanca Airport',
        price: 540,
        rating: 4.8,
        meta: ['~1h05', 'Free 60-min wait', 'Flight tracking'],
        image: img('photo-1549924231-f129b911e442'),
        badge: 'Best value',
        best: true,
      },
      {
        id: uid('rec'),
        tool: 'travel',
        title: 'Premium Van — up to 6',
        subtitle: 'Extra luggage space',
        price: 720,
        rating: 4.9,
        meta: ['~1h05', 'Meet & greet'],
        image: img('photo-1464219789935-c2d9d9aba644'),
      },
    ],
  },

  // ── Shopping ────────────────────────────────────────────
  {
    match: /(beach|sunscreen|sunglasses|water|snacks|order|buy|shop|product)/i,
    plan: [
      { title: 'Build beach-day shopping list', tool: 'shopping' },
      { title: 'Find each item in stock nearby', tool: 'shopping' },
      { title: 'Compare prices & bundle', tool: 'shopping' },
      { title: 'Schedule same-day delivery', tool: 'notification' },
    ],
    steps: [
      { label: 'Planner agent', detail: '4 items: sunscreen, sunglasses, water, snacks', tool: 'shopping', ms: 800 },
      { label: 'Shopping tool', detail: 'Matched 4 items in stock', tool: 'shopping', ms: 1200 },
      { label: 'Price comparison', detail: 'Bundled basket: 214 MAD', tool: 'shopping', ms: 900 },
      { label: 'Notification tool', detail: 'Same-day delivery slot reserved', tool: 'notification', ms: 700 },
    ],
    answer:
      "Your beach kit is ready — sunscreen SPF50, polarized sunglasses, a 6-pack of water, and a snack box. Total 214 MAD with same-day delivery before noon tomorrow. Want me to check out?",
    recommendations: [
      {
        id: uid('rec'),
        tool: 'shopping',
        title: 'Beach Day Bundle (4 items)',
        subtitle: 'SPF50 · sunglasses · water · snacks',
        price: 214,
        rating: 4.7,
        meta: ['Same-day delivery', 'In stock', 'Best basket price'],
        image: img('photo-1507525428034-b723cf961d3e'),
        badge: 'Bundle',
        best: true,
      },
    ],
  },
];

/** Generic fallback when no scenario matches — still shows the full loop. */
export const FALLBACK: Scenario = {
  match: /.*/,
  plan: [
    { title: 'Understand intent', tool: 'maps' },
    { title: 'Select relevant tools', tool: 'travel' },
    { title: 'Search & compare options', tool: 'restaurant' },
    { title: 'Draft recommendation', tool: 'notification' },
  ],
  steps: [
    { label: 'Planner agent', detail: 'Analyzing your request', tool: 'maps', ms: 900 },
    { label: 'Tool selection', detail: 'Choosing the best tools', tool: 'travel', ms: 800 },
    { label: 'Execution agent', detail: 'Gathering live options', tool: 'restaurant', ms: 1200 },
    { label: 'Recommendation engine', detail: 'Ranking results', tool: 'notification', ms: 800 },
  ],
  answer:
    "I've broken your request into tasks, picked the right tools, and gathered the strongest options. Here's what I'd recommend — tell me which direction you like and I'll take it the rest of the way.",
  recommendations: [
    {
      id: uid('rec'),
      tool: 'travel',
      title: 'Recommended plan',
      subtitle: 'Tailored to your request',
      rating: 4.8,
      meta: ['Optimized for your budget', 'Ready to execute'],
      image: img('photo-1499591934245-40b55745b905'),
      best: true,
    },
  ],
};

export function pickScenario(prompt: string): Scenario {
  return SCENARIOS.find((s) => s.match.test(prompt)) ?? FALLBACK;
}

export function toTasks(plan: Scenario['plan']): AgentTask[] {
  return plan.map((p) => ({ id: uid('task'), title: p.title, tool: p.tool, status: 'pending' }));
}
