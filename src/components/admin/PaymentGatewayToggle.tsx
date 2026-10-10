"use client";

import { useState } from "react";

export default function PaymentGatewayToggle({ initialEnabled, initialProvider }: { initialEnabled: boolean; initialProvider: string | null }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [provider, setProvider] = useState(initialProvider ?? "paymob");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function toggle() {
    setSaving(true);
    const next = !enabled;
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next, provider }),
    });
    setEnabled(next);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="rounded-2xl border border-gray-light bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-dark">بوابة الدفع</p>
          <p className="mt-0.5 text-xs text-mute">
            {enabled ? "مفعّلة — التمييز والشراء المباشر بيحاولوا يحصّلوا فلوس فعليًا" : "معطّلة — أي محاولة دفع بترجع كطلب معلّق، مفيش فلوس بتتحرك"}
          </p>
        </div>
        <button
          onClick={toggle}
          disabled={saving}
          className={`relative h-7 w-12 shrink-0 rounded-full transition ${enabled ? "bg-emerald-500" : "bg-gray-light"}`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? "start-6" : "start-1"}`}
          />
        </button>
      </div>

      <label className="mt-4 block text-sm">
        <span className="mb-1 block font-medium text-dark">مزوّد الدفع</span>
        <select className="field-select w-auto" value={provider} onChange={(e) => setProvider(e.target.value)}>
          <option value="paymob">Paymob</option>
          <option value="fawry">Fawry</option>
          <option value="stripe">Stripe</option>
        </select>
      </label>
      <p className="mt-2 text-[11px] text-mute">
        ⚠️ اختيار المزوّد ده معلوماتي بس دلوقتي — لسه محتاج مفاتيح API حقيقية في الكود (`src/lib/payments.ts`) قبل ما التفعيل يبقى له تأثير فعلي على تحصيل فلوس حقيقية.
      </p>
      {saved && <p className="mt-2 text-xs font-bold text-emerald-600">✓ اتحفظ</p>}
    </div>
  );
}
