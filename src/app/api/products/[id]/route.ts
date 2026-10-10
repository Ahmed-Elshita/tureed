import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId, getActiveUser } from "@/lib/auth";
import { removeFromIndex } from "@/lib/search";
import { isOwnedImageUrl, MAX_IMAGES_PER_LISTING } from "@/lib/storage";

// NOTE: despite the route param being named [id] (matching the product
// detail page's URL shape), it actually carries the listing's SLUG, not
// its database id — every caller in the UI (ListingManageRow,
// EditListingForm) passes the slug, matching how /product/[id]/page.tsx
// itself resolves by slug. This was previously a real bug: this file
// looked the product up by `id`, so every edit/pause/delete call from
// the UI silently 404'd.
async function findOwnedBySlug(slug: string, userId: string) {
  const product = await db.product.findUnique({ where: { slug } });
  if (!product || product.sellerId !== userId) return null;
  return product;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: paramId } = await params;
  // getActiveUser: a suspended seller shouldn't be able to edit content
  // back into moderation using an old session — see lib/auth.ts.
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const product = await findOwnedBySlug(paramId, user.id);
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });

  const data: Record<string, unknown> = {};

  if (body.titleAr !== undefined) {
    if (typeof body.titleAr !== "string" || body.titleAr.trim().length === 0 || body.titleAr.length > 200) {
      return NextResponse.json({ error: "invalid_title" }, { status: 400 });
    }
    data.titleAr = body.titleAr;
  }
  if (body.descriptionAr !== undefined) {
    if (typeof body.descriptionAr !== "string" || body.descriptionAr.trim().length === 0 || body.descriptionAr.length > 5000) {
      return NextResponse.json({ error: "invalid_description" }, { status: 400 });
    }
    data.descriptionAr = body.descriptionAr;
  }
  if (body.price !== undefined && body.price !== null) {
    if (typeof body.price !== "number" || !Number.isFinite(body.price) || body.price < 0 || body.price > 100_000_000) {
      return NextResponse.json({ error: "invalid_price" }, { status: 400 });
    }
    data.price = body.price;
  } else if (body.price === null) {
    data.price = null;
  }
  if (body.isNegotiable !== undefined) data.isNegotiable = Boolean(body.isNegotiable);

  // A seller can only move their own listing between PUBLISHED and
  // PAUSED — moderation states (PENDING_REVIEW, REJECTED) and terminal
  // states are not theirs to set directly.
  if (body.status !== undefined) {
    if (body.status !== "PUBLISHED" && body.status !== "PAUSED") {
      return NextResponse.json({ error: "invalid_status_transition" }, { status: 400 });
    }
    if (product.status !== "PUBLISHED" && product.status !== "PAUSED") {
      return NextResponse.json({ error: "listing_not_in_a_pausable_state" }, { status: 400 });
    }
    data.status = body.status;
  }

  // Editing content sends it back through moderation — a title/description
  // change is exactly the kind of thing review queues exist to catch.
  // Pausing/republishing (status-only) does NOT need re-review.
  const contentChanged = "titleAr" in data || "descriptionAr" in data || "price" in data || Array.isArray(body.imageUrls);
  if (contentChanged && data.status === undefined) {
    data.status = "PENDING_REVIEW";
  }

  if (Array.isArray(body.imageUrls)) {
    if (body.imageUrls.length === 0 || body.imageUrls.length > MAX_IMAGES_PER_LISTING || !body.imageUrls.every(isOwnedImageUrl)) {
      return NextResponse.json({ error: "invalid_images" }, { status: 400 });
    }
    await db.productImage.deleteMany({ where: { productId: product.id } });
    data.images = { create: body.imageUrls.map((url: string, i: number) => ({ url, sortOrder: i })) };
  }

  const updated = await db.product.update({ where: { id: product.id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: paramId } = await params;
  // Plain getSessionUserId here on purpose: deleting your own listing is
  // a cleanup action, not a new publish — a suspended seller should still
  // be able to take their own content down.
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const product = await findOwnedBySlug(paramId, userId);
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await db.product.delete({ where: { id: product.id } }); // cascades images/attributes/favorites/reports/boosts/cart/orders
  await removeFromIndex(product.id).catch(() => {});
  return NextResponse.json({ ok: true });
}
