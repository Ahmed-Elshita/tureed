"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface Props {
  productId: string;
  listingTitle: string;
  callLabel: string;
  waLabel: string;
  revealLabel: string;
  isAr: boolean;
  locale: string;
}

// The phone number is NOT in the page's HTML — it used to be embedded
// directly, which meant one scraper loop could harvest every seller's
// number straight off the sitemap. Now it's fetched only when someone
// actually taps "show number", through a rate-limited endpoint — a real
// visitor never notices the extra request; a scraper hits the limit fast.
export default function ContactButtons({ productId, listingTitle, callLabel, waLabel, revealLabel, isAr, locale }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [contact, setContact] = useState<{ phone: string; whatsapp: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function reveal() {
    setLoading(true);
    setError(false);
    const res = await fetch(`/api/products/${productId}/contact`, { method: "POST" });
    setLoading(false);
    if (res.status === 401 || res.status === 403) {
      const code = (await res.json().catch(() => ({}))).error;
      // Guests log in first, then land back on this same listing.
      const target = code === "onboarding_required" ? "onboarding" : "login";
      router.push(`/${locale}/${target}?returnTo=${encodeURIComponent(pathname)}`);
      return;
    }
    if (!res.ok) { setError(true); return; }
    setContact(await res.json());
  }

  if (!contact) {
    return (
      <div>
        <button onClick={reveal} disabled={loading} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-60">
          {loading ? (isAr ? "جاري..." : "Loading...") : `📞 ${revealLabel}`}
        </button>
        {error && <p className="mt-1 text-xs text-red-500">{isAr ? "حصل خطأ، حاول تاني" : "Something went wrong, try again"}</p>}
      </div>
    );
  }

  const whatsappText = encodeURIComponent(isAr ? `مهتم بإعلان: ${listingTitle}` : `Interested in: ${listingTitle}`);

  return (
    <div className="flex gap-3">
      <a href={`tel:${contact.phone}`} className="flex-1 rounded-xl bg-primary py-3 text-center text-sm font-semibold text-white">{callLabel}</a>
      <a href={`https://wa.me/${contact.whatsapp.replace("+", "")}?text=${whatsappText}`} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-xl border border-primary py-3 text-center text-sm font-semibold text-primary">{waLabel}</a>
    </div>
  );
}
