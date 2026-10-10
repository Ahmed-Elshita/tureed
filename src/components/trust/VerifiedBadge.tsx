import { useLocale } from "next-intl";

export default function VerifiedBadge() {
  const locale = useLocale();
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
      ✓ {locale === "ar" ? "بائع موثّق" : "Verified seller"}
    </span>
  );
}
