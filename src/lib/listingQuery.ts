import type { Prisma } from "@prisma/client";

// Shared by the category page AND the search page: turns URL params into a
// Prisma query. Parsing is pure (no DB) so it's unit-tested.
export const PAGE_SIZE = 24;

export type SortKey = "newest" | "price_asc" | "price_desc";

export interface ListingFilters {
  q: string | null;
  min: number | null;
  max: number | null;
  loc: string | null; // any location level (its descendants are included)
  cat: string | null; // category id (search page only; category page uses the path)
  sort: SortKey;
  page: number;
  attrs: Record<string, string[]>; // attributeId -> chosen optionIds (OR inside one attribute, AND across attributes)
}

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function num(v: string | undefined): number | null {
  if (v === undefined || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100_000_000 ? n : null;
}

const ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

export function parseListingFilters(params: Params): ListingFilters {
  const sortRaw = first(params.sort);
  const sort: SortKey = sortRaw === "price_asc" || sortRaw === "price_desc" ? sortRaw : "newest";

  const pageNum = Math.floor(Number(first(params.page)));
  const page = Number.isFinite(pageNum) && pageNum >= 1 && pageNum <= 500 ? pageNum : 1;

  const q = first(params.q)?.trim().slice(0, 100) || null;
  const loc = first(params.loc);
  const cat = first(params.cat);

  // Attribute filters travel as f_<attributeId>=<optionId>,<optionId>
  const attrs: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(params)) {
    if (!key.startsWith("f_")) continue;
    const attributeId = key.slice(2);
    if (!ID_RE.test(attributeId)) continue;
    const ids = (Array.isArray(raw) ? raw.join(",") : raw ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => ID_RE.test(s))
      .slice(0, 50);
    if (ids.length) attrs[attributeId] = ids;
  }

  return {
    q,
    min: num(first(params.min)),
    max: num(first(params.max)),
    loc: loc && ID_RE.test(loc) ? loc : null,
    cat: cat && ID_RE.test(cat) ? cat : null,
    sort,
    page,
    attrs,
  };
}

export function buildListingWhere(
  filters: ListingFilters,
  scope: { categoryIds?: string[]; locationIds?: string[]; allowedAttributeIds?: Set<string>; searchIds?: string[] | null }
): Prisma.ProductWhereInput {
  const and: Prisma.ProductWhereInput[] = [];

  // Only attributes that actually belong to the current category are
  // honoured — a crafted URL can't filter on foreign attributes.
  for (const [attributeId, optionIds] of Object.entries(filters.attrs)) {
    if (scope.allowedAttributeIds && !scope.allowedAttributeIds.has(attributeId)) continue;
    and.push({ attributeValues: { some: { attributeId, optionId: { in: optionIds } } } });
  }

  if (scope.searchIds) {
    and.push({ id: { in: scope.searchIds } });
  } else if (filters.q) {
    and.push({
      OR: [
        { titleAr: { contains: filters.q, mode: "insensitive" } },
        { titleEn: { contains: filters.q, mode: "insensitive" } },
        { descriptionAr: { contains: filters.q, mode: "insensitive" } },
      ],
    });
  }

  return {
    status: "PUBLISHED",
    ...(scope.categoryIds ? { categoryId: { in: scope.categoryIds } } : {}),
    ...(scope.locationIds ? { locationId: { in: scope.locationIds } } : {}),
    ...(filters.min !== null || filters.max !== null
      ? { price: { ...(filters.min !== null ? { gte: filters.min } : {}), ...(filters.max !== null ? { lte: filters.max } : {}) } }
      : {}),
    ...(and.length ? { AND: and } : {}),
  };
}

export function buildOrderBy(sort: SortKey): Prisma.ProductOrderByWithRelationInput[] {
  if (sort === "price_asc") return [{ price: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }];
  if (sort === "price_desc") return [{ price: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
  // Default: paid boosts first, then newest.
  return [{ boostedUntil: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }];
}

// Rebuilds a query string keeping the current filters, overriding some keys.
export function buildQuery(params: Params, overrides: Record<string, string | null> = {}): string {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    out.set(k, Array.isArray(v) ? v.join(",") : v);
  }
  for (const [k, v] of Object.entries(overrides)) {
    if (v === null) out.delete(k);
    else out.set(k, v);
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}
