import { Meilisearch } from "meilisearch";
import { unstable_cache } from "next/cache";
import { db } from "./db";
import { rankDocuments, type Doc } from "./fuzzy";

// Why Meilisearch and not a plain SQL LIKE '%...%' query: once you have
// more than a few thousand listings, LIKE queries are slow, rank nothing
// (no relevance scoring), and handle Arabic tokenization badly (no
// stemming, no typo tolerance). Meilisearch is free and self-hostable —
// a single small server (or their free-tier cloud) easily handles a
// launch-stage marketplace, and it's a drop-in HTTP service, not a
// rewrite of the data layer.
const client =
  process.env.MEILI_HOST &&
  new Meilisearch({ host: process.env.MEILI_HOST, apiKey: process.env.MEILI_API_KEY });

const INDEX = "listings";

export interface SearchableListing {
  id: string;
  titleAr: string;
  titleEn: string | null;
  descriptionAr: string;
  price: number | null;
  categorySlug: string;
  locationSlug: string;
  slug: string;
}

// Call this whenever a listing is published/updated/unpublished — keeps
// the search index in sync with Postgres (Postgres stays the source of
// truth; Meilisearch is a query accelerator, not a second database).
export async function indexListing(listing: SearchableListing) {
  if (!client) return; // no Meilisearch configured — see fallback below
  await client.index(INDEX).addDocuments([listing], { primaryKey: "id" });
}

export async function removeFromIndex(id: string) {
  if (!client) return;
  await client.index(INDEX).deleteDocument(id);
}

// Corpus for the built-in (no-Meilisearch) search: id + titles + category
// names of published listings, cached briefly so typing/searching doesn't
// hit the DB for every query. Capped for safety (MVP scale).
const loadCorpus = unstable_cache(
  async (): Promise<Doc[]> => {
    const rows = await db.product.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true, titleAr: true, titleEn: true, descriptionAr: true,
        category: { select: { nameAr: true, nameEn: true, parent: { select: { nameAr: true, nameEn: true } } } },
        location: { select: { nameAr: true, nameEn: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });
    return rows.map((p) => ({
      id: p.id,
      fields: [
        { text: `${p.titleAr} ${p.titleEn ?? ""}`, weight: 1 },
        { text: `${p.category.nameAr} ${p.category.nameEn} ${p.category.parent?.nameAr ?? ""} ${p.category.parent?.nameEn ?? ""}`, weight: 0.9 },
        { text: `${p.location.nameAr} ${p.location.nameEn}`, weight: 0.5 },
        { text: p.descriptionAr.slice(0, 300), weight: 0.4 },
      ],
    }));
  },
  ["search-corpus"],
  { revalidate: 60, tags: ["listings"] }
);

// Returns listing ids, best match first. Forgiving: typo/prefix/synonym
// tolerant, falls back to "closest results" instead of an empty page.
export async function searchListingIds(query: string, limit = 500): Promise<string[]> {
  if (client) {
    try {
      const result = await client.index(INDEX).search(query, { limit });
      if (result.hits.length) return (result.hits as SearchableListing[]).map((h) => h.id);
    } catch {
      /* Meilisearch down or index empty — use the built-in search below */
    }
  }
  return rankDocuments(query, await loadCorpus(), limit);
}

export async function searchListings(query: string, limit = 24) {
  const ids = await searchListingIds(query, limit);
  return ids.map((id) => ({ id }));
}
