import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const authorId = await getSessionUserId();
  if (!authorId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { sellerId, rating, comment } = body ?? {};

  if (typeof sellerId !== "string" || !sellerId) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "invalid_rating" }, { status: 400 });
  }
  if (comment !== undefined && comment !== null && (typeof comment !== "string" || comment.length > 1000)) {
    return NextResponse.json({ error: "invalid_comment" }, { status: 400 });
  }
  if (sellerId === authorId) {
    return NextResponse.json({ error: "cannot_review_self" }, { status: 400 });
  }

  const seller = await db.user.findUnique({ where: { id: sellerId } });
  if (!seller) return NextResponse.json({ error: "seller_not_found" }, { status: 404 });

  // Upsert on the (sellerId, authorId) unique pair: a buyer reviewing the
  // same seller again UPDATES their existing review instead of adding a
  // second one — otherwise one buyer could submit dozens of 5-star (or
  // 1-star) reviews and skew the average arbitrarily.
  await db.review.upsert({
    where: { sellerId_authorId: { sellerId, authorId } },
    update: { rating, comment },
    create: { sellerId, authorId, rating, comment },
  });

  // Recompute the denormalized aggregate so seller pages stay a single
  // cheap read instead of an AVG() query on every profile view.
  const agg = await db.review.aggregate({ where: { sellerId }, _avg: { rating: true }, _count: true });
  await db.user.update({
    where: { id: sellerId },
    data: { ratingAvg: agg._avg.rating ?? 0, ratingCount: agg._count },
  });

  return NextResponse.json({ ok: true });
}
