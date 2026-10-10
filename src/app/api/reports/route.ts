import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { checkRateLimit } from "@/lib/spamGuard";

const REASONS = ["FRAUD", "DUPLICATE", "PROHIBITED", "WRONG_CATEGORY", "OTHER"];

// Anyone logged in can flag a listing — this was entirely missing before:
// the Report table existed in the schema with no way to ever create a row.
export async function POST(req: NextRequest) {
  const reporterId = await getSessionUserId();
  if (!reporterId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const productId = body?.productId;
  const reason = body?.reason;
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : null;

  if (typeof productId !== "string" || !productId) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  if (!REASONS.includes(reason)) return NextResponse.json({ error: "invalid_reason" }, { status: 400 });

  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true, sellerId: true } });
  if (!product) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (product.sellerId === reporterId) return NextResponse.json({ error: "cannot_report_own_listing" }, { status: 400 });

  // One report per reporter per listing per hour — stops a grudge-click
  // loop from flooding the moderation queue with duplicates of the same report.
  const limited = await checkRateLimit(`report:${reporterId}:${productId}`, 1, 60 * 60);
  if (!limited.allowed) return NextResponse.json({ error: "already_reported_recently" }, { status: 429 });

  await db.report.create({ data: { productId, reporterId, reason, note } });
  return NextResponse.json({ ok: true }, { status: 201 });
}
