"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  reason: string;
  note: string | null;
  createdAt: string;
  reporterName: string;
  productTitle: string;
  productSlug: string;
  locale: string;
}

export default function ReportRow({ id, reason, note, reporterName, productTitle, productSlug, locale }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function resolve(takeDown: boolean) {
    setBusy(true);
    await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ takeDown }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-gray-light bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <a href={`/${locale}/product/${productSlug}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-primary hover:underline">{productTitle}</a>
          <p className="mt-0.5 text-xs text-mute">بلاغ من {reporterName} · {reason}</p>
          {note && <p className="mt-1 text-xs text-dark/70">{note}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <button disabled={busy} onClick={() => resolve(false)} className="rounded-lg border border-gray-light px-3 py-1.5 text-xs font-bold text-dark disabled:opacity-50">تجاهل</button>
          <button disabled={busy} onClick={() => resolve(true)} className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">إيقاف الإعلان</button>
        </div>
      </div>
    </div>
  );
}
