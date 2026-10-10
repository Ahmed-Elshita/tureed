import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId, getActiveUser, getOnboardedUser } from "@/lib/auth";
import { PLATFORMS, calculateBoostPrice, type PlatformKey } from "@/lib/boostPricing";
import { isPaymentGatewayEnabled } from "@/lib/settings";
import { paymentProvider } from "@/lib/payments";

const VALID_PLATFORM_KEYS = Object.keys(PLATFORMS);
const MAX_DAYS = 30;

export async function GET() {
  const sellerId = await getSessionUserId();
  if (!sellerId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const boosts = await db.boostOrder.findMany({
    where: { sellerId },
    include: { product: { include: { images: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(boosts);
}

// One submit can produce TWO different things at once: an automated
// "tureed" boost (if selected) AND a manual AdRequest (if facebook/
// instagram/tiktok were selected) — a seller picking "all platforms"
// gets both, which is exactly the mixed flow the product should support.
export async function POST(req: NextRequest) {
  // getActiveUser: a suspended seller shouldn't be able to buy a boost
  // with an old session — see lib/auth.ts.
  const seller = await getOnboardedUser();
  if (!seller) {
    const loggedIn = await getActiveUser();
    return NextResponse.json({ error: loggedIn ? "onboarding_required" : "unauthorized" }, { status: loggedIn ? 403 : 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });

  const { productId, platforms, days, targetNoteAr } = body;

  // `platforms` previously went straight into PLATFORMS[p] lookups with
  // no validation — an unknown key there would throw (500) instead of a
  // clean 400, and `days` had no bounds at all (a negative or absurdly
  // large value would corrupt the price and the boost end date).
  if (typeof productId !== "string" || !productId) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (!Array.isArray(platforms) || platforms.length === 0 || !platforms.every((p) => VALID_PLATFORM_KEYS.includes(p))) {
    return NextResponse.json({ error: "invalid_platforms" }, { status: 400 });
  }
  if (!Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
    return NextResponse.json({ error: "invalid_days" }, { status: 400 });
  }
  if (targetNoteAr !== undefined && targetNoteAr !== null && (typeof targetNoteAr !== "string" || targetNoteAr.length > 1000)) {
    return NextResponse.json({ error: "invalid_target_note" }, { status: 400 });
  }

  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.sellerId !== seller.id) {
    return NextResponse.json({ error: "not_your_listing" }, { status: 403 });
  }

  const sellerId = seller.id;
  const { automatedPlatforms, manualPlatforms, pricePerDay, totalPrice, manualBudgetPerDay, manualEstimatedTotal } =
    calculateBoostPrice(platforms as PlatformKey[], days);

  let boostResult: { id: string; status: string } | null = null;
  let adRequestResult: { id: string; status: string } | null = null;

  if (automatedPlatforms.length > 0) {
    const gatewayOn = await isPaymentGatewayEnabled();
    const order = await db.boostOrder.create({
      data: {
        productId,
        sellerId,
        platforms: automatedPlatforms,
        days,
        pricePerDay,
        totalPrice,
        status: "PENDING_PAYMENT",
        viewsAtStart: product.viewCount,
        clicksAtStart: product.clickCount,
      },
    });

    if (gatewayOn) {
      const charge = await paymentProvider.charge(totalPrice, `Boost #${order.id} — ${product.titleAr}`);
      if (charge.success) {
        const now = new Date();
        const endsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        await db.boostOrder.update({
          where: { id: order.id },
          data: { status: "ACTIVE", paymentRef: charge.reference, startedAt: now, endsAt },
        });
        await db.product.update({ where: { id: productId }, data: { boostedUntil: endsAt } });
        boostResult = { id: order.id, status: "ACTIVE" };
      } else {
        boostResult = { id: order.id, status: "PENDING_PAYMENT" };
      }
    } else {
      // Payment gateway is off (the default) — the order is recorded but
      // stays PENDING_PAYMENT; nothing is charged and the listing is not
      // boosted yet. An admin turning the gateway on is what unlocks this.
      boostResult = { id: order.id, status: "PENDING_PAYMENT" };
    }
  }

  if (manualPlatforms.length > 0) {
    const created = await db.adRequest.create({
      data: {
        productId,
        sellerId,
        platforms: manualPlatforms,
        budgetPerDay: manualBudgetPerDay,
        days,
        estimatedTotal: manualEstimatedTotal,
        targetNoteAr: targetNoteAr || null,
        status: "REQUESTED",
      },
    });
    adRequestResult = { id: created.id, status: "REQUESTED" };
  }

  return NextResponse.json({ ok: true, boost: boostResult, adRequest: adRequestResult });
}
