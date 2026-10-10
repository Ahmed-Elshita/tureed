import { unstable_cache } from "next/cache";
import { db } from "./db";
import { ancestorChain, buildTree, hasChildren, isReachable, type TreeOf } from "./tree";
import type { AttributeDef } from "./attributeValidation";

export interface CategoryNode {
  id: string;
  parentId: string | null;
  nameAr: string;
  nameEn: string;
  slug: string;
  kind: "PRODUCT" | "REAL_ESTATE" | "SERVICE";
  icon: string | null;
  isActive: boolean;
  sortOrder: number;
}

const CATEGORY_SELECT = {
  id: true,
  parentId: true,
  nameAr: true,
  nameEn: true,
  slug: true,
  kind: true,
  icon: true,
  isActive: true,
  sortOrder: true,
} as const;

// The whole category table in one cheap query (a marketplace has hundreds
// of categories, not millions) — every tree operation then happens in
// memory, which is far simpler than recursive SQL and fast enough.
//
// Cached for 30s (and invalidated immediately by every admin write, see
// adminGuard): this table is read on EVERY page (header strip, forms,
// filters) but changes a few times a day — without the cache each page view
// paid several database round trips for identical data.
const loadCategories = unstable_cache(
  async (onlyActive: boolean): Promise<CategoryNode[]> =>
    db.category.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      select: CATEGORY_SELECT,
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    }),
  ["categories-flat"],
  { revalidate: 30, tags: ["taxonomy"] }
);

export async function getCategoriesFlat(onlyActive = true): Promise<CategoryNode[]> {
  return loadCategories(onlyActive);
}

// Public tree: only active nodes whose ENTIRE ancestor chain is active.
export async function getCategoryTree(): Promise<TreeOf<CategoryNode>[]> {
  return buildTree(await getCategoriesFlat(true));
}

export interface EffectiveAttribute {
  id: string;
  categoryId: string; // the category that DEFINES it (may be an ancestor)
  labelAr: string;
  labelEn: string;
  inputType: "SELECT" | "MULTISELECT" | "NUMBER" | "BOOLEAN";
  isRequired: boolean;
  isFilterable: boolean;
  options: { id: string; labelAr: string; labelEn: string }[];
}

// A listing's form = attributes of every ancestor (root first) PLUS the
// category's own. Define "Condition" once on Electronics and every phone,
// laptop and camera category inherits it — no copy/paste per leaf.
export async function getEffectiveAttributes(categoryId: string): Promise<EffectiveAttribute[]> {
  const flat = await getCategoriesFlat(true);
  const chain = ancestorChain(flat, categoryId);
  if (chain.length === 0) return [];

  const attrs = await db.categoryAttribute.findMany({
    where: { categoryId: { in: chain.map((c) => c.id) }, isActive: true },
    include: { options: { where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { labelEn: "asc" }] } },
  });

  const depth = new Map(chain.map((c, i) => [c.id, i]));
  return attrs
    .sort((a, b) => (depth.get(a.categoryId)! - depth.get(b.categoryId)!) || a.sortOrder - b.sortOrder)
    .map((a) => ({
      id: a.id,
      categoryId: a.categoryId,
      labelAr: a.labelAr,
      labelEn: a.labelEn,
      inputType: a.inputType,
      isRequired: a.isRequired,
      isFilterable: a.isFilterable,
      options: a.options.map((o) => ({ id: o.id, labelAr: o.labelAr, labelEn: o.labelEn })),
    }));
}

export function toAttributeDefs(attrs: EffectiveAttribute[]): AttributeDef[] {
  return attrs.map((a) => ({ id: a.id, inputType: a.inputType, isRequired: a.isRequired, options: a.options.map((o) => ({ id: o.id })) }));
}

// Listings may only be posted in a LEAF category that is reachable (it and
// all its ancestors are active). Otherwise a seller could post in "Fashion"
// itself and skip choosing Men/Women/Kids — breaking filters and browsing.
export async function checkPostableCategory(categoryId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const flat = await getCategoriesFlat(true);
  if (!flat.some((c) => c.id === categoryId) || !isReachable(flat, categoryId)) {
    return { ok: false, error: "category_not_available" };
  }
  if (hasChildren(flat, categoryId)) return { ok: false, error: "category_must_be_most_specific" };
  return { ok: true };
}

export async function getCategoryBreadcrumb(categoryId: string): Promise<CategoryNode[]> {
  return ancestorChain(await getCategoriesFlat(true), categoryId);
}
