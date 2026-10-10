import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { adminGuard, jsonError } from "@/lib/apiGuard";
import { cleanString } from "@/lib/validate";

const MAX_OPTIONS_PER_ATTRIBUTE = 300;

// Add one or many dropdown options at once: { options: [{labelAr, labelEn}, ...] }
// (bulk add is how an admin loads e.g. 40 car brands in one go).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminGuard();
  if (denied) return denied;
  const { id } = await params;

  const attr = await db.categoryAttribute.findUnique({ where: { id }, include: { options: { select: { sortOrder: true, labelEn: true } } } });
  if (!attr) return jsonError("not_found", 404);
  if (attr.inputType !== "SELECT" && attr.inputType !== "MULTISELECT") return jsonError("attribute_has_no_options");

  const body = await req.json().catch(() => null);
  const incoming = Array.isArray(body?.options) ? body.options : body ? [body] : [];
  if (incoming.length === 0 || incoming.length > 100) return jsonError("invalid_options");
  if (attr.options.length + incoming.length > MAX_OPTIONS_PER_ATTRIBUTE) return jsonError("too_many_options");

  const existingEn = new Set(attr.options.map((o) => o.labelEn.trim().toLowerCase()));
  let next = attr.options.length ? Math.max(...attr.options.map((o) => o.sortOrder)) + 10 : 10;
  const rows: { attributeId: string; labelAr: string; labelEn: string; sortOrder: number }[] = [];
  for (const o of incoming) {
    const labelAr = cleanString(o?.labelAr, 100);
    const labelEn = cleanString(o?.labelEn, 100);
    if (!labelAr || !labelEn) return jsonError("invalid_option_labels");
    if (existingEn.has(labelEn.toLowerCase())) continue; // silently skip duplicates on bulk paste
    existingEn.add(labelEn.toLowerCase());
    rows.push({ attributeId: id, labelAr, labelEn, sortOrder: next });
    next += 10;
  }
  if (rows.length) await db.attributeOption.createMany({ data: rows });
  return NextResponse.json({ ok: true, created: rows.length }, { status: 201 });
}
