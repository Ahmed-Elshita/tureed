import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/spamGuard";
import { getClientIp } from "@/lib/validate";

// "Reveal seller contact" — LOGGED-IN, ONBOARDED users only. Guests get
// 401 login_required and are sent to /login?returnTo=<this listing>.
// The seller's number is never in page HTML (scraper protection), and every
// reveal writes a ContactEvent row (buyer -> seller -> listing) so the admin
// can see who contacted whom.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: paramId } = await params;

  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "login_required" }, { status: 401 });
  if (user.role !== "ADMIN" && !user.onboardingCompletedAt) {
    return NextResponse.json({ error: "onboarding_required" }, { status: 403 });
  }

  const limited = await checkRateLimit(`contact:${getClientIp(req)}`, 40, 60 * 60);
  if (!limited.allowed) return NextResponse.json({ error: "too_many_requests" }, { status: 429 });

  const product = await db.product.findFirst({
    where: { id: paramId, status: "PUBLISHED" },
    select: { id: true, sellerId: true, seller: { select: { phone: true, whatsapp: true, status: true } } },
  });
  if (!product || product.seller.status === "SUSPENDED") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (product.sellerId === user.id) {
    return NextResponse.json({ error: "cannot_contact_own_listing" }, { status: 400 });
  }

  await db.$transaction([
    db.product.update({ where: { id: product.id }, data: { clickCount: { increment: 1 } } }),
    db.contactEvent.create({
      data: { buyerId: user.id, sellerId: product.sellerId, productId: product.id, type: "WHATSAPP" },
    }),
  ]);

  return NextResponse.json(
    { phone: product.seller.phone, whatsapp: product.seller.whatsapp ?? product.seller.phone },
    { headers: { "Cache-Control": "no-store" } }
  );
}
