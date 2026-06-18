import type { CheckoutDraft, TripBudget } from '@/lib/ai/types';

/**
 * Recompute a trip's budget from the CURRENT (possibly edited) receipt drafts,
 * preserving the original budget cap. Keeps the Budget panel in sync with live
 * edits — removing a dish, changing nights, or switching ride tier all flow
 * through here so stay/ride/food/total/remaining/overBudget match the receipt.
 *
 * Pure + side-effect-free so it's trivially unit-testable.
 */
export function computeLiveBudget(drafts: CheckoutDraft[], cap?: number): TripBudget {
  const sumOf = (m: CheckoutDraft['marketplace']) =>
    drafts.filter((d) => d.marketplace === m).reduce((n, d) => n + d.total, 0);
  const stay = sumOf('stays');
  const ride = sumOf('rides');
  const food = sumOf('eats');
  const total = stay + ride + food;
  return {
    stay,
    ride,
    food,
    total,
    budget: cap,
    remaining: cap != null ? cap - total : undefined,
    overBudget: cap != null && total > cap,
  };
}
