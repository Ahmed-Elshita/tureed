import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { isOwnedImageUrl } from "@/lib/storage";
import { normalizePhone } from "@/lib/validate";
import { GENDERS, REFERRAL_SOURCES, parseBirthDate } from "@/lib/profileFields";

function str(v: unknown, maxLen: number): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "string") return undefined;
  return v.trim().slice(0, maxLen);
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // Explicit field list: never hand the whole row back (it includes
  // internal columns like passwordHash/role/status that the client has no use for).
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, phone: true, whatsapp: true, avatarUrl: true, coverImageUrl: true,
      storeName: true, storeBio: true, isVerified: true, ratingAvg: true, ratingCount: true,
      locationId: true, location: { select: { nameAr: true, nameEn: true } },
      categoryId: true, category: { select: { nameAr: true, nameEn: true } },
      role: true, birthDate: true, gender: true, referralSource: true, marketingConsent: true, interests: { select: { categoryId: true } },
    },
  });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 });

  // Previously accepted any string of any length for every field, with
  // no format check on avatarUrl at all. None of this is a huge risk on
  // its own (React escapes text on render, <img src> can't execute
  // javascript: URLs in modern browsers) but unbounded text fields are
  // still an easy way to bloat the database or break layouts.
  const data: Record<string, string | null> = {};
  const name = str(body.name, 100);
  const storeName = str(body.storeName, 100);
  const storeBio = str(body.storeBio, 500);
  const whatsapp = str(body.whatsapp, 20);
  const avatarUrl = str(body.avatarUrl, 500);
  const coverImageUrl = str(body.coverImageUrl, 500);

  if (name !== undefined) {
    if (!name) return NextResponse.json({ error: "invalid_name" }, { status: 400 });
    data.name = name;
  }
  if (storeName !== undefined) data.storeName = storeName || null;
  if (storeBio !== undefined) data.storeBio = storeBio || null;
  if (whatsapp !== undefined) {
    const normalized = whatsapp ? normalizePhone(whatsapp) : null;
    if (whatsapp && !normalized) {
      return NextResponse.json({ error: "invalid_whatsapp" }, { status: 400 });
    }
    data.whatsapp = normalized;
  }
  if (avatarUrl !== undefined) {
    if (avatarUrl && !isOwnedImageUrl(avatarUrl)) {
      return NextResponse.json({ error: "invalid_avatar_url" }, { status: 400 });
    }
    data.avatarUrl = avatarUrl || null;
  }
  if (coverImageUrl !== undefined) {
    if (coverImageUrl && !isOwnedImageUrl(coverImageUrl)) {
      return NextResponse.json({ error: "invalid_cover_url" }, { status: 400 });
    }
    data.coverImageUrl = coverImageUrl || null;
  }

  // Both optional ("if needed" for category — a casual reseller may not
  // set one) but must reference something real when provided, same
  // defensive pattern as everywhere else: never trust a client-supplied
  // foreign key without checking it exists first.
  if (body.locationId !== undefined) {
    if (body.locationId === null || body.locationId === "") {
      data.locationId = null;
    } else if (typeof body.locationId === "string") {
      const exists = await db.location.findUnique({ where: { id: body.locationId }, select: { id: true } });
      if (!exists) return NextResponse.json({ error: "location_not_found" }, { status: 400 });
      data.locationId = body.locationId;
    } else {
      return NextResponse.json({ error: "invalid_location" }, { status: 400 });
    }
  }
  if (body.categoryId !== undefined) {
    if (body.categoryId === null || body.categoryId === "") {
      data.categoryId = null;
    } else if (typeof body.categoryId === "string") {
      const exists = await db.category.findUnique({ where: { id: body.categoryId }, select: { id: true } });
      if (!exists) return NextResponse.json({ error: "category_not_found" }, { status: 400 });
      data.categoryId = body.categoryId;
    } else {
      return NextResponse.json({ error: "invalid_category" }, { status: 400 });
    }
  }

  // Buyer / seller / both (admins keep ADMIN).
  const me = await db.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (body.role !== undefined) {
    if (!["BUYER", "SELLER", "BOTH"].includes(body.role)) return NextResponse.json({ error: "invalid_role" }, { status: 400 });
    if (me?.role !== "ADMIN") data.role = body.role;
  }

  const extra: Record<string, unknown> = {};
  if (body.birthDate !== undefined) {
    const bd = parseBirthDate(body.birthDate);
    if (!bd) return NextResponse.json({ error: "invalid_birth_date" }, { status: 400 });
    extra.birthDate = bd;
  }
  if (body.gender !== undefined) {
    if (!GENDERS.includes(body.gender)) return NextResponse.json({ error: "invalid_gender" }, { status: 400 });
    extra.gender = body.gender;
  }
  if (body.referralSource !== undefined) {
    if (body.referralSource === null || body.referralSource === "") extra.referralSource = null;
    else if (REFERRAL_SOURCES.includes(body.referralSource)) extra.referralSource = body.referralSource;
    else return NextResponse.json({ error: "invalid_referral_source" }, { status: 400 });
  }
  if (body.marketingConsent !== undefined) {
    if (typeof body.marketingConsent !== "boolean") return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    const was = await db.user.findUnique({ where: { id: userId }, select: { marketingConsent: true } });
    extra.marketingConsent = body.marketingConsent;
    if (body.marketingConsent && !was?.marketingConsent) extra.marketingConsentAt = new Date();
    if (!body.marketingConsent) extra.marketingConsentAt = null;
  }

  let interestIds: string[] | null = null;
  if (body.interestCategoryIds !== undefined) {
    const ids = body.interestCategoryIds;
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((i: unknown) => typeof i === "string")) {
      return NextResponse.json({ error: "select_at_least_one_interest" }, { status: 400 });
    }
    if (ids.length > 15) return NextResponse.json({ error: "too_many_interests" }, { status: 400 });
    interestIds = Array.from(new Set(ids as string[]));
    const found = await db.category.count({ where: { id: { in: interestIds }, isActive: true } });
    if (found !== interestIds.length) return NextResponse.json({ error: "invalid_interest_category" }, { status: 400 });
  }

  const [updated] = await db.$transaction([
    db.user.update({
      where: { id: userId },
      data: { ...data, ...extra },
      select: { id: true, name: true, whatsapp: true, avatarUrl: true, coverImageUrl: true, storeName: true, storeBio: true, locationId: true, categoryId: true },
    }),
    ...(interestIds
      ? [
          db.userInterestCategory.deleteMany({ where: { userId } }),
          db.userInterestCategory.createMany({ data: interestIds.map((categoryId) => ({ userId, categoryId })) }),
        ]
      : []),
  ]);
  return NextResponse.json(updated);
}
