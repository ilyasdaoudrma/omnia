import type { ToolId } from '@/lib/ai/types';

export interface TripCard {
  id: string;
  destination: string;
  dates: string;
  nights: number;
  guests: number;
  budget: number;
  image: string;
  status: 'confirmed' | 'planning';
}

export interface ActiveTask {
  id: string;
  title: string;
  tool: ToolId;
  progress: number;
  eta: string;
}

export interface OrderCard {
  id: string;
  title: string;
  vendor: string;
  total: number;
  status: 'delivering' | 'delivered' | 'preparing';
  eta: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  tone: 'accent' | 'success' | 'warn';
}

const img = (s: string) => `https://images.unsplash.com/${s}?auto=format&fit=crop&w=600&q=70`;

export const TRIPS: TripCard[] = [
  {
    id: 't1',
    destination: 'Rabat',
    dates: 'Jun 12 – 15',
    nights: 3,
    guests: 3,
    budget: 1260,
    image: img('photo-1539020140153-e479b8c22e70'),
    status: 'confirmed',
  },
  {
    id: 't2',
    destination: 'Chefchaouen',
    dates: 'Jul 4 – 6',
    nights: 2,
    guests: 2,
    budget: 1800,
    image: img('photo-1553913861-c0fddf2619ee'),
    status: 'planning',
  },
];

export const ACTIVE_TASKS: ActiveTask[] = [
  { id: 'a1', title: 'Comparing airport ride options', tool: 'travel', progress: 72, eta: '~30s' },
  { id: 'a2', title: 'Building Chefchaouen itinerary', tool: 'calendar', progress: 45, eta: '~1m' },
  { id: 'a3', title: 'Restocking beach essentials', tool: 'shopping', progress: 90, eta: '~10s' },
];

export const ORDERS: OrderCard[] = [
  { id: 'o1', title: 'Beach Day Bundle', vendor: 'Casa Cart', total: 214, status: 'delivering', eta: 'Today, 11:40' },
  { id: 'o2', title: 'Double Smash Combo', vendor: 'Smashed & Co', total: 72, status: 'delivered', eta: 'Yesterday' },
  { id: 'o3', title: 'SPF50 + sunglasses', vendor: 'BeachCo', total: 138, status: 'preparing', eta: 'Tomorrow' },
];

export const NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', title: 'Stay confirmed', body: 'Oudayas Sea View is booked for Jun 12–15.', time: '2m ago', tone: 'success' },
  { id: 'n2', title: 'Price drop', body: 'Your Casablanca ride dropped to 540 MAD.', time: '1h ago', tone: 'accent' },
  { id: 'n3', title: 'Confirm needed', body: 'Approve the Chefchaouen itinerary to proceed.', time: '3h ago', tone: 'warn' },
];

export const RECOMMENDED = [
  { id: 'r1', title: 'Sunset surf lesson', meta: 'Harhoura beach · 250 MAD', image: img('photo-1502680390469-be75c86b636f') },
  { id: 'r2', title: 'Rooftop dinner at Dar Naji', meta: 'Traditional · 4.8★', image: img('photo-1414235077428-338989a2e8c0') },
  { id: 'r3', title: 'Old Medina walking tour', meta: '2h · free', image: img('photo-1518684079-3c830dcef090') },
];
