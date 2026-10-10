import { getRequestConfig } from "next-intl/server";
import { locales, defaultLocale, type Locale } from "./config";

function isSupportedLocale(value: string | undefined): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

// Loads the right translation file (ar.json / en.json) per request.
// Add a 3rd language by adding its json file here and to config.ts.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = isSupportedLocale(requested) ? requested : defaultLocale;
  return { locale, messages: (await import(`./${locale}.json`)).default };
});
