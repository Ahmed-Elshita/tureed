import { Meilisearch } from "meilisearch";
import { db } from "./db";

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

export async function searchListings(query: string, limit = 24) {
  if (client) {
    const result = await client.index(INDEX).search(query, { limit });
    return result.hits as SearchableListing[];
  }

  // Dev fallback with no Meilisearch running: a basic Postgres search so
  // the feature still works locally, just without relevance ranking or
  // typo tolerance. Swap MEILI_HOST in .env once you deploy a real index.
  const rows = await db.product.findMany({
    where: {
      status: "PUBLISHED",
      OR: [
        { titleAr: { contains: query, mode: "insensitive" } },
        { titleEn: { contains: query, mode: "insensitive" } },
        { descriptionAr: { contains: query, mode: "insensitive" } },
      ],
    },
    take: limit,
    include: { category: true, location: true },
  });
  return rows.map((p) => ({
    id: p.id,
    titleAr: p.titleAr,
    titleEn: p.titleEn,
    descriptionAr: p.descriptionAr,
    price: p.price ? Number(p.price) : null,
    categorySlug: p.category.slug,
    locationSlug: p.location.slug,
    slug: p.slug,
  }));
}
