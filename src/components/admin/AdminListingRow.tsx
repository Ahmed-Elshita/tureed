"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  title: string;
  meta: string;
  imageUrl: string;
  status: string;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-50 text-amber-700",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  PAUSED: "bg-gray-light text-dark/60",
  REJECTED: "bg-red-50 text-red-600",
  SOLD: "bg-gray-light text-dark/60",
  EXPIRED: "bg-gray-light text-dark/60",
};

export default function AdminListingRow({ id, title, meta, imageUrl, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "reject" | "takedown" | "restore") {
    setBusy(true);
    await fetch(`/api/products/${id}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    router.refresh();
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-gray-light bg-white p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-dark">{title}</p>
        <p className="text-xs text-dark/50">{meta}</p>
        <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_STYLE[status] ?? "bg-gray-light text-dark/60"}`}>{status}</span>
      </div>
      <div className="flex shrink-0 gap-2">
        {status === "PENDING_REVIEW" && (
          <>
            <button disabled={busy} onClick={() => act("approve")} className="rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">قبول</button>
            <button disabled={busy} onClick={() => act("reject")} className="rounded-xl border border-red-400 px-4 py-2 text-xs font-semibold text-red-500 disabled:opacity-50">رفض</button>
          </>
        )}
        {status === "PUBLISHED" && (
          <button disabled={busy} onClick={() => act("takedown")} className="rounded-xl border border-red-400 px-4 py-2 text-xs font-semibold text-red-500 disabled:opacity-50">إيقاف الإعلان</button>
        )}
        {(status === "REJECTED" || status === "EXPIRED") && (
          <button disabled={busy} onClick={() => act("restore")} className="rounded-xl border border-gray-light px-4 py-2 text-xs font-semibold text-dark disabled:opacity-50">إرجاعه للمراجعة</button>
        )}
      </div>
    </div>
  );
}
