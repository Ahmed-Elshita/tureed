"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { buildQuery } from "@/lib/listingQuery";

// Full-width keyword bar above the results; keeps every other filter.
export default function SearchTopBar({ isAr }: { isAr: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildQuery(Object.fromEntries(params.entries()), { q: q.trim() || null, page: null }));
  }

  return (
    <form onSubmit={submit} className="mb-5 flex gap-2">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={isAr ? "دوّر على منتج أو خدمة أو عقار..." : "Search for a product, service or property..."}
        className="field-select flex-1 !py-3"
      />
      <button className="shrink-0 rounded-xl bg-primary px-7 text-sm font-bold text-white">{isAr ? "بحث" : "Search"}</button>
    </form>
  );
}
