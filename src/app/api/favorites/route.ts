import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const favorites = await db.favorite.findMany({
    where: { userId },
    include: { product: { include: { images: true, location: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(favorites);
}

export async function POST(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const productId = body?.productId;
  if (typeof productId !== "string" || !productId) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  const exists = await db.product.findUnique({ where: { id: productId }, select: { id: true } });
  if (!exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const fav = await db.favorite.upsert({
    where: { userId_productId: { userId, productId } },
    update: {},
    create: { userId, productId },
  });
  return NextResponse.json(fav, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const productId = body?.productId;
  if (typeof productId !== "string" || !productId) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  await db.favorite.deleteMany({ where: { userId, productId } });
  return NextResponse.json({ ok: true });
}
