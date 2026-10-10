import Link from "next/link";
import { useLocale } from "next-intl";
import PostedTime from "@/components/trust/PostedTime";

export interface ProductCardData {
  id: string;
  slug: string;
  title: string;
  price: number | null;
  currency: string;
  imageUrl: string;
  locationName: string;
  accentTint?: string; // from categoryAccent(category.slug).tint
  createdAt?: Date;    // powers the "posted X ago" freshness signal
  isBoosted?: boolean;
}

// Performance note: no translate/scale transforms and no backdrop-blur
// here on purpose — those are expensive to repaint on the budget Android
// devices and slower mobile networks that make up most of this market.
// A plain border + one shadow on :hover (desktop only, via group) is
// enough affordance and costs almost nothing to render.
export default function ProductCard({ product }: { product: ProductCardData }) {
  const locale = useLocale();

  return (
    <Link
      href={`/${locale}/product/${product.slug}`}
      className="relative block shrink-0 overflow-hidden rounded-2xl border border-gray-light bg-white md:hover:shadow-md"
    >
      {product.isBoosted && (
        <span className="absolute start-2 top-2 z-10 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          ⚡
        </span>
      )}
      <div
        className="flex aspect-square w-full items-center justify-center overflow-hidden"
        style={{ background: product.accentTint ?? "#EEF2F7" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.imageUrl} alt={product.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
      </div>
      <div className="p-3">
        <p className="line-clamp-2 min-h-[2.15em] text-[13px] font-semibold text-dark">{product.title}</p>
        <p className="mt-1 font-display text-sm font-bold text-dark">
          {product.price ? `${product.price.toLocaleString()} ${product.currency}` : "—"}
        </p>
        <div className="mt-1 flex items-center justify-between gap-1">
          <p className="flex items-center gap-1 text-xs text-mute">📍 {product.locationName}</p>
          {product.createdAt && <PostedTime date={product.createdAt} />}
        </div>
      </div>
    </Link>
  );
}
