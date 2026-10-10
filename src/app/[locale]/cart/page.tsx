import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import CartItemRow from "@/components/product/CartItemRow";

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const userId = await getSessionUserId();
  if (!userId) redirect(`/${locale}/login`);

  const items = await db.cartItem.findMany({
    where: { userId },
    include: { product: { include: { images: true, location: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 font-display text-xl font-bold text-dark">{isAr ? "السلة" : "Your cart"}</h1>
      <div className="space-y-3">
        {items.map((item) => (
          <CartItemRow
            key={item.id}
            productId={item.product.id}
            slug={item.product.slug}
            title={isAr ? item.product.titleAr : item.product.titleEn ?? item.product.titleAr}
            price={item.product.price ? Number(item.product.price) : null}
            imageUrl={item.product.images[0]?.url ?? "/placeholder.svg"}
            locale={locale}
            isAr={isAr}
          />
        ))}
        {items.length === 0 && <p className="text-sm text-mute">{isAr ? "السلة فاضية." : "Your cart is empty."}</p>}
      </div>
    </div>
  );
}
