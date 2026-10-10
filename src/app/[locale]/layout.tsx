import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { locales, localeDirection, type Locale } from "@/i18n/config";
import { localeAlternates } from "@/lib/seo";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// Base SEO — every page can still override title/description individually
// via its own generateMetadata (see product/[id]/page.tsx for an example).
// This is generateMetadata (not a static export) specifically so metadataBase
// can be set: without it, the relative OG image URLs used throughout the app
// (/api/og?...) don't resolve to absolute URLs and social previews break.
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://tureed.example.com"),
    title: { default: "Tureed — More than a marketplace", template: "%s | Tureed" },
    description: "Buy, sell, and find real estate and services across Egypt.",
    alternates: localeAlternates(locale as Locale, "/"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const messages = await getMessages();

  return (
    <html lang={locale} dir={localeDirection[locale as Locale]}>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main className="min-h-screen">{children}</main>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
