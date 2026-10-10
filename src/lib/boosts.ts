import { db } from "./db";

// Found during review: listings were ordered by boostedUntil DESC, so a
// boost that EXPIRED yesterday still ranked above every normal listing
// (only the "Featured" badge checked the date). Expired boosts must be
// cleared. There's no cron job in this project, so this runs lazily from
// the listing pages, at most once a minute per server instance.
let lastRun = 0;

export async function expireOldBoosts(): Promise<void> {
  const now = Date.now();
  if (now - lastRun < 60_000) return;
  lastRun = now;
  const cutoff = new Date(now);
  try {
    await db.product.updateMany({ where: { boostedUntil: { lt: cutoff } }, data: { boostedUntil: null } });
    await db.boostOrder.updateMany({ where: { status: "ACTIVE", endsAt: { lt: cutoff } }, data: { status: "EXPIRED" } });
  } catch {
    /* housekeeping only — never break a page render because of it */
  }
}
