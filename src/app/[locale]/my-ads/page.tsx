import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import MyAdRow from "@/components/product/MyAdRow";

export default async function MyAdsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const sellerId = await getSessionUserId();
  if (!sellerId) redirect(`/${locale}/login`);

  const products = await db.product.findMany({
    where: { sellerId, boosts: { some: {} } }, // only listings that have EVER had a boost order — see /profile for all listings
    include: {
      images: true,
      boosts: { where: { status: "ACTIVE" }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 font-display text-xl font-bold text-dark">{isAr ? "متابعة إعلاناتي" : "My Ads"}</h1>
      <p className="mb-6 text-sm text-mute">
        {isAr ? "المشاهدات والتفاعل والتمييز لكل إعلاناتك" : "Views, clicks, and boosts for all your listings"}
      </p>

      <div className="space-y-3">
        {products.map((p) => {
          const activeBoost = p.boosts[0];
          return (
            <MyAdRow
              key={p.id}
              productId={p.id}
              slug={p.slug}
              title={isAr ? p.titleAr : p.titleEn ?? p.titleAr}
              imageUrl={p.images[0]?.url ?? "/placeholder.svg"}
              status={p.status}
              viewCount={p.viewCount}
              clickCount={p.clickCount}
              activeBoost={
                activeBoost
                  ? {
                      id: activeBoost.id,
                      endsAt: activeBoost.endsAt?.toISOString() ?? null,
                      viewsAtStart: activeBoost.viewsAtStart,
                      clicksAtStart: activeBoost.clicksAtStart,
                    }
                  : null
              }
              locale={locale}
              isAr={isAr}
            />
          );
        })}
        {products.length === 0 && (
          <p className="text-sm text-mute">
            {isAr ? (
              <>لسه مميزتش أي إعلان. <a href={`/${locale}/profile`} className="font-bold text-primary">اتفرج على كل عروضك من هنا</a></>
            ) : (
              <>You haven&apos;t boosted any listing yet. <a href={`/${locale}/profile`} className="font-bold text-primary">See all your listings here</a></>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
