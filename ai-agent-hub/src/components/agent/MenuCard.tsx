import { useState } from 'react';
import { motion } from 'framer-motion';
import { UtensilsCrossed, Bike, Clock, Plus, Minus, ShoppingBag } from 'lucide-react';
import type { MenuView, MenuItemView } from '@/lib/ai/types';
import { useAgentStore } from '@/store/agentStore';
import { GlassCard } from '@/components/ui/GlassCard';
import { formatMAD } from '@/lib/utils';

const GROUPS: MenuItemView['category'][] = ['Mains', 'Sides', 'Drinks'];
const MAX_QTY = 20;

/**
 * Visual menu for a vendor the agent surfaced ("show me the menu of Napoli").
 * Works like a cart: add several items (with quantities), then "Review order"
 * sends ONE request for everything ("order 2 Lamb Tagine, 1 Coca-Cola from …"),
 * which the backend parses item-by-item into a single checkout — instead of each
 * tap firing a separate one-item order.
 */
export function MenuCard({ menu }: { menu: MenuView }) {
  const sendMessage = useAgentStore((s) => s.sendMessage);
  const isRunning = useAgentStore((s) => s.isRunning);
  const [cart, setCart] = useState<Record<string, number>>({});
  const base = menu.vendorName.split('·')[0].trim();

  const setQty = (id: string, next: number) =>
    setCart((c) => {
      const q = Math.max(0, Math.min(MAX_QTY, next));
      if (q === 0) {
        const { [id]: _drop, ...rest } = c;
        return rest;
      }
      return { ...c, [id]: q };
    });

  const count = Object.values(cart).reduce((s, q) => s + q, 0);
  const subtotal = menu.items.reduce((s, it) => s + (cart[it.id] ?? 0) * it.price, 0);

  const review = () => {
    if (!count || isRunning) return;
    // Compose with explicit quantities (even "1 X") and the exact menu-item names
    // so the backend's deterministic matcher resolves every line precisely.
    const parts = menu.items.filter((it) => cart[it.id]).map((it) => `${cart[it.id]} ${it.name}`);
    sendMessage(`order ${parts.join(', ')} from ${base}`);
    setCart({});
  };

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
                  {items.map((it) => {
                    const qty = cart[it.id] ?? 0;
                    return (
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
                        {qty === 0 ? (
                          <button
                            type="button"
                            onClick={() => setQty(it.id, 1)}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#9a7b1e,#f1d98a)] text-black transition-transform hover:scale-105"
                            aria-label={`Add ${it.name}`}
                            data-cursor="hover"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        ) : (
                          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-accent/30 bg-accent/[0.08] px-1 py-1">
                            <button
                              type="button"
                              onClick={() => setQty(it.id, qty - 1)}
                              className="grid h-6 w-6 place-items-center rounded-full bg-white/10 text-white/90 transition hover:bg-white/20"
                              aria-label={`Remove one ${it.name}`}
                              data-cursor="hover"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="min-w-[1.25rem] text-center text-sm font-semibold tabular-nums text-white">{qty}</span>
                            <button
                              type="button"
                              onClick={() => setQty(it.id, qty + 1)}
                              disabled={qty >= MAX_QTY}
                              className="grid h-6 w-6 place-items-center rounded-full bg-[linear-gradient(135deg,#9a7b1e,#f1d98a)] text-black transition-transform hover:scale-105 disabled:opacity-50"
                              aria-label={`Add one ${it.name}`}
                              data-cursor="hover"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Cart footer — appears once something is selected */}
        {count > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 border-t border-white/10 bg-white/[0.03] p-3"
          >
            <button
              type="button"
              onClick={() => setCart({})}
              className="shrink-0 rounded-full px-2 py-1 text-xs font-medium text-white/50 transition hover:text-white/80"
              data-cursor="hover"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={review}
              disabled={isRunning}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#9a7b1e,#f1d98a)] px-4 py-2.5 text-sm font-semibold text-black shadow-[0_4px_14px_-4px_rgba(212,175,55,0.6)] transition-transform hover:scale-[1.02] disabled:opacity-60"
              data-cursor="hover"
            >
              <ShoppingBag className="h-4 w-4" />
              Review order · {count} {count === 1 ? 'item' : 'items'} · {formatMAD(subtotal)}
            </button>
          </motion.div>
        )}
      </GlassCard>
    </motion.div>
  );
}
