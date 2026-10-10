import { redirect } from "next/navigation";
import { getActiveUser } from "@/lib/auth";
import { getCategoryTree } from "@/lib/categories";
import { getLocationTree } from "@/lib/locations";
import OnboardingForm from "@/components/profile/OnboardingForm";

// Only same-site, same-locale paths — prevents open-redirect abuse.
function safeReturnTo(v: string | string[] | undefined, locale: string): string | null {
  if (typeof v !== "string") return null;
  return v.startsWith(`/${locale}/`) && !v.startsWith("//") && !v.includes("\\") ? v : null;
}

export default async function OnboardingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { locale } = await params;
  const { returnTo } = await searchParams;
  const isAr = locale === "ar";
  const user = await getActiveUser();
  const back = safeReturnTo(returnTo, locale);
  if (!user) redirect(`/${locale}/login${back ? `?returnTo=${encodeURIComponent(back)}` : ""}`);
  if (user.role === "ADMIN" || user.onboardingCompletedAt) redirect(back ?? `/${locale}`);

  const [categoryTree, locationTree] = await Promise.all([getCategoryTree().catch(() => []), getLocationTree().catch(() => [])]);
  const topCategories = categoryTree.map((c) => ({ id: c.id, nameAr: c.nameAr, nameEn: c.nameEn }));

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="mb-1 font-display text-xl font-bold text-dark">{isAr ? "أهلاً بيك في تريد! 👋" : "Welcome to Tureed! 👋"}</h1>
      <p className="mb-6 text-sm text-mute">
        {isAr ? "كمّل البيانات الأساسية دي عشان تقدر تتواصل مع البائعين وتنشر إعلانات." : "Complete these basics so you can contact sellers and post listings."}
      </p>
      <OnboardingForm locale={locale} locationTree={locationTree} topCategories={topCategories} returnTo={back} />
    </div>
  );
}
