import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminGuard, jsonError } from "@/lib/apiGuard";
import { cleanString } from "@/lib/validate";
import { getCategoriesFlat } from "@/lib/categories";
import { depthOf, descendantIds, MAX_TREE_DEPTH, wouldCreateCycle } from "@/lib/tree";

const KINDS = ["PRODUCT", "REAL_ESTATE", "SERVICE"] as const;
type Kind = (typeof KINDS)[number];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("invalid_json");

  const flat = await getCategoriesFlat(false);
  const current = flat.find((c) => c.id === id);
  if (!current) return jsonError("not_found", 404);

  const data: Record<string, unknown> = {};

  if (body.nameAr !== undefined) {
    const v = cleanString(body.nameAr, 100);
    if (!v) return jsonError("invalid_names");
    data.nameAr = v;
  }
  if (body.nameEn !== undefined) {
    const v = cleanString(body.nameEn, 100);
    if (!v) return jsonError("invalid_names");
    data.nameEn = v;
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return jsonError("invalid_isActive");
    data.isActive = body.isActive;
  }
  if (body.sortOrder !== undefined) {
    if (!Number.isInteger(body.sortOrder) || Math.abs(body.sortOrder) > 1_000_000) return jsonError("invalid_sortOrder");
    data.sortOrder = body.sortOrder;
  }
  // SEO copy is editable per category from the dashboard (empty string clears it).
  for (const [key, max] of [["metaTitleAr", 200], ["metaTitleEn", 200], ["metaDescriptionAr", 400], ["metaDescriptionEn", 400]] as const) {
    if (body[key] !== undefined) {
      if (body[key] === "" || body[key] === null) data[key] = null;
      else {
        const v = cleanString(body[key], max);
        if (!v) return jsonError(`invalid_${key}`);
        data[key] = v;
      }
    }
  }

  // Kind can only be set on a top-level category; children always follow
  // their parent, and changing a root cascades to its whole subtree.
  let newKind: Kind | null = null;
  if (body.kind !== undefined) {
    if (current.parentId !== null) return jsonError("kind_is_inherited_from_parent");
    if (!KINDS.includes(body.kind)) return jsonError("invalid_kind");
    newKind = body.kind as Kind;
  }

  let movedUnder: string | null | undefined;
  if (body.parentId !== undefined) {
    const newParentId: string | null = body.parentId === null || body.parentId === "" ? null : body.parentId;
    if (newParentId !== null) {
      const parent = flat.find((c) => c.id === newParentId);
      if (!parent) return jsonError("parent_not_found", 404);
      if (wouldCreateCycle(flat, id, newParentId)) return jsonError("cannot_move_under_itself");
      // Depth check: the deepest node of the moved subtree must still fit.
      const subtree = descendantIds(flat, id, true);
      const relDepth = Math.max(...subtree.map((d) => depthOf(flat, d))) - depthOf(flat, id);
      if (depthOf(flat, newParentId) + 1 + relDepth > MAX_TREE_DEPTH) return jsonError("max_depth_reached");
      newKind = parent.kind;
    }
    data.parentId = newParentId;
    movedUnder = newParentId;
  }

  const updated = await db.$transaction(async (tx) => {
    const row = await tx.category.update({ where: { id }, data });
    if (newKind) {
      const ids = descendantIds(flat, id, true);
      await tx.category.updateMany({ where: { id: { in: ids } }, data: { kind: newKind } });
    }
    return row;
  });

  return NextResponse.json({ ...updated, movedUnder });
}

// Delete is deliberately strict: a category with sub-categories or listings
// can't be removed (that would orphan or destroy data) — deactivate it
// instead, which hides it everywhere but keeps history intact.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;

  const flat = await getCategoriesFlat(false);
  if (!flat.some((c) => c.id === id)) return jsonError("not_found", 404);
  if (flat.some((c) => c.parentId === id)) return jsonError("has_children", 409);
  if ((await db.product.count({ where: { categoryId: id } })) > 0) return jsonError("has_products", 409);

  try {
    await db.$transaction(async (tx) => {
      const attrs = await tx.categoryAttribute.findMany({ where: { categoryId: id }, select: { id: true } });
      const attrIds = attrs.map((a) => a.id);
      await tx.attributeOption.deleteMany({ where: { attributeId: { in: attrIds } } });
      await tx.categoryAttribute.deleteMany({ where: { categoryId: id } });
      await tx.category.delete({ where: { id } });
    });
  } catch {
    return jsonError("in_use", 409); // some listing still references one of its fields
  }
  return NextResponse.json({ ok: true });
}
