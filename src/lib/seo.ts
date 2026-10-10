import { locales, type Locale } from "@/i18n/config";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "https://tureed.example.com";

// Every indexable page should set this: tells Google "/ar/category/x" and
// "/en/category/x" are the same content in different languages (instead of
// being treated as duplicate/unrelated pages, which hurts both).
export function localeAlternates(locale: Locale, path: string) {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = `${BASE}/${l}${path}`;
  return { canonical: `${BASE}/${locale}${path}`, languages };
}
