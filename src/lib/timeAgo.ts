// A live marketplace shows freshness — "posted 5 minutes ago" tells a
// buyer the site actually has current activity. Kept dependency-free
// (no date-fns/dayjs) since this is the only relative-time need in the app.
export function timeAgo(date: Date, locale: "ar" | "en"): string {
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));


  const labels = {
    ar: {
      just_now: "الآن",
      minute: (n: number) => `من ${n} دقيقة`,
      hour: (n: number) => `من ${n} ساعة`,
      day: (n: number) => `من ${n} يوم`,
      month: (n: number) => `من ${n} شهر`,
      year: (n: number) => `من ${n} سنة`,
    },
    en: {
      just_now: "just now",
      minute: (n: number) => `${n}m ago`,
      hour: (n: number) => `${n}h ago`,
      day: (n: number) => `${n}d ago`,
      month: (n: number) => `${n}mo ago`,
      year: (n: number) => `${n}y ago`,
    },
  } as const;

  if (seconds < 60) return labels[locale].just_now;
  if (seconds < 3600) return labels[locale].minute(Math.floor(seconds / 60));
  if (seconds < 86400) return labels[locale].hour(Math.floor(seconds / 3600));
  if (seconds < 2592000) return labels[locale].day(Math.floor(seconds / 86400));
  if (seconds < 31536000) return labels[locale].month(Math.floor(seconds / 2592000));
  return labels[locale].year(Math.floor(seconds / 31536000));
}
