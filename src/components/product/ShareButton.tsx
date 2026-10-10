"use client";

import { useLocale } from "next-intl";

interface Props {
  title: string;
  price: number | null;
  url: string;
}

// This is the realistic, zero-cost version of "help the seller advertise":
// a ready-made caption + link the seller shares themselves, wherever they
// want (WhatsApp status, a Facebook group, Instagram story). We never post
// on their behalf — platforms block that, and it's a fast way to get an
// account banned. See /api/og for the preview image this link carries.
export default function ShareButton({ title, price, url }: Props) {
  const locale = useLocale();
  const isAr = locale === "ar";

  const caption = isAr
    ? `${title}${price ? ` — ${price.toLocaleString()} جنيه` : ""}\nشوفه على تريد:`
    : `${title}${price ? ` — ${price.toLocaleString()} EGP` : ""}\nCheck it out on Tureed:`;

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title, text: caption, url });
        return;
      } catch {
        /* user cancelled — fall through to nothing */
        return;
      }
    }
    // Desktop fallback: open WhatsApp Web with the caption pre-filled.
    window.open(`https://wa.me/?text=${encodeURIComponent(`${caption} ${url}`)}`, "_blank");
  }

  return (
    <button
      onClick={share}
      className="w-full rounded-xl border border-gray-light bg-white py-3 text-sm font-bold text-dark"
    >
      📤 {isAr ? "شارك الإعلان" : "Share this listing"}
    </button>
  );
}
