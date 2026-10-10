import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSessionUserId } from "@/lib/auth";
import { getCategoryTree } from "@/lib/categories";
import { getLocationTree } from "@/lib/locations";
import ProfileForm from "@/components/profile/ProfileForm";
import LogoutButton from "@/components/profile/LogoutButton";

export default async function ProfileSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === "ar";
  const userId = await getSessionUserId();
  if (!userId) redirect(`/${locale}/login`);

  const [user, categoryTree, locationTree] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, include: { interests: { select: { categoryId: true } } } }),
    getCategoryTree().catch(() => []),
    getLocationTree().catch(() => []),
  ]);
  if (!user) redirect(`/${locale}/login`);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <a href="../" className="mb-2 inline-block text-xs font-bold text-primary">← {isAr ? "رجوع" : "Back"}</a>
      <h1 className="mb-6 font-display text-xl font-bold text-dark">{isAr ? "تعديل الإعدادات" : "Update settings"}</h1>

      <ProfileForm
        isAr={isAr}
        categoryTree={categoryTree}
        locationTree={locationTree}
        topCategories={categoryTree.map((c) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn }))}
        initial={{
          role: user.role,
          birthDate: user.birthDate ? user.birthDate.toISOString().slice(0, 10) : "",
          gender: user.gender ?? "",
          referralSource: user.referralSource ?? "",
          marketingConsent: user.marketingConsent,
          interestCategoryIds: user.interests.map((i) => i.categoryId),
          name: user.name,
          phone: user.phone,
          storeName: user.storeName ?? "",
          storeBio: user.storeBio ?? "",
          whatsapp: user.whatsapp ?? "",
          avatarUrl: user.avatarUrl ?? "",
          coverImageUrl: user.coverImageUrl ?? "",
          locationId: user.locationId,
          categoryId: user.categoryId,
        }}
      />

      <LogoutButton isAr={isAr} locale={locale} />
    </div>
  );
}
