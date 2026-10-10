import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";

const items = [
  { key: "dashboard", href: "", icon: "📊" },
  { key: "categories", href: "/categories", icon: "🗂️" },
  { key: "locations", href: "/locations", icon: "📍" },
  { key: "products", href: "/products", icon: "📦" },
  { key: "adRequests", href: "/ad-requests", icon: "📣" },
  { key: "users", href: "/users", icon: "👥" },
  { key: "contacts", href: "/contacts", icon: "🤝" },
  { key: "reports", href: "/reports", icon: "🚩" },
  { key: "analytics", href: "/analytics", icon: "📈" },
  { key: "database", href: "/database", icon: "🗄️" },
  { key: "settings", href: "/settings", icon: "⚙️" },
] as const;

export default function Sidebar() {
  const t = useTranslations("admin");
  const locale = useLocale();

  return (
    <aside className="w-56 shrink-0 bg-dark p-4 text-slate-300">
      <p className="mb-6 flex items-center gap-2 px-2 font-display text-base font-bold text-white">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-primary-light to-secondary text-[10px] font-bold text-white">
          T
        </span>
        tureed
      </p>
      <nav className="flex flex-col gap-1 text-sm font-medium">
        {items.map((item) => (
          <Link
            key={item.key}
            href={`/${locale}/admin${item.href}`}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-slate-400 hover:bg-white/10 hover:text-white"
          >
            <span className="w-4 text-center">{item.icon}</span>
            {t(item.key)}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
