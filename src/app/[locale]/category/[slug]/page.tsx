import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { localeAlternates } from "@/lib/seo";
import ProductCard from "@/components/product/ProductCard";
import FilterSidebar from "@/components/product/FilterSidebar";
import SortSelect from "@/components/product/SortSelect";
import Pagination from "@/components/product/Pagination";
import CategoryMapToggle from "@/components/product/CategoryMapToggle";
import { categoryAccent } from "@/lib/categoryStyle";
import { getCategoriesFlat, getCategoryBreadcrumb, getEffectiveAttributes } from "@/lib/categories";
import { descendantIds } from "@/lib/tree";
import { getLocationTree, getLocationsFlat } from "@/lib/locations";
import { parseListingFilters, buildListingWhere, buildOrderBy, PAGE_SIZE } from "@/lib/listingQuery";
import { expireOldBoosts } from "@/lib/boosts";
import { toCardData } from "@/lib/cardData";

interface Props {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const category = await db.category.findUnique({ where: { slug } }).catch(() => null);
  if (!category) return {};
  const isAr = locale === "ar";
  return {
    title: (isAr ? category.metaTitleAr : category.metaTitleEn) ?? (isAr ? category.nameAr : category.nameEn),
    description: isAr ? category.metaDescriptionAr ?? undefined : category.metaDescriptionEn ?? undefined,
    alternates: localeAlternates(locale as "ar" | "en", `/category/${slug}`),
  };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  const isAr = locale === "ar";

  const category = await db.category.findUnique({ where: { slug } }).catch(() => null);
  if (!category || !category.isActive) notFound();

  await expireOldBoosts();

  const flat = await getCategoriesFlat(true);
  const inSubtree = flat.some((c) => c.id === category.id); // false if it or an ancestor is inactive
  if (!inSubtree) notFound();

  const categoryIds = descendantIds(flat, category.id, true); // this node + every sub/sub-sub-category
  const breadcrumb = await getCategoryBreadcrumb(category.id);
  const accent = categoryAccent(category.slug);

  // Filters shown = this category's own effective attributes (its own +
  // inherited from its ancestors). Attributes unique to a deeper leaf
  // aren't surfaced here — keeps the filter list from exploding when a
  // broad node (e.g. "Fashion") has thousands of descendant leaves.
  const effective = await getEffectiveAttributes(category.id);
  const filterableAttrs = effective.filter((a) => a.isFilterable && (a.inputType === "SELECT" || a.inputType === "MULTISELECT"));
  const allowedAttributeIds = new Set(effective.map((a) => a.id));

  const locationTree = await getLocationTree().catch(() => []);
  const locationsFlat = await getLocationsFlat(true);
  const subcategories = flat.filter((c) => c.parentId === category.id).map((c) => ({ id: c.id, slug: c.slug, name: isAr ? c.nameAr : c.nameEn }));
  const parentNode = category.parentId ? flat.find((c) => c.id === category.parentId) : undefined;
  const parentLink = parentNode ? { id: parentNode.id, slug: parentNode.slug, name: isAr ? parentNode.nameAr : parentNode.nameEn } : null;

  const filters = parseListingFilters(sp);
  const locationIds = filters.loc ? descendantIds(locationsFlat, filters.loc, true) : undefined;
  const where = buildListingWhere(filters, { categoryIds, locationIds, allowedAttributeIds });
  const orderBy = buildOrderBy(filters.sort);

  const [total, listings, locations] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({ where, orderBy, skip: (filters.page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, location: true } }),
    category.kind === "REAL_ESTATE"
      ? db.product.findMany({ where: { ...where, lat: { not: null }, lng: { not: null } }, select: { id: true, slug: true, titleAr: true, titleEn: true, price: true, lat: true, lng: true }, take: 200 })
      : Promise.resolve([]),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paramsForLinks = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : v ?? ""]));

  return (
    <div>
      <div className="border-b border-gray-light bg-white px-5 py-4">
        <div className="mx-auto max-w-7xl">
          <nav className="mb-2 flex flex-wrap items-center gap-1 text-xs text-mute">
            <a href={`/${locale}`} className="hover:text-dark">{isAr ? "الرئيسية" : "Home"}</a>
            {breadcrumb.map((c, i) => (
              <span key={c.id} className="flex items-center gap-1">
                <span>/</span>
                {i === breadcrumb.length - 1 ? (
                  <span className="font-bold text-dark">{isAr ? c.nameAr : c.nameEn}</span>
                ) : (
                  <a href={`/${locale}/category/${c.slug}`} className="hover:text-dark">{isAr ? c.nameAr : c.nameEn}</a>
                )}
              </span>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-xl" style={{ background: accent.tint, color: accent.color }}>
              {(isAr ? category.nameAr : category.nameEn).charAt(0)}
            </span>
            <h1 className="font-display text-xl font-bold text-dark">{isAr ? category.nameAr : category.nameEn}</h1>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <FilterSidebar attributes={filterableAttrs} locationTree={locationTree} isAr={isAr} locale={locale} subcategories={subcategories} parent={parentLink} />

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-mute">{total} {isAr ? "نتيجة" : "results"}</span>
              <SortSelect isAr={isAr} />
            </div>

            {category.kind === "REAL_ESTATE" && locations.length > 0 && (
              <div className="mb-5">
                <CategoryMapToggle
                  pins={locations.map((p) => ({ id: p.id, slug: p.slug, title: isAr ? p.titleAr : p.titleEn ?? p.titleAr, price: p.price ? Number(p.price) : null, lat: p.lat!, lng: p.lng! }))}
                  centerLat={Number(locations[0].lat)}
                  centerLng={Number(locations[0].lng)}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {listings.map((p) => (
                <ProductCard key={p.id} product={toCardData(p, isAr, accent.tint)} />
              ))}
              {listings.length === 0 && (
                <p className="col-span-full text-sm text-mute">{isAr ? "مفيش إعلانات مطابقة." : "No matching listings."}</p>
              )}
            </div>

            <Pagination page={filters.page} totalPages={totalPages} params={paramsForLinks} isAr={isAr} />
          </div>
        </div>
      </div>
    </div>
  );
}
