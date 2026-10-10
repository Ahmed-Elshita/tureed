import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminGuard, jsonError } from "@/lib/apiGuard";

// Resolve a report, optionally taking the listing down in the same action
// — that's the actual point of a moderation queue: not just "seen", but
// "acted on".
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const takeDown = body?.takeDown === true;

  const report = await db.report.findUnique({ where: { id } });
  if (!report) return jsonError("not_found", 404);

  await db.$transaction([
    db.report.update({ where: { id }, data: { resolved: true } }),
    ...(takeDown ? [db.product.update({ where: { id: report.productId }, data: { status: "REJECTED" as const, boostedUntil: null } })] : []),
  ]);

  return NextResponse.json({ ok: true });
}
