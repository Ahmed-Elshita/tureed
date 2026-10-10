"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { buildQuery } from "@/lib/listingQuery";
import type { CategoryAttributeDTO } from "@/lib/types";

interface Props {
  attributes: CategoryAttributeDTO[]; // only isFilterable ones, pre-filtered by the caller
  isAr: boolean;
}

// Reads/writes the URL's query string directly — filters are shareable
// links and survive a refresh, not component state that vanishes on reload.
export default function FilterSidebar({ attributes, isAr }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const paramsObj = Object.fromEntries(params.entries());

  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");

  function go(overrides: Record<string, string | null>) {
    router.push(buildQuery(paramsObj, { ...overrides, page: null })); // any filter change resets pagination
  }

  function toggleOption(attributeId: string, optionId: string) {
    const key = `f_${attributeId}`;
    const current = (params.get(key) ?? "").split(",").filter(Boolean);
    const next = current.includes(optionId) ? current.filter((v) => v !== optionId) : [...current, optionId];
    go({ [key]: next.length ? next.join(",") : null });
  }

  const selected = (attributeId: string) => new Set((params.get(`f_${attributeId}`) ?? "").split(",").filter(Boolean));

  return (
    <aside className="w-full shrink-0 rounded-2xl border border-gray-light bg-white p-4 md:w-64">
      <p className="text-sm font-bold text-dark">{isAr ? "فلاتر البحث" : "Search filters"}</p>

      <div className="mt-3 border-t border-gray-light pt-3">
        <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-ink-soft">{isAr ? "السعر" : "Price"}</p>
        <div className="flex gap-2">
          <input type="number" min={0} placeholder={isAr ? "من" : "Min"} className="field-select" value={min} onChange={(e) => setMin(e.target.value)} onBlur={() => go({ min: min || null })} />
          <input type="number" min={0} placeholder={isAr ? "إلى" : "Max"} className="field-select" value={max} onChange={(e) => setMax(e.target.value)} onBlur={() => go({ max: max || null })} />
        </div>
      </div>

      {attributes.map((attr) => {
        const sel = selected(attr.id);
        return (
          <div key={attr.id} className="mt-3 border-t border-gray-light pt-3">
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-ink-soft">{isAr ? attr.labelAr : attr.labelEn}</p>
            <div className="flex flex-col gap-1.5">
              {attr.options.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-sm text-dark">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-primary" checked={sel.has(opt.id)} onChange={() => toggleOption(attr.id, opt.id)} />
                  {isAr ? opt.labelAr : opt.labelEn}
                </label>
              ))}
            </div>
          </div>
        );
      })}
      {attributes.length === 0 && <p className="mt-3 text-xs text-mute">{isAr ? "مفيش فلاتر إضافية هنا." : "No extra filters here."}</p>}

      {(params.toString().length > 0) && (
        <button onClick={() => router.push(buildQuery({}, {}))} className="mt-4 text-xs font-bold text-primary">
          {isAr ? "مسح كل الفلاتر" : "Clear all filters"}
        </button>
      )}
    </aside>
  );
}
