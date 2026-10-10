import { NextRequest, NextResponse } from "next/server";
import { getClientIp } from "@/lib/validate";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/spamGuard";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: paramId } = await params;
  const body = await req.json().catch(() => null);
  const kind = body?.kind;
  if (kind !== "view" && kind !== "click") {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }

  // This endpoint has no auth (view/click tracking has to work for
  // anonymous visitors) and directly feeds boost analytics — without a
  // limit, a simple script loop could inflate a listing's stats or spam
  // the database indefinitely. Capped generously since real page views
  // are bursty; this is only meant to stop obvious scripted abuse.
  const ip = getClientIp(req);
  const limited = await checkRateLimit(`track:${ip}`, 60, 60); // 60/min per IP across all listings
  if (!limited.allowed) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  try {
    await db.product.update({
      where: { id: paramId },
      data: kind === "view" ? { viewCount: { increment: 1 } } : { clickCount: { increment: 1 } },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
