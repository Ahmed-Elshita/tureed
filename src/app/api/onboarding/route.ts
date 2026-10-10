import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveUser } from "@/lib/auth";
import { cleanString, normalizePhone } from "@/lib/validate";
import { GENDERS, REFERRAL_SOURCES, parseBirthDate } from "@/lib/profileFields";

const ROLES = ["BUYER", "SELLER", "BOTH"] as const;
const MAX_INTERESTS = 15;

function bad(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

// Mandatory signup form: name, WhatsApp, location, buyer/seller/both and at
// least one interested category. Everything else (photo, bio…) is edited later.
export async function POST(req: NextRequest) {
  const user = await getActiveUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("invalid_json");

  const name = cleanString(body.name, 100);
  if (!name) return bad("invalid_name");
  const whatsapp = normalizePhone(body.whatsapp);
  if (!whatsapp) return bad("invalid_whatsapp");
  if (typeof body.locationId !== "string") return bad("location_required");
  const role = body.role as (typeof ROLES)[number];
  if (!ROLES.includes(role)) return bad("invalid_role");

  const birthDate = parseBirthDate(body.birthDate);
  if (!birthDate) return bad("invalid_birth_date");
  const gender = body.gender as (typeof GENDERS)[number];
  if (!GENDERS.includes(gender)) return bad("invalid_gender");
  let referralSource: (typeof REFERRAL_SOURCES)[number] | null = null;
  if (body.referralSource !== undefined && body.referralSource !== null && body.referralSource !== "") {
    if (!REFERRAL_SOURCES.includes(body.referralSource)) return bad("invalid_referral_source");
    referralSource = body.referralSource;
  }
  const marketingConsent = body.marketingConsent === true;

  const ids: unknown = body.interestCategoryIds;
  if (!Array.isArray(ids) || ids.length === 0) return bad("select_at_least_one_interest");
  if (ids.length > MAX_INTERESTS) return bad("too_many_interests");
  if (!ids.every((i) => typeof i === "string")) return bad("invalid_interest_category");
  const interestIds = Array.from(new Set(ids as string[]));

  const [location, cats] = await Promise.all([
    db.location.findUnique({ where: { id: body.locationId }, select: { id: true } }),
    db.category.findMany({ where: { id: { in: interestIds }, isActive: true }, select: { id: true } }),
  ]);
  if (!location) return bad("location_not_found");
  if (cats.length !== interestIds.length) return bad("invalid_interest_category");

  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: {
        name,
        whatsapp,
        locationId: location.id,
        // never downgrade an admin
        ...(user.role === "ADMIN" ? {} : { role }),
        birthDate,
        gender,
        referralSource,
        marketingConsent,
        marketingConsentAt: marketingConsent ? new Date() : null,
        onboardingCompletedAt: new Date(),
      },
    }),
    db.userInterestCategory.deleteMany({ where: { userId: user.id } }),
    db.userInterestCategory.createMany({ data: interestIds.map((categoryId) => ({ userId: user.id, categoryId })) }),
  ]);

  return NextResponse.json({ ok: true });
}
