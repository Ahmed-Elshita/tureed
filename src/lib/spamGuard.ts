import { db } from "./db";

// Sliding-window rate limit: "at most `limit` hits for this key in the
// last `windowSeconds`". Used for OTP requests (per phone AND per IP),
// listing creation, order attempts, uploads, and view/click tracking.
//
// Two known limitations, acceptable for this stage but worth knowing:
// 1. Count-then-insert has a small race window — two truly concurrent
//    requests can both pass the check before either is recorded, letting
//    a couple of extra hits through under heavy concurrency. Fine for
//    deterring casual abuse; not a hard guarantee under adversarial load.
// 2. The RateLimitHit table only grows — nothing deletes old rows. Add a
//    scheduled job (e.g. a daily cron) that prunes rows older than a day
//    or two before this reaches production scale.
export async function checkRateLimit(key: string, limit: number, windowSeconds: number) {
  const since = new Date(Date.now() - windowSeconds * 1000);
  const count = await db.rateLimitHit.count({ where: { key, createdAt: { gt: since } } });
  if (count >= limit) return { allowed: false as const, count };
  await db.rateLimitHit.create({ data: { key } });
  return { allowed: true as const, count: count + 1 };
}

// A very cheap first filter: the same seller posting near-identical
// title+price within a short window is almost always a duplicate/spam
// post, not two different real items. This is NOT a fraud model — it's
// a tripwire that routes suspicious posts to extra moderation scrutiny,
// it never auto-rejects (every listing already goes to PENDING_REVIEW).
export async function looksLikeDuplicate(sellerId: string, titleAr: string, price: number | null) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await db.product.findMany({
    where: { sellerId, createdAt: { gt: since } },
    select: { titleAr: true, price: true },
    take: 20,
  });
  return recent.some(
    (p) => p.titleAr.trim().toLowerCase() === titleAr.trim().toLowerCase() && Number(p.price) === price
  );
}
