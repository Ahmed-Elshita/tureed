"use client";

import { useRouter, useSearchParams } from "next/navigation";

const STATUSES = ["PENDING_REVIEW", "PUBLISHED", "PAUSED", "REJECTED", "EXPIRED", "SOLD", "ALL"];
const LABEL: Record<string, string> = {
  PENDING_REVIEW: "بانتظار المراجعة", PUBLISHED: "منشور", PAUSED: "متوقف مؤقتًا",
  REJECTED: "مرفوض/متوقف", EXPIRED: "منتهي", SOLD: "تم بيعه", ALL: "الكل",
};

export default function ListingStatusFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const current = params.get("status") ?? "PENDING_REVIEW";
  const q = params.get("q") ?? "";

  function go(next: Record<string, string | null>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    p.delete("page");
    router.push(`?${p.toString()}`);
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <select className="field-select w-auto" value={current} onChange={(e) => go({ status: e.target.value })}>
        {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
      </select>
      <input
        className="field-select w-56"
        placeholder="بحث بعنوان الإعلان..."
        defaultValue={q}
        onKeyDown={(e) => e.key === "Enter" && go({ q: (e.target as HTMLInputElement).value || null })}
      />
    </div>
  );
}
