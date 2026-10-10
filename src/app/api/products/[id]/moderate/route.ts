import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { indexListing, removeFromIndex } from "@/lib/search";
import { requireAdmin } from "@/lib/auth";

const ACTIONS = ["approve", "reject", "takedown", "restore"] as const;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: paramId } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const action = body?.action;
  if (!ACTIONS.includes(action)) return NextResponse.json({ error: "invalid_action" }, { status: 400 });

  if (action === "approve") {
    const product = await db.product
      .update({ where: { id: paramId }, data: { status: "PUBLISHED" }, include: { category: true, location: true } })
      .catch(() => null);
    if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await indexListing({
      id: product.id, titleAr: product.titleAr, titleEn: product.titleEn, descriptionAr: product.descriptionAr,
      price: product.price ? Number(product.price) : null, categorySlug: product.category.slug, locationSlug: product.location.slug, slug: product.slug,
    });
    return NextResponse.json({ ok: true, status: "PUBLISHED" });
  }

  if (action === "reject") {
    const rejected = await db.product.update({ where: { id: paramId }, data: { status: "REJECTED" } }).catch(() => null);
    if (!rejected) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  if (action === "takedown") {
    // Admin removing a LIVE listing for cause (as opposed to "reject",
    // which is for something that was never approved in the first place).
    const product = await db.product.update({ where: { id: paramId }, data: { status: "REJECTED", boostedUntil: null } }).catch(() => null);
    if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });
    await removeFromIndex(paramId).catch(() => {});
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  // restore: send a previously rejected/taken-down listing back through
  // moderation rather than publishing it directly again.
  const restored = await db.product.update({ where: { id: paramId }, data: { status: "PENDING_REVIEW" } }).catch(() => null);
  if (!restored) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true, status: "PENDING_REVIEW" });
}
