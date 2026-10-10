import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { db } from "@/lib/db";
import ProductCard from "@/components/product/ProductCard";
import { categoryAccent } from "@/lib/categoryStyle";
import { getCategoriesFlat } from "@/lib/categories";
import { descendantIds } from "@/lib/tree";
import { expireOldBoosts } from "@/lib/boosts";
import { toCardData } from "@/lib/cardData";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations("home");
  const isAr = locale === "ar";

  await expireOldBoosts();

  const flat = await getCategoriesFlat(true);
  const topCategories = flat.filter((c) => c.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 6);

  const rails = await Promise.all(
    topCategories.map(async (cat) => {
      // The FULL subtree, not just direct children — a 3rd/4th-level
      // category's listings used to be invisible on the home rail.
      const categoryIds = descendantIds(flat, cat.id, true);
      const listings = await db.product
        .findMany({
          where: { categoryId: { in: categoryIds }, status: "PUBLISHED" },
          orderBy: [{ boostedUntil: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
          take: 8,
          include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, location: true },
        })
        .catch(() => []);
      return { cat, listings };
    })
  );

  const badges = [
    { value: "10M+", label: isAr ? "منتج" : "products" },
    { value: "500K+", label: isAr ? "بائع" : "sellers" },
    { value: "27", label: isAr ? "محافظة" : "governorates" },
  ];

  return (
    <div>
      <section className="relative overflow-hidden bg-[radial-gradient(120%_140%_at_15%_-10%,#1e3a8a_0%,#0B1220_55%)] px-5 py-16 text-center text-white">
        <div className="relative mx-auto max-w-xl">
          <h1 className="font-display text-3xl font-extrabold sm:text-4xl">{t("heroTitle")}</h1>
          <p className="mt-3 text-white/70">{t("heroSubtitle")}</p>
          <form action={`/${locale}/search`} className="mt-7 flex overflow-hidden rounded-2xl bg-white shadow-2xl shadow-black/40">
            <input name="q" placeholder={t("searchPlaceholder")} className="flex-1 px-5 py-4 text-sm text-dark outline-none" />
            <button className="bg-primary px-6 text-sm font-bold text-white">{isAr ? "بحث" : "Search"}</button>
          </form>
          <div className="mt-7 flex justify-center gap-7">
            {badges.map((b) => (
              <div key={b.label} className="text-center">
                <b className="font-display block text-lg">{b.value}</b>
                <span className="text-xs text-white/50">{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {rails.every((r) => r.listings.length === 0) && (
        <p className="mx-auto max-w-7xl px-5 py-10 text-sm text-dark/50">
          {isAr ? "لسه مفيش أقسام أو إعلانات — أضفها من لوحة التحكم." : "No categories or listings yet — add some from the admin dashboard."}
        </p>
      )}

      {rails.map(({ cat, listings }) => {
        if (listings.length === 0) return null;
        const accent = categoryAccent(cat.slug);
        return (
          <section key={cat.id} className="mx-auto max-w-7xl px-5 py-7">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-dark">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: accent.color }} />
                {isAr ? cat.nameAr : cat.nameEn}
              </h2>
              <Link href={`/${locale}/category/${cat.slug}`} className="text-sm font-bold text-primary">{isAr ? "عرض الكل ←" : "See all →"}</Link>
            </div>
            <div className="rail">
              {listings.map((p) => (
                <div key={p.id} className="w-[180px] shrink-0">
                  <ProductCard product={toCardData(p, isAr, accent.tint)} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
