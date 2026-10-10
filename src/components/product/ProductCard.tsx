import Link from "next/link";
import { useLocale } from "next-intl";
import CardImage from "@/components/product/CardImage";
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
      className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-light bg-white md:hover:shadow-md"
    >
      {product.isBoosted && (
        <span className="absolute start-2 top-2 z-10 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-white shadow">
          ⚡
        </span>
      )}
      {/* Fixed 4:3 image box -> every card has the same image height. */}
      <div className="aspect-[4/3] w-full shrink-0 overflow-hidden" style={{ background: product.accentTint ?? "#EEF2F7" }}>
        <CardImage src={product.imageUrl} alt={product.title} />
      </div>
      {/* Fixed-height rows -> uniform cards: 2-line title, 1-line price, 1-line meta. */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="line-clamp-2 h-[2.6em] text-[13px] font-semibold leading-[1.3] text-dark">{product.title}</p>
        <p className="truncate font-display text-sm font-bold leading-5 text-dark">
          {product.price ? `${product.price.toLocaleString()} ${product.currency}` : "—"}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 text-xs text-mute">
          <span className="min-w-0 flex-1 truncate">📍 {product.locationName}</span>
          {product.createdAt && (
            <span className="shrink-0 whitespace-nowrap">
              <PostedTime date={product.createdAt} />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
