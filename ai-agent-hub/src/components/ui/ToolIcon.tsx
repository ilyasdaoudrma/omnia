import { Plane, Map, UtensilsCrossed, ShoppingBag, CalendarDays, Bell } from 'lucide-react';
import type { ToolId } from '@/lib/ai/types';
import { cn } from '@/lib/utils';

const ICONS: Record<ToolId, typeof Plane> = {
  travel: Plane,
  maps: Map,
  restaurant: UtensilsCrossed,
  shopping: ShoppingBag,
  calendar: CalendarDays,
  notification: Bell,
};

const TINTS: Record<ToolId, string> = {
  travel: 'text-neon-blue',
  maps: 'text-neon-cyan',
  restaurant: 'text-neon-pink',
  shopping: 'text-neon-violet',
  calendar: 'text-accent-soft',
  notification: 'text-amber-300',
};

export function ToolIcon({ tool, className }: { tool: ToolId; className?: string }) {
  const Icon = ICONS[tool];
  return <Icon className={cn('h-4 w-4', TINTS[tool], className)} strokeWidth={1.8} />;
}

export const TOOL_TINT = TINTS;
