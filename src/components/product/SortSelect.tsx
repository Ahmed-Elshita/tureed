"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { buildQuery } from "@/lib/listingQuery";

export default function SortSelect({ isAr }: { isAr: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const value = params.get("sort") ?? "newest";

  return (
    <select
      className="field-select w-auto"
      value={value}
      onChange={(e) => router.push(buildQuery(Object.fromEntries(params.entries()), { sort: e.target.value, page: null }))}
    >
      <option value="newest">{isAr ? "الأحدث" : "Newest"}</option>
      <option value="price_asc">{isAr ? "الأقل سعرًا" : "Price: low to high"}</option>
      <option value="price_desc">{isAr ? "الأعلى سعرًا" : "Price: high to low"}</option>
    </select>
  );
}
