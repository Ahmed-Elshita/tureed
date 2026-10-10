import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminGuard, jsonError } from "@/lib/apiGuard";
import { cleanString } from "@/lib/validate";
import { getLocationsFlat } from "@/lib/locations";
import { depthOf, descendantIds, MAX_TREE_DEPTH, wouldCreateCycle } from "@/lib/tree";

function parseCoord(v: unknown, min: number, max: number): number | null | "invalid" {
  if (v === null || v === "") return null;
  return typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : "invalid";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("invalid_json");
  const flat = await getLocationsFlat(false);
  if (!flat.some((l) => l.id === id)) return jsonError("not_found", 404);

  const data: Record<string, unknown> = {};
  for (const key of ["nameAr", "nameEn"] as const) {
    if (body[key] !== undefined) {
      const v = cleanString(body[key], 100);
      if (!v) return jsonError("invalid_names");
      data[key] = v;
    }
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return jsonError("invalid_isActive");
    data.isActive = body.isActive;
  }
  if (body.sortOrder !== undefined) {
    if (!Number.isInteger(body.sortOrder) || Math.abs(body.sortOrder) > 1_000_000) return jsonError("invalid_sortOrder");
    data.sortOrder = body.sortOrder;
  }
  if (body.lat !== undefined) {
    const v = parseCoord(body.lat, -90, 90);
    if (v === "invalid") return jsonError("invalid_coordinates");
    data.lat = v;
  }
  if (body.lng !== undefined) {
    const v = parseCoord(body.lng, -180, 180);
    if (v === "invalid") return jsonError("invalid_coordinates");
    data.lng = v;
  }
  if (body.parentId !== undefined) {
    const newParentId: string | null = body.parentId === null || body.parentId === "" ? null : body.parentId;
    if (newParentId !== null) {
      if (!flat.some((l) => l.id === newParentId)) return jsonError("parent_not_found", 404);
      if (wouldCreateCycle(flat, id, newParentId)) return jsonError("cannot_move_under_itself");
      const subtree = descendantIds(flat, id, true);
      const relDepth = Math.max(...subtree.map((d) => depthOf(flat, d))) - depthOf(flat, id);
      if (depthOf(flat, newParentId) + 1 + relDepth > MAX_TREE_DEPTH) return jsonError("max_depth_reached");
    }
    data.parentId = newParentId;
  }

  const updated = await db.location.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;

  const flat = await getLocationsFlat(false);
  if (!flat.some((l) => l.id === id)) return jsonError("not_found", 404);
  if (flat.some((l) => l.parentId === id)) return jsonError("has_children", 409);
  const [products, sellers] = await Promise.all([
    db.product.count({ where: { locationId: id } }),
    db.user.count({ where: { locationId: id } }),
  ]);
  if (products > 0 || sellers > 0) return jsonError("in_use", 409);

  await db.location.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
