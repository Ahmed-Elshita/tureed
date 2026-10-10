import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminGuard, jsonError } from "@/lib/apiGuard";
import { cleanString } from "@/lib/validate";

const TYPES = ["SELECT", "MULTISELECT", "NUMBER", "BOOLEAN"];
const MAX_ATTRIBUTES_PER_CATEGORY = 40;
const MAX_INITIAL_OPTIONS = 200;

// Add a field to a category. Sellers filling in ANY category below it
// (sub, sub-sub...) will see this field too — that's the inheritance.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;

  const category = await db.category.findUnique({ where: { id }, select: { id: true } });
  if (!category) return jsonError("not_found", 404);

  const body = await req.json().catch(() => null);
  const labelAr = cleanString(body?.labelAr, 100);
  const labelEn = cleanString(body?.labelEn, 100);
  if (!labelAr || !labelEn) return jsonError("invalid_labels");
  if (!TYPES.includes(body?.inputType)) return jsonError("invalid_inputType");

  const existing = await db.categoryAttribute.findMany({ where: { categoryId: id }, select: { sortOrder: true } });
  if (existing.length >= MAX_ATTRIBUTES_PER_CATEGORY) return jsonError("too_many_attributes");

  const wantsOptions = body.inputType === "SELECT" || body.inputType === "MULTISELECT";
  const options: { labelAr: string; labelEn: string; sortOrder: number }[] = [];
  if (wantsOptions && Array.isArray(body.options)) {
    if (body.options.length > MAX_INITIAL_OPTIONS) return jsonError("too_many_options");
    for (const [i, o] of body.options.entries()) {
      const a = cleanString(o?.labelAr, 100);
      const e = cleanString(o?.labelEn, 100);
      if (!a || !e) return jsonError("invalid_option_labels");
      options.push({ labelAr: a, labelEn: e, sortOrder: (i + 1) * 10 });
    }
  }

  const attribute = await db.categoryAttribute.create({
    data: {
      categoryId: id,
      labelAr,
      labelEn,
      inputType: body.inputType,
      isRequired: body.isRequired === true,
      isFilterable: typeof body.isFilterable === "boolean" ? body.isFilterable : body.inputType !== "NUMBER",
      sortOrder: existing.length ? Math.max(...existing.map((a) => a.sortOrder)) + 10 : 10,
      options: options.length ? { create: options } : undefined,
    },
    include: { options: true },
  });
  return NextResponse.json(attribute, { status: 201 });
}
