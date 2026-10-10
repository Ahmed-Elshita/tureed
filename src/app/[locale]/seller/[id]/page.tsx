import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import ProductCard from "@/components/product/ProductCard";
import VerifiedBadge from "@/components/trust/VerifiedBadge";
import RatingStars from "@/components/trust/RatingStars";
import ShareButton from "@/components/product/ShareButton";
import { toCardData } from "@/lib/cardData";

// A seller's public page — anyone can open it (customer or the owner
// themselves), no login required to view or share it. Only the owner sees
// the "Edit settings" button; everything else is identical for everyone,
// the same way a Facebook Page looks the same to its own admin and to a visitor.
export default async function SellerPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const isAr = locale === "ar";
  const sessionUserId = await getSessionUserId();

  // Explicit select: a seller's public page must never leak phone/email —
  // those only ever come from the rate-limited /api/products/[id]/contact.
  const seller = await db.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, storeName: true, storeBio: true, avatarUrl: true, coverImageUrl: true,
      isVerified: true, ratingAvg: true, ratingCount: true, status: true,
      location: { select: { nameAr: true, nameEn: true } },
      category: { select: { nameAr: true, nameEn: true, slug: true } },
      products: { where: { status: "PUBLISHED" }, take: 100, include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, location: true }, orderBy: [{ boostedUntil: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }] },
    },
  }).catch(() => null);

  if (!seller || seller.status === "SUSPENDED") notFound();

  const isOwner = sessionUserId === seller.id;
  const displayName = seller.storeName ?? seller.name;
  const pageUrl = `https://tureed.example.com/${locale}/seller/${seller.id}`; // swap in the real domain once deployed

  return (
    <div className="mx-auto max-w-5xl pb-8">
      {/* Cover photo — like a Facebook Page banner. A plain gradient when
          no cover was uploaded, never a broken image. */}
      <div className="h-40 w-full overflow-hidden bg-gradient-to-br from-primary-light to-secondary sm:h-56">
        {seller.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={seller.coverImageUrl} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="px-4">
        <div className="-mt-12 flex flex-wrap items-end gap-4 sm:-mt-14">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-white bg-primary/10 shadow-lg sm:h-28 sm:w-28">
            {seller.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={seller.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-display text-3xl font-bold text-primary">{displayName.charAt(0)}</div>
            )}
          </div>

          <div className="flex-1 pb-1">
            <h1 className="flex items-center gap-2 font-display text-xl font-bold text-dark">
              {displayName}
              {seller.isVerified && <VerifiedBadge />}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-dark/50">
              <span>{seller.products.length} {isAr ? "إعلان منشور" : "active listings"}</span>
              <RatingStars avg={seller.ratingAvg ? Number(seller.ratingAvg) : null} count={seller.ratingCount} />
              {seller.location && <span>📍 {isAr ? seller.location.nameAr : seller.location.nameEn}</span>}
            </p>
          </div>

          <div className="flex shrink-0 gap-2 pb-1">
            {isOwner && (
              <a href={`/${locale}/profile/settings`} className="rounded-xl border border-gray-light bg-white px-4 py-2 text-sm font-bold text-dark">
                ⚙️ {isAr ? "تعديل الإعدادات" : "Edit settings"}
              </a>
            )}
          </div>
        </div>

        {seller.category && (
          <span className="mt-3 inline-block rounded-full bg-gray-bg px-3 py-1 text-xs font-bold text-dark/70">
            {isAr ? seller.category.nameAr : seller.category.nameEn}
          </span>
        )}
        {seller.storeBio && <p className="mt-3 max-w-xl text-sm text-dark/70">{seller.storeBio}</p>}

        <div className="mt-4 max-w-xs">
          <ShareButton title={displayName} price={null} url={pageUrl} />
        </div>

        <h2 className="mb-3 mt-8 font-display text-lg font-bold text-dark">{isAr ? "الإعلانات" : "Listings"}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {seller.products.map((p) => (
            <ProductCard key={p.id} product={toCardData(p, isAr)} />
          ))}
          {seller.products.length === 0 && <p className="col-span-full text-sm text-mute">{isAr ? "مفيش إعلانات منشورة لسه." : "No published listings yet."}</p>}
        </div>
      </div>
    </div>
  );
}
