"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface BoostInfo {
  id: string;
  endsAt: string | null;
  viewsAtStart: number;
  clicksAtStart: number;
}

interface Props {
  productId: string;
  slug: string;
  title: string;
  imageUrl: string;
  status: string;
  viewCount: number;
  clickCount: number;
  activeBoost: BoostInfo | null;
  locale: string;
  isAr: boolean;
}

export default function MyAdRow({ slug, title, imageUrl, status, viewCount, clickCount, activeBoost, locale, isAr }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function cancelBoost() {
    if (!activeBoost) return;
    setBusy(true);
    await fetch(`/api/boosts/${activeBoost.id}/cancel`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  const statusLabel: Record<string, { ar: string; en: string }> = {
    PENDING_REVIEW: { ar: "بانتظار المراجعة", en: "Pending review" },
    PUBLISHED: { ar: "منشور", en: "Published" },
    REJECTED: { ar: "مرفوض", en: "Rejected" },
    SOLD: { ar: "تم البيع", en: "Sold" },
    EXPIRED: { ar: "منتهي", en: "Expired" },
  };

  return (
    <div className="rounded-2xl border border-gray-light bg-white p-4">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <a href={`/${locale}/product/${slug}`} className="line-clamp-1 text-sm font-bold text-dark">
            {title}
          </a>
          <p className="mt-0.5 text-xs text-mute">{isAr ? statusLabel[status]?.ar ?? status : statusLabel[status]?.en ?? status}</p>
        </div>
        {activeBoost && (
          <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
            ⚡ {isAr ? "مميز" : "Featured"}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-xl bg-gray-bg p-2">
          <p className="font-display text-lg font-bold text-dark">{viewCount}</p>
          <p className="text-[11px] text-mute">👁️ {isAr ? "مشاهدة" : "views"}</p>
        </div>
        <div className="rounded-xl bg-gray-bg p-2">
          <p className="font-display text-lg font-bold text-dark">{clickCount}</p>
          <p className="text-[11px] text-mute">📞 {isAr ? "تفاعل (اتصال/واتساب)" : "clicks (call/WhatsApp)"}</p>
        </div>
      </div>

      {activeBoost && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs">
          <span className="text-amber-800">
            +{viewCount - activeBoost.viewsAtStart} {isAr ? "مشاهدة من بداية التمييز" : "views since boost started"}
          </span>
          <button onClick={cancelBoost} disabled={busy} className="font-bold text-red-600 disabled:opacity-50">
            {isAr ? "إيقاف" : "Stop"}
          </button>
        </div>
      )}

      {!activeBoost && status === "PUBLISHED" && (
        <a
          href={`/${locale}/product/${slug}/boost`}
          className="mt-3 block rounded-xl border border-gray-light py-2 text-center text-xs font-bold text-primary"
        >
          ⚡ {isAr ? "ميّز الإعلان ده" : "Boost this listing"}
        </a>
      )}
    </div>
  );
}
