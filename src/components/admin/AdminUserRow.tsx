"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  id: string;
  name: string;
  storeName: string | null;
  avatarUrl: string | null;
  phone: string;
  role: string;
  status: string;
  isVerified: boolean;
  listingCount: number;
  locale: string;
}

export default function AdminUserRow({ id, name, storeName, avatarUrl, phone, role, status, isVerified, listingCount, locale }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const displayName = storeName ?? name;

  async function patch(data: Record<string, unknown>) {
    setBusy(true);
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-light bg-white p-3">
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-primary/10">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-primary">{displayName.charAt(0)}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-bold text-dark">
          {displayName} {isVerified && <span className="text-emerald-600">✓</span>}
        </p>
        <p className="text-xs text-mute">{phone} · {role} · {status} · {listingCount} إعلان</p>
      </div>
      <a href={`/${locale}/seller/${id}`} target="_blank" rel="noreferrer" className="rounded-lg border border-gray-light px-2.5 py-1.5 text-[11px] font-bold text-primary">
        شوف الصفحة
      </a>
      <button
        onClick={() => patch({ isVerified: !isVerified })}
        disabled={busy}
        className="rounded-lg border border-gray-light px-2.5 py-1.5 text-[11px] font-bold text-dark disabled:opacity-50"
      >
        {isVerified ? "إلغاء التوثيق" : "توثيق"}
      </button>
      <button
        onClick={() => patch({ status: status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED" })}
        disabled={busy}
        className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-bold text-red-500 disabled:opacity-50"
      >
        {status === "SUSPENDED" ? "إلغاء الإيقاف" : "إيقاف الحساب"}
      </button>
    </div>
  );
}
