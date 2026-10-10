import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminGuard, jsonError } from "@/lib/apiGuard";
import { cleanString } from "@/lib/validate";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  if (!body) return jsonError("invalid_json");
  const data: Record<string, unknown> = {};
  for (const key of ["labelAr", "labelEn"] as const) {
    if (body[key] !== undefined) {
      const v = cleanString(body[key], 100);
      if (!v) return jsonError("invalid_labels");
      data[key] = v;
    }
  }
  if (body.isActive !== undefined) {
    if (typeof body.isActive !== "boolean") return jsonError("invalid_isActive");
    data.isActive = body.isActive;
  }
  if (body.sortOrder !== undefined) {
    if (!Number.isInteger(body.sortOrder) || Math.abs(body.sortOrder) > 1_000_000) return jsonError("invalid_sortOrder");
    data.sortOrder = body.sortOrder;
  }
  const updated = await db.attributeOption.update({ where: { id }, data }).catch(() => null);
  if (!updated) return jsonError("not_found", 404);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;
  if ((await db.productAttributeValue.count({ where: { optionId: id } })) > 0) return jsonError("in_use", 409);
  const deleted = await db.attributeOption.delete({ where: { id } }).catch(() => null);
  if (!deleted) return jsonError("not_found", 404);
  return NextResponse.json({ ok: true });
}
