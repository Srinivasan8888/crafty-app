// V3 — Crafty Pro feature gates.
//
// All callers should pass a user object containing at least subscription_tier
// and subscription_expires_at; the helpers tolerate missing fields and degrade
// to FREE. PRO is conditional on:
//   1. subscription_tier === "PRO", AND
//   2. subscription_expires_at is null (lifetime) OR in the future
// This means a webhook-driven downgrade is not required for the gate to flip
// FREE the moment the period ends — a stale tier value with a past expiry
// reads as FREE. A cron (V3.1) will reconcile the DB to match.

type UserLike = {
  subscription_tier?: string | null;
  subscription_expires_at?: Date | string | null;
};

function expiresInFuture(v: Date | string | null | undefined): boolean {
  if (v == null) return true; // no expiry = lifetime (unused today but cheap)
  const d = typeof v === "string" ? new Date(v) : v;
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return false;
  return d.getTime() > Date.now();
}

export function isPro(user: UserLike | null | undefined): boolean {
  if (!user) return false;
  if (user.subscription_tier !== "PRO") return false;
  return expiresInFuture(user.subscription_expires_at ?? null);
}

// PRD §7.3 — FREE crafters get 6 portfolio photos; PRO unlocks 12.
export function getMaxPortfolioPhotos(user: UserLike | null | undefined): number {
  return isPro(user) ? 12 : 6;
}

// V3 — product cap on Crafty's on-platform commerce. Enforced by the
// /api/products POST handler.
export function getMaxProducts(user: UserLike | null | undefined): number {
  return isPro(user) ? 25 : 5;
}

// True when the seller already has at least their tier's max non-deleted
// products, so creating another would exceed the cap. `existingCount` MUST
// be the count of the seller's products excluding status === "DELETED".
export function exceedsProductCap(
  user: UserLike | null | undefined,
  existingCount: number,
): boolean {
  return existingCount >= getMaxProducts(user);
}

// V3 — ranking nudge. The discovery ranker (future) will use:
//   score = (is_featured ? 1 : 0) * 100 + getPriorityBoost(owner) * 100 + recency
// PRO sellers float gently above FREE without overshadowing paid Featured.
export function getPriorityBoost(user: UserLike | null | undefined): number {
  return isPro(user) ? 0.5 : 0;
}
