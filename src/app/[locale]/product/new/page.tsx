import { redirect } from "next/navigation";
import { getActiveUser } from "@/lib/auth";
import { getCategoryTree } from "@/lib/categories";
import { getLocationTree } from "@/lib/locations";
import NewListingWizard from "@/components/product/NewListingWizard";

export default async function NewListingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  // Previously a guest could fill the whole form and only learn at the very
  // end (on submit) that they needed to log in. Redirect up front instead.
  const user = await getActiveUser();
  const back = encodeURIComponent(`/${locale}/product/new`);
  if (!user) redirect(`/${locale}/login?returnTo=${back}`);
  if (user.role !== "ADMIN" && !user.onboardingCompletedAt) redirect(`/${locale}/onboarding?returnTo=${back}`);

  // Trees are loaded on the server and passed down: no client-side fetch
  // waterfall before the first dropdown can render (matters on slow networks).
  const [categoryTree, locationTree] = await Promise.all([getCategoryTree().catch(() => []), getLocationTree().catch(() => [])]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <NewListingWizard locale={locale} categoryTree={categoryTree} locationTree={locationTree} />
    </div>
  );
}
