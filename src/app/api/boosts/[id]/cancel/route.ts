import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: paramId } = await params;
  const sellerId = await getSessionUserId();
  if (!sellerId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const boost = await db.boostOrder.findUnique({ where: { id: paramId } });
  if (!boost || boost.sellerId !== sellerId) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await db.boostOrder.update({ where: { id: boost.id }, data: { status: "CANCELLED", endsAt: new Date() } });
  await db.product.update({ where: { id: boost.productId }, data: { boostedUntil: null } });

  return NextResponse.json({ ok: true });
}
