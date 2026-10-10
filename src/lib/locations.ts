import { unstable_cache } from "next/cache";
import { db } from "./db";
import { buildTree, hasChildren, isReachable, type TreeOf } from "./tree";

export interface LocationNode {
  id: string;
  parentId: string | null;
  nameAr: string;
  nameEn: string;
  slug: string;
  isActive: boolean;
  sortOrder: number;
  lat: number | null;
  lng: number | null;
}

const LOCATION_SELECT = {
  id: true,
  parentId: true,
  nameAr: true,
  nameEn: true,
  slug: true,
  isActive: true,
  sortOrder: true,
  lat: true,
  lng: true,
} as const;

// Cached like categories (30s + invalidated by admin writes): read on most pages.
const loadLocations = unstable_cache(
  async (onlyActive: boolean): Promise<LocationNode[]> =>
    db.location.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      select: LOCATION_SELECT,
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    }),
  ["locations-flat"],
  { revalidate: 30, tags: ["taxonomy"] }
);

export async function getLocationsFlat(onlyActive = true): Promise<LocationNode[]> {
  return loadLocations(onlyActive);
}

export async function getLocationTree(): Promise<TreeOf<LocationNode>[]> {
  return buildTree(await getLocationsFlat(true));
}

// Same rule as categories: pick down to the most specific place, so
// "near me"/area filters and the map are never fuzzy.
export async function checkPostableLocation(locationId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const flat = await getLocationsFlat(true);
  if (!flat.some((l) => l.id === locationId) || !isReachable(flat, locationId)) {
    return { ok: false, error: "location_not_available" };
  }
  if (hasChildren(flat, locationId)) return { ok: false, error: "location_must_be_most_specific" };
  return { ok: true };
}
