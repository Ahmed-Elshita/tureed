import type { ProductCardData } from "@/components/product/ProductCard";

interface CardSource {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string | null;
  price: unknown; // Prisma Decimal | null
  currency: string;
  createdAt: Date;
  boostedUntil: Date | null;
  images: { url: string }[];
  location: { nameAr: string; nameEn: string };
}

export const PLACEHOLDER_IMAGE = "/placeholder.svg";

// One place turns a DB row into card props (previously copy-pasted in five
// pages, which is how the missing-placeholder bug got copied five times).
export function toCardData(p: CardSource, isAr: boolean, accentTint?: string): ProductCardData {
  return {
    id: p.id,
    slug: p.slug,
    title: isAr ? p.titleAr : p.titleEn ?? p.titleAr,
    price: p.price == null ? null : Number(p.price),
    currency: p.currency,
    imageUrl: p.images[0]?.url ?? PLACEHOLDER_IMAGE,
    locationName: isAr ? p.location.nameAr : p.location.nameEn,
    accentTint,
    createdAt: p.createdAt,
    isBoosted: !!(p.boostedUntil && p.boostedUntil > new Date()),
  };
}
