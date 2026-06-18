import type { ToolId } from '@/lib/ai/types';

export interface ItineraryItem {
  id: string;
  time: string;
  title: string;
  detail: string;
  tool: ToolId;
  cost?: number;
}

export interface ItineraryDay {
  day: number;
  label: string;
  items: ItineraryItem[];
}

export const ITINERARY: ItineraryDay[] = [
  {
    day: 1,
    label: 'Friday · Arrival',
    items: [
      { id: 'd1-1', time: '14:00', title: 'Hotel check-in', detail: 'Oudayas Sea View Apartment', tool: 'travel', cost: 420 },
      { id: 'd1-2', time: '15:30', title: 'Lunch', detail: 'Dar Naji · traditional Moroccan', tool: 'restaurant', cost: 120 },
      { id: 'd1-3', time: '17:00', title: 'Beach time', detail: 'Rabat beach · sunset walk', tool: 'maps' },
      { id: 'd1-4', time: '20:00', title: 'Dinner', detail: 'Le Dhow · riverboat restaurant', tool: 'restaurant', cost: 260 },
    ],
  },
  {
    day: 2,
    label: 'Saturday · Explore',
    items: [
      { id: 'd2-1', time: '09:30', title: 'Kasbah des Oudayas', detail: 'Old Medina walking tour', tool: 'maps' },
      { id: 'd2-2', time: '12:30', title: 'Lunch', detail: 'Café Maure · mint tea & pastries', tool: 'restaurant', cost: 90 },
      { id: 'd2-3', time: '15:00', title: 'Surf lesson', detail: 'Harhoura beach · 2h', tool: 'maps', cost: 250 },
      { id: 'd2-4', time: '21:00', title: 'Rooftop dinner', detail: 'Cosmopolitan · city views', tool: 'restaurant', cost: 320 },
    ],
  },
  {
    day: 3,
    label: 'Sunday · Departure',
    items: [
      { id: 'd3-1', time: '10:00', title: 'Brunch', detail: 'Ville Nouvelle café', tool: 'restaurant', cost: 110 },
      { id: 'd3-2', time: '12:00', title: 'Souvenir shopping', detail: 'Rue des Consuls', tool: 'shopping', cost: 200 },
      { id: 'd3-3', time: '14:30', title: 'Ride to station', detail: 'Comfort sedan · Rabat Ville', tool: 'travel', cost: 80 },
    ],
  },
];
