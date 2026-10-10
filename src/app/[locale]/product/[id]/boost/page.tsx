import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import BoostForm from "@/components/product/BoostForm";

export default async function BoostPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const isAr = locale === "ar";
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) redirect(`/${locale}/login`);

  const product = await db.product.findUnique({ where: { slug: id } }).catch(() => null);
  if (!product) notFound();
  if (product.sellerId !== sessionUserId) redirect(`/${locale}/product/${id}`); // can only boost your own listing

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-1 font-display text-xl font-bold text-dark">{isAr ? "ميّز إعلانك" : "Boost your listing"}</h1>
      <p className="mb-6 text-sm text-mute">{isAr ? product.titleAr : product.titleEn ?? product.titleAr}</p>
      <BoostForm productId={product.id} locale={locale} />
    </div>
  );
}
