import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import VerifiedBadge from "@/components/trust/VerifiedBadge";
import ListingManageRow from "@/components/product/ListingManageRow";

// The owner's management hub: a slim summary card (not a big settings form
// — that lives at /profile/settings now) plus full control over every
// listing regardless of status. "See your public page" is the link to
// what a customer actually sees (/seller/[id]).
export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const userId = await getSessionUserId();
  if (!userId) redirect(`/${locale}/login`);

  const user = await db.user.findUnique({
    where: { id: userId },
    include: { products: { include: { images: true }, orderBy: { createdAt: "desc" } } },
  });
  if (!user) redirect(`/${locale}/login`);

  const displayName = user.storeName ?? user.name;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-gray-light bg-white p-5">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-primary/10">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-lg font-bold text-primary">{displayName.charAt(0)}</div>
          )}
        </div>
        <div className="flex-1">
          <p className="flex items-center gap-2 font-display text-lg font-bold text-dark">
            {displayName}
            {user.isVerified && <VerifiedBadge />}
          </p>
          <p className="text-xs text-mute">{user.products.length} {isAr ? "إعلان" : "listings"}</p>
        </div>
        <div className="flex gap-2">
          <a href={`/${locale}/seller/${user.id}`} className="rounded-xl border border-gray-light px-3 py-2 text-xs font-bold text-dark">
            {isAr ? "شاهد صفحتك العامة" : "View public page"}
          </a>
          <a href={`/${locale}/profile/settings`} className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white">
            ⚙️ {isAr ? "تعديل الإعدادات" : "Update settings"}
          </a>
        </div>
      </div>

      <h2 className="mb-3 mt-8 font-display text-lg font-bold text-dark">
        {isAr ? "كل عروضي" : "All my listings"} ({user.products.length})
      </h2>
      <div className="space-y-3">
        {user.products.map((p) => (
          <ListingManageRow
            key={p.id}
            slug={p.slug}
            title={isAr ? p.titleAr : p.titleEn ?? p.titleAr}
            imageUrl={p.images[0]?.url ?? "/placeholder.svg"}
            status={p.status}
            locale={locale}
            isAr={isAr}
          />
        ))}
        {user.products.length === 0 && (
          <p className="text-sm text-mute">{isAr ? "لسه معملتش أي إعلان." : "You haven't posted any listings yet."}</p>
        )}
      </div>
    </div>
  );
}
