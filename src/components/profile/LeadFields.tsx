"use client";

import { MIN_AGE } from "@/lib/profileFields";

export interface LeadValues {
  birthDate: string;
  gender: string;
  referralSource: string;
  marketingConsent: boolean;
}

const SOURCES: [string, string, string][] = [
  ["FACEBOOK", "فيسبوك", "Facebook"],
  ["INSTAGRAM", "إنستجرام", "Instagram"],
  ["TIKTOK", "تيك توك", "TikTok"],
  ["GOOGLE", "جوجل", "Google"],
  ["FRIEND", "صديق", "A friend"],
  ["OTHER", "حاجة تانية", "Other"],
];

// Birth date + gender (+ optional "how did you hear" and marketing opt-in).
export default function LeadFields({
  isAr,
  value,
  onChange,
  required,
}: {
  isAr: boolean;
  value: LeadValues;
  onChange: (v: LeadValues) => void;
  required: boolean;
}) {
  const today = new Date();
  const max = new Date(Date.UTC(today.getUTCFullYear() - MIN_AGE, today.getUTCMonth(), today.getUTCDate())).toISOString().slice(0, 10);
  const star = required ? <span className="text-red-500"> *</span> : null;

  return (
    <>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-dark">{isAr ? "تاريخ الميلاد" : "Date of birth"}{star}</span>
        <input
          type="date"
          required={required}
          min="1930-01-01"
          max={max}
          className="field-select"
          value={value.birthDate}
          onChange={(e) => onChange({ ...value, birthDate: e.target.value })}
        />
        <span className="mt-1 block text-xs text-mute">{isAr ? `لازم 18 سنة أو أكتر. مش بيظهر لأي حد.` : "Must be 18+. Never shown to anyone."}</span>
      </label>

      <div>
        <p className="mb-2 text-xs font-bold text-dark">{isAr ? "النوع" : "Gender"}{star}</p>
        <div className="grid grid-cols-2 gap-2">
          {[["MALE", "ذكر", "Male"], ["FEMALE", "أنثى", "Female"]].map(([v, ar, en]) => (
            <button
              type="button"
              key={v}
              onClick={() => onChange({ ...value, gender: v })}
              className={`rounded-xl border py-2.5 text-sm font-bold ${value.gender === v ? "border-primary bg-primary/5 text-primary" : "border-gray-light text-dark"}`}
            >
              {isAr ? ar : en}
            </button>
          ))}
        </div>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-dark">{isAr ? "عرفت تريد منين؟ (اختياري)" : "How did you hear about us? (optional)"}</span>
        <select className="field-select" value={value.referralSource} onChange={(e) => onChange({ ...value, referralSource: e.target.value })}>
          <option value="">{isAr ? "اختار" : "Choose"}</option>
          {SOURCES.map(([v, ar, en]) => <option key={v} value={v}>{isAr ? ar : en}</option>)}
        </select>
      </label>

      <label className="flex items-start gap-2 text-sm text-dark">
        <input type="checkbox" className="mt-1 accent-primary" checked={value.marketingConsent} onChange={(e) => onChange({ ...value, marketingConsent: e.target.checked })} />
        <span>{isAr ? "موافق أستقبل عروض وإعلانات مناسبة لاهتماماتي على واتساب (اختياري، وتقدر تلغيه في أي وقت من الإعدادات)." : "I agree to receive offers and ads matching my interests on WhatsApp (optional, you can turn it off any time in settings)."}</span>
      </label>
    </>
  );
}
