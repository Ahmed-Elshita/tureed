import Link from "next/link";
import { getTranslations, getLocale } from "next-intl/server";
import { getCategoriesFlat } from "@/lib/categories";
import { getSessionUserId } from "@/lib/auth";
import LanguageSwitch from "./LanguageSwitch";
import CategoryStrip from "./CategoryStrip";

export default async function Header() {
  // Explicitly server-side APIs (not the client-named `useTranslations`/
  // `useLocale`) — this component is an async Server Component, and these
  // are the APIs next-intl documents for that context.
  const [t, locale, sessionUserId] = await Promise.all([
    getTranslations("nav"),
    getLocale(),
    getSessionUserId(),
  ]);
  const isAr = locale === "ar";

  // Cached (see lib/categories.ts) — this runs on every single page.
  const categories = (await getCategoriesFlat(true).catch(() => [])).filter((c) => c.parentId === null);

  return (
    <header className="sticky top-0 z-40 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
        <Link href={`/${locale}`} className="flex shrink-0 items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary-light to-secondary text-white font-display font-bold shadow-lg shadow-primary/30">
            T
          </span>
          <span className="font-display text-xl font-bold text-dark">tureed</span>
        </Link>


        <div className="ms-auto flex shrink-0 items-center gap-2">
          <LanguageSwitch />
          {sessionUserId ? (
            <>
              <Link href={`/${locale}/cart`} className="rounded-xl px-2.5 py-2 text-lg" title={isAr ? "السلة" : "Cart"}>
                🛒
              </Link>
              <Link href={`/${locale}/profile`} className="hidden rounded-xl px-3 py-2 text-sm font-bold text-dark/80 sm:inline-block">
                {isAr ? "حسابي" : "Profile"}
              </Link>
              <Link href={`/${locale}/my-ads`} className="hidden rounded-xl px-3 py-2 text-sm font-bold text-dark/80 sm:inline-block">
                ⚡ {isAr ? "إعلاناتي" : "My Ads"}
              </Link>
            </>
          ) : (
            <Link href={`/${locale}/login`} className="hidden rounded-xl px-3 py-2 text-sm font-bold text-dark/80 sm:inline-block">
              {t("login")}
            </Link>
          )}
          <Link href={`/${locale}/product/new`} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary/30">
            {t("sell")}
          </Link>
        </div>
      </div>

      <CategoryStrip categories={categories} />
    </header>
  );
}
