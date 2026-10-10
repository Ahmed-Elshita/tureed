"use client";

import { useState } from "react";
import ImageDropzone from "@/components/product/ImageDropzone";
import CascadingTreeSelect from "@/components/product/CascadingTreeSelect";
import LeadFields, { type LeadValues } from "@/components/profile/LeadFields";
import InterestCheckboxes, { type InterestCategory } from "@/components/profile/InterestCheckboxes";
import type { TreeNode } from "@/lib/types";

const LOCATION_LABELS = { ar: ["المحافظة", "المدينة / المنطقة", "الحي"], en: ["Governorate", "City / Area", "District"] };
const CATEGORY_LABELS = { ar: ["القسم", "القسم الفرعي", "النوع"], en: ["Category", "Subcategory", "Type"] };

interface Props {
  isAr: boolean;
  categoryTree: TreeNode[];
  locationTree: TreeNode[];
  topCategories: InterestCategory[];
  initial: {
    role: string;
    birthDate: string;
    gender: string;
    referralSource: string;
    marketingConsent: boolean;
    interestCategoryIds: string[];
    name: string;
    phone: string;
    storeName: string;
    storeBio: string;
    whatsapp: string;
    avatarUrl: string;
    coverImageUrl: string;
    locationId: string | null;
    categoryId: string | null;
  };
}

export default function ProfileForm({ isAr, categoryTree, locationTree, topCategories, initial }: Props) {
  const [name, setName] = useState(initial.name);
  const [storeName, setStoreName] = useState(initial.storeName);
  const [storeBio, setStoreBio] = useState(initial.storeBio);
  const [whatsapp, setWhatsapp] = useState(initial.whatsapp);
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [coverImageUrl, setCoverImageUrl] = useState(initial.coverImageUrl);
  const [locationId, setLocationId] = useState<string | null>(initial.locationId);
  const [categoryId, setCategoryId] = useState<string | null>(initial.categoryId);
  const [role, setRole] = useState(initial.role);
  const [interests, setInterests] = useState<string[]>(initial.interestCategoryIds);
  const [lead, setLead] = useState<LeadValues>({ birthDate: initial.birthDate, gender: initial.gender, referralSource: initial.referralSource, marketingConsent: initial.marketingConsent });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, storeName, storeBio, whatsapp, avatarUrl, coverImageUrl, locationId, categoryId, ...(role !== "ADMIN" ? { role } : {}), interestCategoryIds: interests, ...(lead.birthDate ? { birthDate: lead.birthDate } : {}), ...(lead.gender ? { gender: lead.gender } : {}), referralSource: lead.referralSource || null, marketingConsent: lead.marketingConsent }),
    });
    setSaving(false);
    if (!res.ok) {
      setError(isAr ? "حصل خطأ، حاول تاني" : "Something went wrong, try again");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <form onSubmit={save} className="space-y-6 rounded-2xl border border-gray-light bg-white p-6">
      <div>
        <label className="mb-1 block text-sm font-medium text-dark">{isAr ? "صورة الغلاف" : "Cover photo"}</label>
        <ImageDropzone maxFiles={1} initialUrls={coverImageUrl ? [coverImageUrl] : []} onChange={(urls) => setCoverImageUrl(urls[0] ?? "")} />
      </div>

      <div className="flex items-center gap-4">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gray-bg">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display font-bold text-mute">{(storeName || name || "?").charAt(0)}</div>
          )}
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-dark">{isAr ? "الصورة الشخصية" : "Profile photo"}</label>
          <ImageDropzone maxFiles={1} initialUrls={avatarUrl ? [avatarUrl] : []} onChange={(urls) => setAvatarUrl(urls[0] ?? "")} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-dark">{isAr ? "الاسم" : "Name"}</span>
          <input required className="field-select" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-dark">{isAr ? "رقم الموبايل" : "Phone number"}</span>
          <input disabled className="field-select bg-gray-bg text-mute" value={initial.phone} />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-dark">{isAr ? "اسم المتجر (اختياري)" : "Store name (optional)"}</span>
          <input className="field-select" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-dark">{isAr ? "رقم واتساب" : "WhatsApp number"}</span>
          <input className="field-select" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="01000000000" />
        </label>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold text-dark">{isAr ? "الموقع" : "Location"}</p>
        <CascadingTreeSelect tree={locationTree} value={locationId} mode="any" onChange={(id) => setLocationId(id)} isAr={isAr} levelLabels={LOCATION_LABELS} />
      </div>

      <div>
        <p className="mb-2 text-xs font-bold text-dark">{isAr ? "تصنيف المتجر (اختياري)" : "Shop category (optional)"}</p>
        <CascadingTreeSelect tree={categoryTree} value={categoryId} mode="any" onChange={(id) => setCategoryId(id)} isAr={isAr} levelLabels={CATEGORY_LABELS} />
      </div>

      <LeadFields isAr={isAr} value={lead} onChange={setLead} required={false} />

      {role !== "ADMIN" && (
        <div>
          <p className="mb-2 text-xs font-bold text-dark">{isAr ? "نوع الحساب" : "Account type"}</p>
          <div className="grid grid-cols-3 gap-2">
            {[["BUYER", "🛒", "مشتري", "Buyer"], ["SELLER", "🏪", "بائع", "Seller"], ["BOTH", "🔁", "الاتنين", "Both"]].map(([v, icon, ar, en]) => (
              <button type="button" key={v} onClick={() => setRole(v)} className={`rounded-xl border py-2 text-sm font-bold ${role === v ? "border-primary bg-primary/5 text-primary" : "border-gray-light text-dark"}`}>
                {icon} {isAr ? ar : en}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-bold text-dark">{isAr ? "الأقسام اللي مهتم بيها" : "Interested categories"}</p>
        <InterestCheckboxes categories={topCategories} value={interests} onChange={setInterests} isAr={isAr} />
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-dark">{isAr ? "نبذة عن المتجر" : "Store bio"}</span>
        <textarea rows={3} maxLength={500} className="field-select" value={storeBio} onChange={(e) => setStoreBio(e.target.value)} />
      </label>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div>
        <button disabled={saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {saving ? (isAr ? "جاري الحفظ..." : "Saving...") : isAr ? "حفظ التعديلات" : "Save changes"}
        </button>
        {saved && <span className="ms-3 text-sm font-bold text-emerald-600">✓ {isAr ? "اتحفظ" : "Saved"}</span>}
      </div>
    </form>
  );
}
