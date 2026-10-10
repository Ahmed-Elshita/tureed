import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("brand");
  return (
    <footer className="mt-16 border-t border-gray-light bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-dark/60">
        <p className="font-display font-bold text-dark">tureed</p>
        <p className="mt-1">{t("tagline")}</p>
        <p className="mt-6">&copy; {new Date().getFullYear()} Tureed. All rights reserved.</p>
      </div>
    </footer>
  );
}
