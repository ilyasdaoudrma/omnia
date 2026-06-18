import { motion } from 'framer-motion';
import { UtensilsCrossed, Bike, Clock, Plus } from 'lucide-react';
import type { MenuView, MenuItemView } from '@/lib/ai/types';
import { useAgentStore } from '@/store/agentStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatMAD } from '@/lib/utils';

const GROUPS: MenuItemView['category'][] = ['Mains', 'Sides', 'Drinks'];

/**
 * Visual menu for a vendor the agent surfaced ("show me the menu of Napoli").
 * Item images + prices, grouped; tapping an item asks the agent to order it.
 */
export function MenuCard({ menu }: { menu: MenuView }) {
  const sendMessage = useAgentStore((s) => s.sendMessage);
  const isRunning = useAgentStore((s) => s.isRunning);
  const base = menu.vendorName.split('·')[0].trim();
  const order = (name: string) => sendMessage(`order a ${name} from ${base}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="ml-11 max-w-md"
    >
      <GlassCard strong glow className="overflow-hidden p-0">
        {/* Vendor hero */}
        <div className="relative h-28 w-full overflow-hidden">
          {menu.image && <img src={menu.image} alt={menu.vendorName} className="h-full w-full object-cover" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className="font-display text-lg font-bold tracking-tight text-white">{menu.vendorName}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/70">
              {menu.subtitle && <span>{menu.subtitle}</span>}
              <span className="inline-flex items-center gap-1">
                <Bike className="h-3 w-3" /> {menu.deliveryFee === 0 ? 'Free delivery' : `${menu.deliveryFee} MAD`}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> ~{menu.etaMinutes} min
              </span>
            </p>
          </div>
        </div>

        {/* Grouped items */}
        <div className="max-h-80 space-y-4 overflow-y-auto p-4" data-lenis-prevent>
          {GROUPS.map((group) => {
            const items = menu.items.filter((i) => i.category === group);
            if (!items.length) return null;
            return (
              <div key={group}>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent-soft/80">{group}</h4>
                <div className="space-y-2">
                  {items.map((it) => (
                    <div key={it.id} className="flex items-center gap-3">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white/5">
                        {it.image ? (
                          <img src={it.image} alt={it.name} loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <span className="grid h-full w-full place-items-center text-white/30">
                            <UtensilsCrossed className="h-4 w-4" />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white/90">{it.name}</p>
                        <p className="text-xs font-semibold text-accent-soft">{formatMAD(it.price)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => order(it.name)}
                        disabled={isRunning}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#9a7b1e,#f1d98a)] text-black transition-transform hover:scale-105 disabled:opacity-50"
                        aria-label={`Order ${it.name}`}
                        data-cursor="hover"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>
    </motion.div>
  );
}
