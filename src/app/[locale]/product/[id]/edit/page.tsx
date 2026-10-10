import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import EditListingForm from "@/components/product/EditListingForm";

export default async function EditListingPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const isAr = locale === "ar";
  const userId = await getSessionUserId();
  if (!userId) redirect(`/${locale}/login`);

  const product = await db.product.findUnique({ where: { slug: id }, include: { images: true } });
  if (!product) notFound();
  if (product.sellerId !== userId) redirect(`/${locale}/product/${id}`);

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-6 font-display text-xl font-bold text-dark">{isAr ? "تعديل الإعلان" : "Edit listing"}</h1>
      <EditListingForm
        slug={product.slug}
        locale={locale}
        isAr={isAr}
        initial={{
          titleAr: product.titleAr,
          descriptionAr: product.descriptionAr,
          price: product.price ? Number(product.price) : null,
          isNegotiable: product.isNegotiable,
          imageUrls: product.images.map((i) => i.url),
        }}
      />
    </div>
  );
}
