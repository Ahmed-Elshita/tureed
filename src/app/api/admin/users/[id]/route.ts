import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const VALID_STATUSES = ["ACTIVE", "SUSPENDED", "PENDING_VERIFICATION"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: paramId } = await params;
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }
  if (body.isVerified !== undefined && typeof body.isVerified !== "boolean") {
    return NextResponse.json({ error: "invalid_isVerified" }, { status: 400 });
  }

  const updated = await db.user
    .update({
      where: { id: paramId },
      data: {
        ...(body.isVerified !== undefined ? { isVerified: body.isVerified } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
      },
    })
    .catch(() => null);

  if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(updated);
}
