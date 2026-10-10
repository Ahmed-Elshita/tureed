import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminGuard, jsonError } from "@/lib/apiGuard";
import { cleanString, slugify } from "@/lib/validate";
import { getCategoriesFlat } from "@/lib/categories";
import { buildTree, depthOf, MAX_TREE_DEPTH } from "@/lib/tree";

const KINDS = ["PRODUCT", "REAL_ESTATE", "SERVICE"] as const;
type Kind = (typeof KINDS)[number];

// Create a category at ANY level: no parentId = top level, otherwise it
// becomes a child (sub-category, sub-sub-category, ...) of that parent.
// Admin view includes INACTIVE nodes too (so they can be reactivated),
// unlike the public /api/categories which only ever returns active ones.
export async function GET() {
  const denied = await adminGuard();
  if (denied) return denied;
  const flat = await getCategoriesFlat(false);
  return NextResponse.json(buildTree(flat));
}

export async function POST(req: NextRequest) {
  const denied = await adminGuard();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const nameAr = cleanString(body?.nameAr, 100);
  const nameEn = cleanString(body?.nameEn, 100);
  if (!nameAr || !nameEn) return jsonError("invalid_names");

  const flat = await getCategoriesFlat(false);
  let kind: Kind = KINDS.includes(body?.kind) ? (body.kind as Kind) : "PRODUCT";
  let parentId: string | null = null;

  if (typeof body?.parentId === "string" && body.parentId) {
    const parent = flat.find((c) => c.id === body.parentId);
    if (!parent) return jsonError("parent_not_found", 404);
    if (depthOf(flat, parent.id) + 1 > MAX_TREE_DEPTH) return jsonError("max_depth_reached");
    parentId = parent.id;
    kind = parent.kind; // a sub-category always belongs to its parent's kind (products/real estate/services)
  }

  const siblings = flat.filter((c) => c.parentId === parentId);
  const sortOrder = siblings.length ? Math.max(...siblings.map((c) => c.sortOrder)) + 10 : 10;

  const category = await db.category.create({
    data: { nameAr, nameEn, kind, parentId, sortOrder, slug: slugify(nameEn) },
  });
  return NextResponse.json(category, { status: 201 });
}
