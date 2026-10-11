import { SITE_URL } from "@/lib/siteUrl";
import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { locales } from "@/i18n/config";

const BASE = SITE_URL;

// Without this, Next tries to pre-render the sitemap at BUILD time, which
// means every build needs a live database connection and the sitemap goes
// stale between deploys. force-dynamic computes it fresh on each request
// instead (crawlers fetch /sitemap.xml occasionally, not on every pageview,
// so there's no real traffic cost).
export const dynamic = "force-dynamic";

// Static pages + every active category + every PUBLISHED listing, in both
// languages. Capped at Google's single-sitemap limit (50k URLs) — past
// that scale this should split into a sitemap index, not needed yet.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([
    db.category.findMany({ where: { isActive: true }, select: { slug: true } }),
    db.product.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true }, take: 49000, orderBy: { updatedAt: "desc" } }),
  ]);

  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    entries.push({ url: `${BASE}/${locale}`, changeFrequency: "daily", priority: 1 });
    entries.push({ url: `${BASE}/${locale}/search`, changeFrequency: "daily", priority: 0.5 });
    for (const c of categories) entries.push({ url: `${BASE}/${locale}/category/${c.slug}`, changeFrequency: "hourly", priority: 0.8 });
    for (const p of products) entries.push({ url: `${BASE}/${locale}/product/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "daily", priority: 0.6 });
  }
  return entries;
}
