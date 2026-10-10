import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getActiveUser, getOnboardedUser } from "@/lib/auth";
import { checkRateLimit, looksLikeDuplicate } from "@/lib/spamGuard";
import { checkPostableCategory, getEffectiveAttributes, toAttributeDefs } from "@/lib/categories";
import { checkPostableLocation } from "@/lib/locations";
import { validateAttributeValues } from "@/lib/attributeValidation";
import { isOwnedImageUrl, MAX_IMAGES_PER_LISTING } from "@/lib/storage";
import { cleanString, slugifyUnicode } from "@/lib/validate";

const CONDITIONS = ["NEW", "LIKE_NEW", "USED"];

function bad(error: string, extra: Record<string, unknown> = {}, status = 400) {
  return NextResponse.json({ error, ...extra }, { status });
}

export async function POST(req: NextRequest) {
  // getActiveUser (not getSessionUserId) so a suspended seller can't keep
  // posting with an old session cookie — see lib/auth.ts for why.
  const seller = await getOnboardedUser();
  if (!seller) {
    const loggedIn = await getActiveUser();
    return loggedIn ? bad("onboarding_required", {}, 403) : bad("unauthorized", {}, 401);
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return bad("invalid_json");

  const titleAr = cleanString(body.titleAr, 200);
  const descriptionAr = cleanString(body.descriptionAr, 5000);
  if (!titleAr) return bad("invalid_title");
  if (!descriptionAr) return bad("invalid_description");
  if (typeof body.categoryId !== "string" || typeof body.locationId !== "string") return bad("category_and_location_required");

  let price: number | null = null;
  if (body.price !== null && body.price !== undefined) {
    if (typeof body.price !== "number" || !Number.isFinite(body.price) || body.price < 0 || body.price > 100_000_000) return bad("invalid_price");
    price = body.price;
  }

  const titleEn = body.titleEn == null ? null : cleanString(body.titleEn, 200);
  const descriptionEn = body.descriptionEn == null ? null : cleanString(body.descriptionEn, 5000);
  if ((body.titleEn != null && !titleEn) || (body.descriptionEn != null && !descriptionEn)) return bad("invalid_english_text");
  if (body.condition != null && !CONDITIONS.includes(body.condition)) return bad("invalid_condition");
  for (const [key, min, max] of [["lat", -90, 90], ["lng", -180, 180]] as const) {
    if (body[key] != null && (typeof body[key] !== "number" || !Number.isFinite(body[key]) || body[key] < min || body[key] > max)) return bad("invalid_coordinates");
  }

  if (!Array.isArray(body.imageUrls) || body.imageUrls.length === 0 || body.imageUrls.length > MAX_IMAGES_PER_LISTING) return bad("invalid_images");
  if (!body.imageUrls.every(isOwnedImageUrl)) return bad("invalid_images");

  // The category must be the MOST SPECIFIC level (a leaf) and the location
  // too — otherwise a script could post in "Fashion" itself, skipping
  // Men/Women/Kids, which breaks browsing and filters.
  const categoryCheck = await checkPostableCategory(body.categoryId);
  if (!categoryCheck.ok) return bad(categoryCheck.error);
  const locationCheck = await checkPostableLocation(body.locationId);
  if (!locationCheck.ok) return bad(locationCheck.error);

  // Required dropdown fields (own + inherited from every ancestor category)
  // must be filled, and every chosen value must be a real option of that
  // field. The browser does this too, but only this check is trustworthy.
  const effective = await getEffectiveAttributes(body.categoryId);
  const attributeResult = validateAttributeValues(toAttributeDefs(effective), body.attributeValues);
  if (!attributeResult.ok) return bad(attributeResult.error, { attributeId: attributeResult.attributeId });

  // Spam guardrails: a real seller posts a handful of listings a day, not
  // dozens in minutes — and repeating the exact same title+price is almost
  // always a re-post, not a new item.
  const burst = await checkRateLimit(`listing:${seller.id}`, 10, 60 * 60); // 10/hour
  if (!burst.allowed) return bad("too_many_listings_today", {}, 429);
  if (await looksLikeDuplicate(seller.id, titleAr, price)) return bad("duplicate_listing", {}, 409);

  const product = await db.product.create({
    data: {
      titleAr,
      titleEn,
      descriptionAr,
      descriptionEn,
      slug: slugifyUnicode(titleAr),
      price,
      isNegotiable: Boolean(body.isNegotiable),
      condition: body.condition ?? null,
      categoryId: body.categoryId,
      locationId: body.locationId,
      sellerId: seller.id,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      status: "PENDING_REVIEW", // every new listing is moderated before it's public — spam/dupes still get a human look
      images: { create: body.imageUrls.map((url: string, i: number) => ({ url, sortOrder: i })) },
      attributeValues: { create: attributeResult.rows },
    },
  });

  // Not indexed for search here on purpose: PENDING_REVIEW listings must
  // never be searchable — indexing happens on admin approval.
  return NextResponse.json(product, { status: 201 });
}
