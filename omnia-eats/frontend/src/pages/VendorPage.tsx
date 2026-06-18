import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Star, Clock, Bike, ArrowLeft, Plus, Minus, Loader2, CheckCircle2, LogIn, ShoppingBag } from 'lucide-react';
import { PageTransition } from '@/components/fx/PageTransition';
import { GlassCard } from '@/components/ui/GlassCard';
import { Badge } from '@/components/ui/Badge';
import { LocationMap } from '@/components/LocationMap';
import { Reviews } from '@/components/Reviews';
import { fetchVendor, createOrder } from '@/lib/api';
import { formatMAD } from '@/lib/utils';

type OrderState = 'idle' | 'loading' | 'done' | 'needAuth' | 'error';

export function VendorPage() {
  const { id } = useParams<{ id: string }>();
  const { data: vendor, isLoading } = useQuery({ queryKey: ['vendor', id], queryFn: () => fetchVendor(id!), enabled: !!id });
  const [cart, setCart] = useState<Record<string, number>>({});
  const [state, setState] = useState<OrderState>('idle');

  const setQty = (itemId: string, delta: number) =>
    setCart((c) => {
      const next = Math.max(0, (c[itemId] ?? 0) + delta);
      const copy = { ...c };
      if (next === 0) delete copy[itemId];
      else copy[itemId] = next;
      return copy;
    });

  const lines = useMemo(() => {
    if (!vendor) return [];
    return vendor.items.filter((i) => cart[i.id]).map((i) => ({ ...i, qty: cart[i.id] }));
  }, [vendor, cart]);

  // Group the menu so sides and drinks read as their own sections under the mains.
  const groups = useMemo(() => {
    if (!vendor) return [];
    const mains = vendor.items.filter((i) => i.category !== 'Sides' && i.category !== 'Drinks');
    const sides = vendor.items.filter((i) => i.category === 'Sides');
    const drinks = vendor.items.filter((i) => i.category === 'Drinks');
    return [
      { label: 'Mains', items: mains },
      { label: 'Sides', items: sides },
      { label: 'Drinks', items: drinks },
    ].filter((g) => g.items.length);
  }, [vendor]);

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const total = subtotal + (vendor?.deliveryFee ?? 0);
  const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center text-white/40"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!vendor) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-white/50">
        <p>Vendor not found.</p>
        <Link to="/" className="text-accent-soft hover:underline">← Back to kitchens</Link>
      </div>
    );
  }

  const checkout = async () => {
    if (!lines.length) return;
    setState('loading');
    const res = await createOrder({ vendorId: vendor.id, items: lines.map((l) => ({ menuItemId: l.id, qty: l.qty })) });
    if (res.needAuth) setState('needAuth');
    else if (res.ok) {
      setState('done');
      setCart({});
    } else setState('error');
  };

  return (
    <PageTransition>
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-28">
        <Link to="/" className="mb-5 inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white" data-cursor="hover">
          <ArrowLeft className="h-4 w-4" /> All kitchens
        </Link>

        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="group relative h-56 overflow-hidden rounded-[1.75rem] sm:h-72">
          {vendor.image && <img src={vendor.image} alt={vendor.name} className="h-full w-full object-cover transition-transform duration-[1200ms] ease-expo group-hover:scale-[1.05]" />}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-transparent" />
          <div className="absolute bottom-5 left-6 right-6">
            <Badge tone="accent" className="mb-2">{vendor.cuisine}</Badge>
            <h1 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">{vendor.name}</h1>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-white/70">
              {vendor.rating != null && <span className="inline-flex items-center gap-1.5 text-amber-300"><Star className="h-4 w-4 fill-current" /> {vendor.rating}</span>}
              <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4" /> ~{vendor.etaMinutes} min</span>
              <span className="inline-flex items-center gap-1.5"><Bike className="h-4 w-4" /> {vendor.deliveryFee === 0 ? 'Free delivery' : `${vendor.deliveryFee} MAD delivery`}</span>
              <span>{vendor.city}</span>
            </div>
          </div>
        </motion.div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
          {/* Menu */}
          <div>
            <h2 className="mb-4 font-serif text-2xl font-bold tracking-tight">Menu</h2>
            <div className="space-y-6">
              {groups.map((g) => (
                <div key={g.label}>
                  <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-accent-soft">{g.label}</h3>
                  <div className="space-y-3">
                    {g.items.map((it) => (
                      <GlassCard key={it.id} className="flex items-center gap-4 p-3">
                        {it.image && <img src={it.image} alt={it.name} loading="lazy" className="h-16 w-16 shrink-0 rounded-xl object-cover" />}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{it.name}</p>
                          {it.description && <p className="truncate text-sm text-white/45">{it.description}</p>}
                          <p className="mt-1 text-sm font-semibold text-gradient">{formatMAD(it.price)}</p>
                        </div>
                        {cart[it.id] ? (
                          <div className="flex items-center gap-2.5">
                            <button onClick={() => setQty(it.id, -1)} className="grid h-8 w-8 place-items-center rounded-full border border-white/15 text-white/70 hover:border-accent/50 hover:text-white" data-cursor="hover"><Minus className="h-4 w-4" /></button>
                            <span className="w-4 text-center font-semibold">{cart[it.id]}</span>
                            <button onClick={() => setQty(it.id, 1)} className="grid h-8 w-8 place-items-center rounded-full bg-[linear-gradient(135deg,#c2410c,#f97316)] text-[#fff] hover:scale-105" data-cursor="hover"><Plus className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setQty(it.id, 1)} className="inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#c2410c,#f97316)] px-4 py-2 text-sm font-semibold text-[#fff] transition-transform hover:scale-[1.03]" data-cursor="hover">
                            <Plus className="h-4 w-4" /> Add
                          </button>
                        )}
                      </GlassCard>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <h2 className="mb-4 mt-8 text-lg font-semibold tracking-tight">Delivery area</h2>
            <div className="overflow-hidden rounded-3xl border border-white/10">
              <LocationMap city={vendor.city} seed={vendor.id} className="h-60 w-full" />
            </div>

            <div className="mt-10">
              <Reviews vendorId={vendor.id} />
            </div>
          </div>

          {/* Cart */}
          <div>
            <GlassCard strong glow className="sticky top-28 p-6">
              <h3 className="flex items-center gap-2 text-lg font-semibold"><ShoppingBag className="h-5 w-5 text-accent-soft" /> Your order</h3>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-white/55">
                <span className="inline-flex items-center gap-1.5"><Bike className="h-3.5 w-3.5 text-accent-soft" /> {vendor.deliveryFee === 0 ? 'Free delivery' : `${vendor.deliveryFee} MAD delivery`}</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-accent-soft" /> ~{vendor.etaMinutes} min</span>
              </div>

              {lines.length === 0 ? (
                <p className="mt-5 text-sm text-white/45">Your cart is empty. Add a few dishes to get started.</p>
              ) : (
                <>
                  <ul className="mt-5 space-y-2 text-sm">
                    {lines.map((l) => (
                      <li key={l.id} className="flex justify-between text-white/70">
                        <span className="truncate pr-2">{l.qty} × {l.name}</span>
                        <span>{formatMAD(l.price * l.qty)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-sm text-white/60">
                    <div className="flex justify-between"><span>Subtotal</span><span>{formatMAD(subtotal)}</span></div>
                    <div className="flex justify-between"><span>Delivery</span><span>{vendor.deliveryFee === 0 ? 'Free' : formatMAD(vendor.deliveryFee)}</span></div>
                    <div className="flex justify-between font-semibold text-white"><span>Total</span><span className="text-gradient">{formatMAD(total)}</span></div>
                  </div>
                </>
              )}

              <div className="mt-5">
                {state === 'done' ? (
                  <div className="rounded-2xl bg-emerald-400/15 px-4 py-3 text-center text-sm text-emerald-300">
                    <CheckCircle2 className="mx-auto mb-1 h-5 w-5" />
                    Order placed! See it in <Link to="/orders" className="underline">My orders</Link>.
                  </div>
                ) : state === 'needAuth' ? (
                  <Link to="/sign-in" className="flex w-full items-center justify-center gap-2 rounded-full border border-accent/40 px-5 py-3 text-sm font-medium text-accent-soft hover:bg-accent/10">
                    <LogIn className="h-4 w-4" /> Sign in to order
                  </Link>
                ) : (
                  <button
                    onClick={checkout}
                    disabled={!lines.length || state === 'loading'}
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#c2410c,#f97316)] px-5 py-3 text-sm font-semibold text-[#fff] transition-transform hover:scale-[1.02] disabled:opacity-40"
                    data-cursor="hover"
                  >
                    {state === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {state === 'error' ? 'Retry' : itemCount ? `Place order · ${formatMAD(total)}` : 'Place order'}
                  </button>
                )}
                <p className="mt-2 text-center text-xs text-white/35">You won't be charged — this is a demo marketplace.</p>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
