"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CascadingTreeSelect from "@/components/product/CascadingTreeSelect";
import InterestCheckboxes, { type InterestCategory } from "@/components/profile/InterestCheckboxes";
import LeadFields, { type LeadValues } from "@/components/profile/LeadFields";
import { errorMessage } from "@/lib/errors";
import type { TreeNode } from "@/lib/types";

const LOCATION_LABELS = { ar: ["المحافظة", "المدينة / المنطقة", "الحي"], en: ["Governorate", "City / Area", "District"] };

type Role = "BUYER" | "SELLER" | "BOTH";
const ROLE_OPTIONS: { value: Role; icon: string; ar: string; en: string }[] = [
  { value: "BUYER", icon: "🛒", ar: "مشتري", en: "Buyer" },
  { value: "SELLER", icon: "🏪", ar: "بائع", en: "Seller" },
  { value: "BOTH", icon: "🔁", ar: "الاتنين", en: "Both" },
];

// Mandatory signup form — no skip. Photo/bio come later from profile settings.
export default function OnboardingForm({
  locale,
  locationTree,
  topCategories,
  returnTo,
}: {
  locale: string;
  locationTree: TreeNode[];
  topCategories: InterestCategory[];
  returnTo: string | null;
}) {
  const router = useRouter();
  const isAr = locale === "ar";

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [locationId, setLocationId] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("BUYER");
  const [interests, setInterests] = useState<string[]>([]);
  const [lead, setLead] = useState<LeadValues>({ birthDate: "", gender: "", referralSource: "", marketingConsent: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim() && whatsapp.trim() && locationId && lead.birthDate && lead.gender && interests.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, whatsapp, locationId, role, interestCategoryIds: interests, ...lead, referralSource: lead.referralSource || null }),
    });
    const body = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setError(errorMessage(body.error, isAr));
      return;
    }
    router.push(returnTo || `/${locale}/profile`);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-6 rounded-2xl border border-gray-light bg-white p-6">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-dark">{isAr ? "الاسم" : "Name"} <span className="text-red-500">*</span></span>
        <input required maxLength={100} className="field-select" value={name} onChange={(e) => setName(e.target.value)} placeholder={isAr ? "اسمك أو اسم متجرك" : "Your name or shop name"} />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-dark">{isAr ? "رقم واتساب" : "WhatsApp number"} <span className="text-red-500">*</span></span>
        <input required type="tel" className="field-select" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="01000000000" />
      </label>

      <LeadFields isAr={isAr} value={lead} onChange={setLead} required />

      <div>
        <p className="mb-2 text-xs font-bold text-dark">{isAr ? "العنوان" : "Address"} <span className="text-red-500">*</span></p>
        <CascadingTreeSelect tree={locationTree} value={locationId} mode="any" onChange={(id) => setLocationId(id)} isAr={isAr} levelLabels={LOCATION_LABELS} />
      </div>

      <div>
        <p className="mb-2 text-xs font-bold text-dark">{isAr ? "أنت" : "You are a"} <span className="text-red-500">*</span></p>
        <div className="grid grid-cols-3 gap-2">
          {ROLE_OPTIONS.map((r) => (
            <button
              type="button"
              key={r.value}
              onClick={() => setRole(r.value)}
              className={`rounded-xl border py-3 text-sm font-bold ${role === r.value ? "border-primary bg-primary/5 text-primary" : "border-gray-light text-dark"}`}
            >
              <span className="block text-xl">{r.icon}</span>
              {isAr ? r.ar : r.en}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-bold text-dark">{isAr ? "مهتم بإيه؟ (اختار قسم واحد على الأقل)" : "Interested in? (pick at least one)"} <span className="text-red-500">*</span></p>
        <InterestCheckboxes categories={topCategories} value={interests} onChange={setInterests} isAr={isAr} />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button disabled={saving || !canSubmit} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-50">
        {saving ? (isAr ? "جاري الحفظ..." : "Saving...") : isAr ? "تمام، كمّل" : "Continue"}
      </button>
      <p className="text-center text-xs text-mute">
        {isAr ? "الصورة والنبذة تقدر تضيفهم بعدين من إعدادات الحساب." : "You can add a photo and bio later from profile settings."}
      </p>
    </form>
  );
}
