"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { locales } from "@/i18n/config";

export default function LanguageSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchTo(next: string) {
    // Replace the leading /ar or /en segment with the target locale,
    // keep the rest of the path (category, product id, etc.) intact.
    const rest = pathname.split("/").slice(2).join("/");
    router.push(`/${next}/${rest}`);
  }

  return (
    <div className="flex items-center rounded-xl border border-gray-light p-0.5 text-xs font-semibold">
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          className={`rounded-lg px-2.5 py-1 ${
            l === locale ? "bg-primary text-white" : "text-dark/60"
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
