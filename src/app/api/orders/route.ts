import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId, getActiveUser, getOnboardedUser } from "@/lib/auth";
import { isPaymentGatewayEnabled } from "@/lib/settings";
import { paymentProvider } from "@/lib/payments";
import { checkRateLimit } from "@/lib/spamGuard";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const orders = await db.order.findMany({
    where: { buyerId: userId },
    include: { product: { include: { images: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(orders);
}

export async function POST(req: NextRequest) {
  // getActiveUser: a suspended buyer shouldn't be able to create
  // purchase requests with an old session.
  const buyer = await getOnboardedUser();
  if (!buyer) {
    const loggedIn = await getActiveUser();
    return NextResponse.json({ error: loggedIn ? "onboarding_required" : "unauthorized" }, { status: loggedIn ? 403 : 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.productId !== "string") {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // Nothing previously stopped one buyer from spamming "Buy Now" on the
  // same listing dozens of times, flooding the seller with fake leads.
  const burst = await checkRateLimit(`order:${buyer.id}`, 10, 60 * 60); // 10/hour across all listings
  if (!burst.allowed) {
    return NextResponse.json({ error: "too_many_order_attempts" }, { status: 429 });
  }

  const product = await db.product.findUnique({ where: { id: body.productId } });
  if (!product || product.status !== "PUBLISHED") {
    return NextResponse.json({ error: "listing_not_available" }, { status: 400 });
  }
  if (product.sellerId === buyer.id) {
    return NextResponse.json({ error: "cannot_buy_own_listing" }, { status: 400 });
  }
  if (!product.price) {
    return NextResponse.json({ error: "listing_has_no_fixed_price" }, { status: 400 });
  }

  // Don't create a second lead if the buyer already has an open one for
  // this exact listing — return the existing order instead of piling up
  // duplicates every time they tap "Buy now" again.
  const existing = await db.order.findFirst({
    where: { productId: product.id, buyerId: buyer.id, status: "PENDING_PAYMENT" },
  });
  const order =
    existing ??
    (await db.order.create({
      data: { productId: product.id, buyerId: buyer.id, sellerId: product.sellerId, price: product.price, status: "PENDING_PAYMENT" },
    }));

  const gatewayOn = await isPaymentGatewayEnabled();
  if (!gatewayOn) {
    // Default state: no real payment gateway connected. We deliberately do
    // NOT mark this as paid — it's a purchase LEAD the seller/admin can
    // follow up on, not a completed transaction. Being honest here matters
    // more than anywhere else in the app: this is real money changing hands.
    return NextResponse.json({ ok: true, orderId: order.id, status: "PENDING_PAYMENT", gatewayOn: false });
  }

  const charge = await paymentProvider.charge(Number(product.price), `Order #${order.id} — ${product.titleAr}`);
  if (charge.success) {
    await db.order.update({ where: { id: order.id }, data: { status: "PAID", paymentRef: charge.reference } });
    return NextResponse.json({ ok: true, orderId: order.id, status: "PAID", gatewayOn: true });
  }

  return NextResponse.json({ ok: true, orderId: order.id, status: "PENDING_PAYMENT", gatewayOn: true });
}
