import type { ToolDescriptor, ToolId } from './types';

/**
 * The tool registry. Each tool is independently expandable — the agent selects
 * the right ones per request. On the backend these map to real integrations
 * (booking APIs, maps, delivery, commerce); here they describe capabilities.
 */
export const TOOLS: Record<ToolId, ToolDescriptor> = {
  travel: {
    id: 'travel',
    name: 'Travel',
    description: 'Search and compare accommodations, stays, and lodging.',
  },
  maps: {
    id: 'maps',
    name: 'Maps',
    description: 'Locations, distances, routes, and travel times.',
  },
  restaurant: {
    id: 'restaurant',
    name: 'Restaurants',
    description: 'Food discovery, menus, delivery, and reservations.',
  },
  shopping: {
    id: 'shopping',
    name: 'Shopping',
    description: 'Product search, price comparison, and ordering.',
  },
  calendar: {
    id: 'calendar',
    name: 'Calendar',
    description: 'Schedule management and time-blocking.',
  },
  notification: {
    id: 'notification',
    name: 'Notifications',
    description: 'Alerts, reminders, and status updates.',
  },
};

export const TOOL_LIST = Object.values(TOOLS);
