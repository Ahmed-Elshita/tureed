// Platform config for the boost/ad flow. "tureed" is automated: paying
// for it immediately raises the listing's ranking on-site (see
// Product.boostedUntil). The other three are NOT automated — publishing
// real ads there needs Meta/TikTok Marketing API approval that doesn't
// exist yet — so selecting them doesn't charge anything; instead it
// creates an AdRequest for the marketing team to fulfill manually (see
// /api/ad-requests). `pricePerDay` on those is the ESTIMATE shown to the
// seller, not a real charge, until `automated` flips to true.
export const PLATFORMS = {
  tureed: { labelAr: "تريد (داخل الموقع)", labelEn: "Tureed (on-site)", pricePerDay: 20, automated: true },
  facebook: { labelAr: "فيسبوك", labelEn: "Facebook", pricePerDay: 25, automated: false },
  instagram: { labelAr: "إنستجرام", labelEn: "Instagram", pricePerDay: 25, automated: false },
  tiktok: { labelAr: "تيك توك", labelEn: "TikTok", pricePerDay: 30, automated: false },
} as const;

export type PlatformKey = keyof typeof PLATFORMS;

export function calculateBoostPrice(platforms: PlatformKey[], days: number) {
  const automatedPlatforms = platforms.filter((p) => PLATFORMS[p].automated);
  const manualPlatforms = platforms.filter((p) => !PLATFORMS[p].automated);

  const pricePerDay = automatedPlatforms.reduce((sum, p) => sum + PLATFORMS[p].pricePerDay, 0);
  const manualBudgetPerDay = manualPlatforms.reduce((sum, p) => sum + PLATFORMS[p].pricePerDay, 0);

  return {
    automatedPlatforms,
    manualPlatforms,
    pricePerDay,
    totalPrice: pricePerDay * days,
    manualBudgetPerDay,
    manualEstimatedTotal: manualBudgetPerDay * days,
  };
}
