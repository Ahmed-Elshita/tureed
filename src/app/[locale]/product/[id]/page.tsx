import { SITE_URL } from "@/lib/siteUrl";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { getSessionUserId } from "@/lib/auth";
import { localeAlternates } from "@/lib/seo";
import PostedTime from "@/components/trust/PostedTime";
import VerifiedBadge from "@/components/trust/VerifiedBadge";
import RatingStars from "@/components/trust/RatingStars";
import ShareButton from "@/components/product/ShareButton";
import ContactButtons from "@/components/product/ContactButtons";
import ViewTracker from "@/components/product/ViewTracker";
import BuyerActions from "@/components/product/BuyerActions";
import ReportButton from "@/components/product/ReportButton";

interface Props {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  const product = await db.product.findUnique({ where: { slug: id } }).catch(() => null);
  if (!product) return {};
  const isAr = locale === "ar";
  const title = (isAr ? product.metaTitleAr : product.metaTitleEn) ?? (isAr ? product.titleAr : product.titleEn ?? product.titleAr);
  const ogUrl = `/api/og?title=${encodeURIComponent(title)}${product.price ? `&price=${Number(product.price)}` : ""}`;

  return {
    title,
    description: isAr ? product.metaDescriptionAr ?? product.descriptionAr.slice(0, 160) : product.metaDescriptionEn ?? undefined,
    openGraph: { images: [ogUrl] },
    alternates: localeAlternates(locale as "ar" | "en", `/product/${id}`),
  };
}

export default async function ProductPage({ params }: Props) {
  const { locale, id } = await params;
  const isAr = locale === "ar";
  const t = await getTranslations("product");
  const sessionUserId = await getSessionUserId();

  // Explicit select: the seller's phone/whatsapp are deliberately left OUT
  // of this query — the page must never embed them in server-rendered
  // HTML (see ContactButtons, which fetches them on demand instead).
  const product = await db.product.findFirst({
    where: { slug: id, status: { in: ["PUBLISHED", "PAUSED"] } }, // the owner can still preview a paused listing by slug; visibility to others is enforced below
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      location: true,
      category: true,
      seller: { select: { id: true, name: true, storeName: true, isVerified: true, ratingAvg: true, ratingCount: true, status: true } },
      attributeValues: { include: { attribute: true, option: true } },
    },
  }).catch(() => null);

  const isOwner = !!product && sessionUserId === product.sellerId;
  if (!product || product.seller.status === "SUSPENDED" || (product.status === "PAUSED" && !isOwner)) notFound();

  const title = isAr ? product.titleAr : product.titleEn ?? product.titleAr;
  const shareUrl = `${SITE_URL}/${locale}/product/${product.slug}`; // swap in the real domain once deployed
  const isBoosted = !!(product.boostedUntil && product.boostedUntil > new Date());

  const [existingFavorite, existingCartItem] = sessionUserId
    ? await Promise.all([
        db.favorite.findUnique({ where: { userId_productId: { userId: sessionUserId, productId: product.id } } }),
        db.cartItem.findUnique({ where: { userId_productId: { userId: sessionUserId, productId: product.id } } }),
      ])
    : [null, null];

  // Structured data: lets Google show price/availability/rating directly in
  // search results (rich snippets) instead of a plain blue link — real,
  // measurable SEO value for a marketplace, not decoration.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    image: product.images.map((i) => i.url),
    description: (isAr ? product.descriptionAr : product.descriptionEn ?? product.descriptionAr).slice(0, 500),
    ...(product.price != null && {
      offers: {
        "@type": "Offer",
        price: Number(product.price),
        priceCurrency: product.currency,
        availability: "https://schema.org/InStock",
        url: shareUrl,
      },
    }),
    ...(product.seller.ratingCount > 0 && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: Number(product.seller.ratingAvg), reviewCount: product.seller.ratingCount },
    }),
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* eslint-disable-next-line react/no-danger -- JSON-LD must be inline for crawlers; the object above is built entirely from our own DB fields, no user-supplied HTML */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ViewTracker productId={product.id} />
      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl bg-gray-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.images[0]?.url ?? "/placeholder.svg"} alt={title} className="h-full w-full object-cover" />
          </div>
          {product.images.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {product.images.map((img) => (
                <div key={img.id} className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-gray-light">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-dark">{title}</h1>
              {isBoosted && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">⚡ {isAr ? "مميز" : "Featured"}</span>}
              {product.status === "PAUSED" && <span className="rounded-full bg-gray-light px-2.5 py-1 text-xs font-bold text-dark/60">{isAr ? "متوقف مؤقتًا" : "Paused"}</span>}
            </div>
            <PostedTime date={product.createdAt} />
          </div>
          {product.price != null && (
            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {Number(product.price).toLocaleString()} {product.currency}
              {product.isNegotiable && <span className="ms-2 text-sm font-normal text-dark/50">({t("negotiable")})</span>}
            </p>
          )}
          <p className="mt-1 text-sm text-dark/50">{t("postedIn")} {isAr ? product.location.nameAr : product.location.nameEn}</p>

          <dl className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-gray-light bg-white p-4 text-sm">
            {product.attributeValues.map((v) => (
              <div key={v.id}>
                <dt className="text-dark/50">{isAr ? v.attribute.labelAr : v.attribute.labelEn}</dt>
                <dd className="font-medium text-dark">
                  {v.option ? (isAr ? v.option.labelAr : v.option.labelEn) : v.numberValue?.toString() ?? (v.boolValue ? "✓" : "—")}
                </dd>
              </div>
            ))}
          </dl>

          <p className="mt-5 whitespace-pre-line text-sm text-dark/80">{isAr ? product.descriptionAr : product.descriptionEn ?? product.descriptionAr}</p>

          {!isOwner && (
            <div className="mt-6">
              <ContactButtons productId={product.id} listingTitle={title} callLabel={t("callNow")} waLabel={t("whatsapp")} revealLabel={isAr ? "اظهار رقم التواصل" : "Show contact number"} isAr={isAr} locale={locale} />
            </div>
          )}

          {!isOwner && (
            <BuyerActions
              productId={product.id}
              locale={locale}
              isAr={isAr}
              isLoggedIn={!!sessionUserId}
              hasFixedPrice={product.price != null}
              initialFavorited={!!existingFavorite}
              initialInCart={!!existingCartItem}
            />
          )}

          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ShareButton title={title} price={product.price != null ? Number(product.price) : null} url={shareUrl} />
            {isOwner && (
              <Link href={`/${locale}/product/${product.slug}/boost`} className="flex items-center justify-center rounded-xl border border-amber-300 bg-amber-50 py-3 text-sm font-bold text-amber-700">
                ⚡ {isAr ? "ميّز الإعلان ده" : "Boost this listing"}
              </Link>
            )}
          </div>

          <a href={`/${locale}/seller/${product.seller.id}`} className="mt-4 flex items-center justify-between rounded-xl border border-gray-light p-3 text-sm font-medium text-dark hover:bg-gray-bg">
            <span className="flex items-center gap-2">
              {product.seller.storeName ?? product.seller.name}
              {product.seller.isVerified && <VerifiedBadge />}
            </span>
            <RatingStars avg={product.seller.ratingAvg ? Number(product.seller.ratingAvg) : null} count={product.seller.ratingCount} />
          </a>

          {!isOwner && (
            <div className="mt-3">
              <ReportButton productId={product.id} isAr={isAr} isLoggedIn={!!sessionUserId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
