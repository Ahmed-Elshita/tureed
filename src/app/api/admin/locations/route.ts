import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminGuard, jsonError } from "@/lib/apiGuard";
import { cleanString, slugify } from "@/lib/validate";
import { getLocationsFlat } from "@/lib/locations";
import { buildTree, depthOf, MAX_TREE_DEPTH } from "@/lib/tree";

function parseCoord(v: unknown, min: number, max: number): number | null | "invalid" {
  if (v === undefined || v === null || v === "") return null;
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : "invalid";
}

// Admin view includes INACTIVE nodes too (so they can be reactivated),
// unlike the public /api/locations which only ever returns active ones.
export async function GET() {
  const denied = await adminGuard();
  if (denied) return denied;
  const flat = await getLocationsFlat(false);
  return NextResponse.json(buildTree(flat));
}

export async function POST(req: NextRequest) {
  const denied = await adminGuard();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const nameAr = cleanString(body?.nameAr, 100);
  const nameEn = cleanString(body?.nameEn, 100);
  if (!nameAr || !nameEn) return jsonError("invalid_names");
  const lat = parseCoord(body?.lat, -90, 90);
  const lng = parseCoord(body?.lng, -180, 180);
  if (lat === "invalid" || lng === "invalid") return jsonError("invalid_coordinates");

  const flat = await getLocationsFlat(false);
  let parentId: string | null = null;
  if (typeof body?.parentId === "string" && body.parentId) {
    if (!flat.some((l) => l.id === body.parentId)) return jsonError("parent_not_found", 404);
    if (depthOf(flat, body.parentId) + 1 > MAX_TREE_DEPTH) return jsonError("max_depth_reached");
    parentId = body.parentId;
  }
  const siblings = flat.filter((l) => l.parentId === parentId);
  const sortOrder = siblings.length ? Math.max(...siblings.map((l) => l.sortOrder)) + 10 : 10;

  const location = await db.location.create({ data: { nameAr, nameEn, parentId, sortOrder, lat, lng, slug: slugify(nameEn) } });
  return NextResponse.json(location, { status: 201 });
}
