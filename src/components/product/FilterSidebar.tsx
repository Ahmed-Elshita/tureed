"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import CascadingTreeSelect from "@/components/product/CascadingTreeSelect";
import { buildQuery } from "@/lib/listingQuery";
import type { CategoryAttributeDTO, TreeNode } from "@/lib/types";

interface SubLink { id: string; slug: string; name: string }

interface Props {
  attributes: CategoryAttributeDTO[]; // filterable SELECT/MULTISELECT attributes, pre-filtered by the caller
  locationTree: TreeNode[];
  isAr: boolean;
  locale: string;
  // Search page: free-text box + cascading category picker.
  showKeyword?: boolean;
  categoryTree?: TreeNode[];
  // Category page: direct sub-categories (and a way back up) as links.
  subcategories?: SubLink[];
  parent?: SubLink | null;
}

const LOCATION_LABELS = { ar: ["المحافظة", "المدينة / المنطقة", "الحي"], en: ["Governorate", "City / Area", "District"] };
const CATEGORY_LABELS = { ar: ["القسم", "القسم الفرعي", "النوع", "تفصيل"], en: ["Category", "Subcategory", "Type", "Detail"] };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-light px-4 py-4">
      <p className="mb-2.5 text-xs font-extrabold uppercase tracking-wide text-ink-soft">{title}</p>
      {children}
    </div>
  );
}

// Every filter lives in the URL (shareable, survives refresh). The same
// component serves the search page and every category page.
export default function FilterSidebar({ attributes, locationTree, isAr, locale, showKeyword, categoryTree, subcategories, parent }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const paramsObj = Object.fromEntries(params.entries());
  const [open, setOpen] = useState(false); // mobile only; always visible from md up

  const [q, setQ] = useState(params.get("q") ?? "");
  const [min, setMin] = useState(params.get("min") ?? "");
  const [max, setMax] = useState(params.get("max") ?? "");

  function go(overrides: Record<string, string | null>) {
    router.push(buildQuery(paramsObj, { ...overrides, page: null }));
  }

  function applyText(e: React.FormEvent) {
    e.preventDefault();
    go({ q: q.trim() || null, min: min || null, max: max || null });
  }

  function toggleOption(attributeId: string, optionId: string) {
    const key = `f_${attributeId}`;
    const current = (params.get(key) ?? "").split(",").filter(Boolean);
    const next = current.includes(optionId) ? current.filter((v) => v !== optionId) : [...current, optionId];
    go({ [key]: next.length ? next.join(",") : null });
  }

  const selected = (attributeId: string) => new Set((params.get(`f_${attributeId}`) ?? "").split(",").filter(Boolean));
  const hasFilters = params.toString().length > 0;
  const clearHref = showKeyword ? `/${locale}/search` : "?";

  return (
    <aside className="w-full shrink-0 md:w-72 lg:w-80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-3 flex w-full items-center justify-between rounded-xl border border-gray-light bg-white px-4 py-3 text-sm font-bold text-dark md:hidden"
      >
        <span>🎚️ {isAr ? "الفلاتر" : "Filters"}</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>

      <div className={`${open ? "block" : "hidden"} overflow-hidden rounded-2xl border border-gray-light bg-white md:sticky md:top-32 md:block md:max-h-[calc(100vh-9rem)] md:overflow-y-auto`}>
        <div className="flex items-center justify-between px-4 py-3">
          <p className="font-display text-base font-bold text-dark">{isAr ? "فلاتر البحث" : "Filters"}</p>
          {hasFilters && (
            <Link href={clearHref} className="text-xs font-bold text-primary">
              {isAr ? "مسح الكل" : "Clear all"}
            </Link>
          )}
        </div>

        {/* Keyword + price share one form so a single "Apply" sends both. */}
        <form onSubmit={applyText}>
          {showKeyword && (
            <Section title={isAr ? "كلمة البحث" : "Keyword"}>
              <input className="field-select" value={q} onChange={(e) => setQ(e.target.value)} placeholder={isAr ? "اسم المنتج أو الخدمة..." : "Product or service..."} />
            </Section>
          )}
          <Section title={isAr ? "السعر (جنيه)" : "Price (EGP)"}>
            <div className="flex items-center gap-2">
              <input type="number" min={0} inputMode="numeric" placeholder={isAr ? "من" : "Min"} className="field-select" value={min} onChange={(e) => setMin(e.target.value)} />
              <span className="text-mute">–</span>
              <input type="number" min={0} inputMode="numeric" placeholder={isAr ? "إلى" : "Max"} className="field-select" value={max} onChange={(e) => setMax(e.target.value)} />
            </div>
            <button className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white">{isAr ? "تطبيق" : "Apply"}</button>
          </Section>
        </form>

        {categoryTree && (
          <Section title={isAr ? "القسم" : "Category"}>
            <CascadingTreeSelect
              tree={categoryTree}
              value={params.get("cat")}
              mode="any"
              stacked
              isAr={isAr}
              levelLabels={CATEGORY_LABELS}
              onChange={(id) => go({ cat: id })}
            />
          </Section>
        )}

        {(subcategories?.length || parent) && (
          <Section title={isAr ? "الأقسام الفرعية" : "Sub-categories"}>
            <ul className="flex flex-col gap-1">
              {parent && (
                <li>
                  <Link href={`/${locale}/category/${parent.slug}`} className="block rounded-lg px-2 py-1.5 text-sm text-mute hover:bg-gray-bg">
                    {isAr ? "→" : "←"} {parent.name}
                  </Link>
                </li>
              )}
              {subcategories?.map((c) => (
                <li key={c.id}>
                  <Link href={`/${locale}/category/${c.slug}`} className="block rounded-lg px-2 py-1.5 text-sm font-medium text-dark hover:bg-gray-bg">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section title={isAr ? "الموقع" : "Location"}>
          <CascadingTreeSelect
            tree={locationTree}
            value={params.get("loc")}
            mode="any"
            stacked
            isAr={isAr}
            levelLabels={LOCATION_LABELS}
            onChange={(id) => go({ loc: id })}
          />
        </Section>

        {attributes.map((attr) => {
          const sel = selected(attr.id);
          return (
            <Section key={attr.id} title={isAr ? attr.labelAr : attr.labelEn}>
              <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
                {attr.options.map((opt) => (
                  <label key={opt.id} className="flex cursor-pointer items-center gap-2 text-sm text-dark">
                    <input type="checkbox" className="h-4 w-4 accent-primary" checked={sel.has(opt.id)} onChange={() => toggleOption(attr.id, opt.id)} />
                    {isAr ? opt.labelAr : opt.labelEn}
                  </label>
                ))}
              </div>
            </Section>
          );
        })}
      </div>
    </aside>
  );
}
