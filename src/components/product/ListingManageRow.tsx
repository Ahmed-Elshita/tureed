"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  slug: string;
  title: string;
  imageUrl: string;
  status: string;
  locale: string;
  isAr: boolean;
}

const STATUS_LABEL: Record<string, { ar: string; en: string; color: string }> = {
  PENDING_REVIEW: { ar: "بانتظار المراجعة", en: "Pending review", color: "text-amber-600" },
  PUBLISHED: { ar: "منشور", en: "Published", color: "text-emerald-600" },
  PAUSED: { ar: "متوقف مؤقتًا", en: "Paused", color: "text-mute" },
  REJECTED: { ar: "مرفوض", en: "Rejected", color: "text-red-500" },
  SOLD: { ar: "تم البيع", en: "Sold", color: "text-mute" },
  EXPIRED: { ar: "منتهي", en: "Expired", color: "text-mute" },
};

export default function ListingManageRow({ slug, title, imageUrl, status, locale, isAr }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(status);

  async function togglePause() {
    setBusy(true);
    const next = currentStatus === "PAUSED" ? "PUBLISHED" : "PAUSED";
    const res = await fetch(`/api/products/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    if (res.ok) setCurrentStatus(next);
  }

  async function remove() {
    if (!confirm(isAr ? "متأكد إنك عايز تمسح الإعلان ده نهائيًا؟" : "Delete this listing permanently?")) return;
    setBusy(true);
    await fetch(`/api/products/${slug}`, { method: "DELETE" });
    router.refresh();
  }

  const label = STATUS_LABEL[currentStatus] ?? { ar: currentStatus, en: currentStatus, color: "text-mute" };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-light bg-white p-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <a href={`/${locale}/product/${slug}`} className="line-clamp-1 text-sm font-bold text-dark">
          {title}
        </a>
        <p className={`mt-0.5 text-xs font-medium ${label.color}`}>{isAr ? label.ar : label.en}</p>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
        <a href={`/${locale}/product/${slug}/edit`} className="rounded-lg border border-gray-light px-2.5 py-1.5 text-[11px] font-bold text-dark">
          {isAr ? "تعديل" : "Edit"}
        </a>
        {(currentStatus === "PUBLISHED" || currentStatus === "PAUSED") && (
          <button onClick={togglePause} disabled={busy} className="rounded-lg border border-gray-light px-2.5 py-1.5 text-[11px] font-bold text-dark disabled:opacity-50">
            {currentStatus === "PAUSED" ? (isAr ? "تفعيل" : "Resume") : isAr ? "إيقاف" : "Pause"}
          </button>
        )}
        <button onClick={remove} disabled={busy} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-bold text-red-500 disabled:opacity-50">
          {isAr ? "حذف" : "Delete"}
        </button>
      </div>
    </div>
  );
}
