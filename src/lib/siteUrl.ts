// Public base URL: explicit env first, then Vercel's production domain,
// then the example fallback (only for local builds).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  "https://tureed.example.com"
).replace(/\/$/, "");
