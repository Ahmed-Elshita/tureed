import { db } from "@/lib/db";
import ProductCard from "@/components/product/ProductCard";
import FilterSidebar from "@/components/product/FilterSidebar";
import SortSelect from "@/components/product/SortSelect";
import Pagination from "@/components/product/Pagination";
import { getCategoryTree, getCategoriesFlat, getEffectiveAttributes } from "@/lib/categories";
import { getLocationTree, getLocationsFlat } from "@/lib/locations";
import { descendantIds } from "@/lib/tree";
import { categoryAccent } from "@/lib/categoryStyle";
import { parseListingFilters, buildListingWhere, buildOrderBy, PAGE_SIZE } from "@/lib/listingQuery";
import { searchListings } from "@/lib/search";
import { expireOldBoosts } from "@/lib/boosts";
import { toCardData } from "@/lib/cardData";

interface Props {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const isAr = locale === "ar";

  await expireOldBoosts();

  const [categoryTree, locationTree, categoriesFlat, locationsFlat] = await Promise.all([
    getCategoryTree().catch(() => []),
    getLocationTree().catch(() => []),
    getCategoriesFlat(true),
    getLocationsFlat(true),
  ]);

  const filters = parseListingFilters(sp);
  const categoryIds = filters.cat ? descendantIds(categoriesFlat, filters.cat, true) : undefined;
  const locationIds = filters.loc ? descendantIds(locationsFlat, filters.loc, true) : undefined;

  // Free-text goes through Meilisearch when configured (typo-tolerant,
  // Arabic-aware); the Postgres fallback is used automatically otherwise
  // — see lib/search.ts. Either way the id list is then combined with the
  // structured filters (price/category/location/attributes) in SQL.
  const searchIds = filters.q ? (await searchListings(filters.q, 500)).map((r) => r.id) : null;

  // When a category is chosen, also expose ITS attribute filters (brand, size…).
  const effective = filters.cat ? await getEffectiveAttributes(filters.cat) : [];
  const filterableAttrs = effective.filter((a) => a.isFilterable && (a.inputType === "SELECT" || a.inputType === "MULTISELECT"));
  const allowedAttributeIds = filters.cat ? new Set(effective.map((a) => a.id)) : new Set<string>();

  const where = buildListingWhere(filters, { categoryIds, locationIds, searchIds, allowedAttributeIds });
  const orderBy = buildOrderBy(filters.sort);

  const [total, listings] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, orderBy, skip: (filters.page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, location: true, category: true } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paramsForLinks = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : v ?? ""]));

  return (
    <div className="mx-auto max-w-7xl px-5 py-6">
      <h1 className="mb-5 font-display text-xl font-bold text-dark">{isAr ? "بحث" : "Search"}</h1>
      <div className="flex flex-col gap-6 md:flex-row md:items-start">
        <FilterSidebar attributes={filterableAttrs} categoryTree={categoryTree} locationTree={locationTree} isAr={isAr} locale={locale} showKeyword />
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm text-mute">{total} {isAr ? "نتيجة" : "results"}</span>
            <SortSelect isAr={isAr} />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {listings.map((p) => (
              <ProductCard key={p.id} product={toCardData(p, isAr, categoryAccent(p.category.slug).tint)} />
            ))}
            {listings.length === 0 && <p className="col-span-full text-sm text-mute">{isAr ? "مفيش نتائج." : "No results."}</p>}
          </div>
          <Pagination page={filters.page} totalPages={totalPages} params={paramsForLinks} isAr={isAr} />
        </div>
      </div>
    </div>
  );
}
