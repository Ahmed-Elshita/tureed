import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminGuard, jsonError } from "@/lib/apiGuard";
import { cleanString } from "@/lib/validate";

const TYPES = ["SELECT", "MULTISELECT", "NUMBER", "BOOLEAN"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;

  const attr = await db.categoryAttribute.findUnique({ where: { id } });
  if (!attr) return jsonError("not_found", 404);

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
  for (const key of ["isRequired", "isFilterable", "isActive"] as const) {
    if (body[key] !== undefined) {
      if (typeof body[key] !== "boolean") return jsonError(`invalid_${key}`);
      data[key] = body[key];
    }
  }
  if (body.sortOrder !== undefined) {
    if (!Number.isInteger(body.sortOrder) || Math.abs(body.sortOrder) > 1_000_000) return jsonError("invalid_sortOrder");
    data.sortOrder = body.sortOrder;
  }
  // Changing the input type after sellers filled it in would leave values
  // that no longer match (an option id on a NUMBER field...), so it's only
  // allowed while no listing uses the field.
  if (body.inputType !== undefined && body.inputType !== attr.inputType) {
    if (!TYPES.includes(body.inputType)) return jsonError("invalid_inputType");
    if ((await db.productAttributeValue.count({ where: { attributeId: id } })) > 0) return jsonError("type_locked_in_use", 409);
    data.inputType = body.inputType;
  }

  const updated = await db.categoryAttribute.update({ where: { id }, data });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;

  if ((await db.productAttributeValue.count({ where: { attributeId: id } })) > 0) {
    return jsonError("in_use", 409); // hide it (isActive=false) instead — listings keep their data
  }
  try {
    await db.$transaction([
      db.attributeOption.deleteMany({ where: { attributeId: id } }),
      db.categoryAttribute.delete({ where: { id } }),
    ]);
  } catch {
    return jsonError("not_found", 404);
  }
  return NextResponse.json({ ok: true });
}
