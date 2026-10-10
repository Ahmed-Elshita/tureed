"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CascadingTreeSelect from "@/components/product/CascadingTreeSelect";
import DynamicAttributeForm from "@/components/product/DynamicAttributeForm";
import ImageDropzone from "@/components/product/ImageDropzone";
import { errorMessage } from "@/lib/errors";
import type { CategoryAttributeDTO, TreeNode } from "@/lib/types";

interface Props {
  locale: string;
  categoryTree: TreeNode[];
  locationTree: TreeNode[];
}

const CATEGORY_LABELS = {
  ar: ["القسم الرئيسي", "القسم الفرعي", "النوع", "التصنيف الدقيق", "التفصيل", "التفصيل"],
  en: ["Category", "Subcategory", "Type", "Sub-type", "Detail", "Detail"],
};
const LOCATION_LABELS = {
  ar: ["المحافظة", "المدينة / المنطقة", "الحي", "المنطقة"],
  en: ["Governorate", "City / Area", "District", "Area"],
};

type AttrValue = string | string[] | number | boolean | undefined;

// Two steps: (1) walk the category tree down to the most specific level —
// each dropdown appears only when the previous choice has children;
// (2) fill that category's fields (own + inherited), all dropdowns.
export default function NewListingWizard({ locale, categoryTree, locationTree }: Props) {
  const isAr = locale === "ar";
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [attributes, setAttributes] = useState<CategoryAttributeDTO[]>([]);
  const [attrLoading, setAttrLoading] = useState(false);
  const [attrValues, setAttrValues] = useState<Record<string, AttrValue>>({});
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());

  const [titleAr, setTitleAr] = useState("");
  const [price, setPrice] = useState("");
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [descriptionAr, setDescriptionAr] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [honeypot, setHoneypot] = useState(""); // invisible to people; bots fill it
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Fetch the fields of the chosen (leaf) category, incl. inherited ones.
  useEffect(() => {
    setAttrValues({});
    setErrorIds(new Set());
    if (!categoryId) {
      setAttributes([]);
      return;
    }
    let cancelled = false;
    setAttrLoading(true);
    fetch(`/api/categories/${categoryId}/attributes`)
      .then((r) => r.json())
      .then((d) => !cancelled && setAttributes(d.attributes ?? []))
      .catch(() => !cancelled && setAttributes([]))
      .finally(() => !cancelled && setAttrLoading(false));
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  function missingRequired(): Set<string> {
    const missing = new Set<string>();
    for (const a of attributes) {
      if (!a.isRequired) continue;
      const v = attrValues[a.id];
      const empty = v === undefined || v === "" || (Array.isArray(v) && v.length === 0) || (typeof v === "number" && !Number.isFinite(v));
      if (empty && a.inputType !== "BOOLEAN") missing.add(a.id);
    }
    return missing;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (honeypot) return; // silently drop bots
    setSubmitError(null);

    if (!locationId) {
      setSubmitError(errorMessage("location_must_be_most_specific", isAr));
      return;
    }
    const missing = missingRequired();
    setErrorIds(missing);
    if (missing.size > 0) {
      setSubmitError(errorMessage("missing_required_attribute", isAr));
      return;
    }

    const rows: Record<string, unknown>[] = [];
    for (const a of attributes) {
      const v = attrValues[a.id];
      if (a.inputType === "SELECT" && typeof v === "string") rows.push({ attributeId: a.id, optionId: v });
      else if (a.inputType === "MULTISELECT" && Array.isArray(v)) v.forEach((optionId) => rows.push({ attributeId: a.id, optionId })); // one row per choice
      else if (a.inputType === "NUMBER" && typeof v === "number") rows.push({ attributeId: a.id, numberValue: v });
      else if (a.inputType === "BOOLEAN" && typeof v === "boolean") rows.push({ attributeId: a.id, boolValue: v });
    }

    setSubmitting(true);
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titleAr,
        descriptionAr,
        price: price ? Number(price) : null,
        isNegotiable,
        categoryId,
        locationId,
        imageUrls,
        attributeValues: rows,
      }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      if (body.error === "onboarding_required") {
        router.push(`/${locale}/onboarding?returnTo=${encodeURIComponent(`/${locale}/product/new`)}`);
        return;
      }
      if (body.attributeId) setErrorIds(new Set([body.attributeId]));
      setSubmitError(errorMessage(body.error, isAr));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="text-4xl">✅</p>
        <h1 className="mt-2 font-display text-lg font-bold text-dark">{isAr ? "وصلنا إعلانك!" : "We got your listing!"}</h1>
        <p className="mt-1 text-sm text-dark/70">
          {isAr ? "الإعلان دلوقتي قيد المراجعة وهيظهر للناس بمجرد الموافقة عليه." : "It's under review and will go live as soon as it's approved."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href={`/${locale}/profile`} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">
            {isAr ? "شوف إعلاناتي" : "See my listings"}
          </Link>
          <a href={`/${locale}/product/new`} className="rounded-xl border border-gray-light bg-white px-4 py-2.5 text-sm font-bold text-dark">
            {isAr ? "أضف إعلان تاني" : "Post another"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex gap-2 text-xs font-semibold">
        <span className={`rounded-full px-3 py-1 ${step === 1 ? "bg-primary text-white" : "bg-gray-light text-dark/50"}`}>1. {isAr ? "اختار القسم" : "Choose a category"}</span>
        <span className={`rounded-full px-3 py-1 ${step === 2 ? "bg-primary text-white" : "bg-gray-light text-dark/50"}`}>2. {isAr ? "تفاصيل الإعلان" : "Listing details"}</span>
      </div>

      {step === 1 && (
        <div className="rounded-2xl border border-gray-light bg-white p-6">
          <h1 className="mb-1 font-display text-lg font-bold text-dark">{isAr ? "اختار القسم المناسب لمنتجك" : "Choose the right category"}</h1>
          <p className="mb-4 text-xs text-mute">{isAr ? "كمّل الاختيار لحد آخر مستوى — القوائم بتظهر واحدة ورا التانية." : "Keep choosing down to the most specific level — lists appear one after another."}</p>
          <CascadingTreeSelect tree={categoryTree} value={categoryId} mode="leaf" required onChange={(id) => setCategoryId(id)} isAr={isAr} levelLabels={CATEGORY_LABELS} />
          <button
            disabled={!categoryId}
            onClick={() => setStep(2)}
            className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {isAr ? "التالي" : "Next"}
          </button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={submit} noValidate className="space-y-6 rounded-2xl border border-gray-light bg-white p-6">
          <button type="button" onClick={() => setStep(1)} className="text-xs font-semibold text-primary">
            {isAr ? "← رجوع لاختيار القسم" : "← Back to category"}
          </button>

          <input type="text" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="hidden" tabIndex={-1} autoComplete="off" aria-hidden="true" />

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-dark">{isAr ? "عنوان الإعلان" : "Listing title"} <span className="text-red-500">*</span></span>
            <input required maxLength={200} className="field-select" placeholder={isAr ? "مثال: آيفون 15 برو 256 جيجا" : "e.g. iPhone 15 Pro 256GB"} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
          </label>

          <div>
            <p className="mb-2 text-sm font-semibold text-dark">{isAr ? "خصائص المنتج" : "Item specifics"}</p>
            {attrLoading ? (
              <div className="h-12 animate-pulse rounded-xl bg-gray-light" />
            ) : (
              <DynamicAttributeForm
                attributes={attributes}
                values={attrValues}
                errorIds={errorIds}
                isAr={isAr}
                onChange={(id, v) => {
                  setAttrValues((prev) => ({ ...prev, [id]: v }));
                  if (errorIds.has(id)) setErrorIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
                }}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-dark">{isAr ? "السعر" : "Price"} (EGP) <span className="text-red-500">*</span></span>
              <input required type="number" inputMode="decimal" min={0} className="field-select" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>
            <label className="mt-6 flex items-center gap-2 text-sm font-medium text-dark">
              <input type="checkbox" checked={isNegotiable} onChange={(e) => setIsNegotiable(e.target.checked)} />
              {isAr ? "قابل للتفاوض" : "Negotiable"}
            </label>
          </div>

          <CascadingTreeSelect tree={locationTree} value={locationId} mode="leaf" required onChange={(id) => setLocationId(id)} isAr={isAr} levelLabels={LOCATION_LABELS} />

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-dark">{isAr ? "الوصف" : "Description"} <span className="text-red-500">*</span></span>
            <textarea required rows={4} maxLength={5000} className="field-select" value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} />
          </label>

          <div>
            <label className="mb-1 block text-sm font-medium text-dark">{isAr ? "الصور" : "Photos"} <span className="text-red-500">*</span></label>
            <ImageDropzone onChange={setImageUrls} />
          </div>

          {/* AI assist (auto title/description/category/marketing copy) is a planned feature; the slot is reserved. */}
          <button type="button" disabled className="w-full rounded-xl border border-secondary/40 py-2.5 text-sm font-semibold text-secondary/60">
            ✨ {isAr ? "مساعد الذكاء الاصطناعي (قريبًا)" : "AI assistant (coming soon)"}
          </button>

          {submitError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{submitError}</p>}

          <button type="submit" disabled={submitting || imageUrls.length === 0 || !titleAr.trim() || !descriptionAr.trim() || !price} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50">
            {submitting ? (isAr ? "جاري النشر..." : "Publishing...") : isAr ? "نشر الإعلان" : "Publish listing"}
          </button>
        </form>
      )}
    </div>
  );
}
