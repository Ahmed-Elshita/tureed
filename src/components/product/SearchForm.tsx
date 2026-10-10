"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import CascadingTreeSelect from "@/components/product/CascadingTreeSelect";
import { buildQuery } from "@/lib/listingQuery";
import type { TreeNode } from "@/lib/types";

const CATEGORY_LABELS = { ar: ["القسم", "القسم الفرعي", "النوع", "تفصيل"], en: ["Category", "Subcategory", "Type", "Detail"] };
const LOCATION_LABELS = { ar: ["المحافظة", "المدينة / المنطقة", "الحي"], en: ["Governorate", "City / Area", "District"] };

// Same cascading idea as posting a listing, but here stopping at ANY level
// is a valid choice — picking "Fashion" alone searches everything under it.
export default function SearchForm({ categoryTree, locationTree, isAr }: { categoryTree: TreeNode[]; locationTree: TreeNode[]; isAr: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(buildQuery(Object.fromEntries(params.entries()), { q: q || null, page: null }));
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-gray-light bg-white p-5">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-dark">{isAr ? "دوّر عن..." : "Search for..."}</span>
        <div className="flex gap-2">
          <input className="field-select" value={q} onChange={(e) => setQ(e.target.value)} placeholder={isAr ? "اسم المنتج أو الخدمة..." : "Product or service name..."} />
          <button className="shrink-0 rounded-xl bg-primary px-5 text-sm font-bold text-white">{isAr ? "بحث" : "Search"}</button>
        </div>
      </label>

      <div className="mt-4">
        <p className="mb-2 text-xs font-bold text-dark">{isAr ? "القسم (اختياري)" : "Category (optional)"}</p>
        <CascadingTreeSelect
          tree={categoryTree}
          value={params.get("cat")}
          mode="any"
          isAr={isAr}
          levelLabels={CATEGORY_LABELS}
          onChange={(id) => router.push(buildQuery(Object.fromEntries(params.entries()), { cat: id, page: null }))}
        />
      </div>

      <div className="mt-4">
        <p className="mb-2 text-xs font-bold text-dark">{isAr ? "الموقع (اختياري)" : "Location (optional)"}</p>
        <CascadingTreeSelect
          tree={locationTree}
          value={params.get("loc")}
          mode="any"
          isAr={isAr}
          levelLabels={LOCATION_LABELS}
          onChange={(id) => router.push(buildQuery(Object.fromEntries(params.entries()), { loc: id, page: null }))}
        />
      </div>
    </form>
  );
}
