"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PLATFORMS, calculateBoostPrice, type PlatformKey } from "@/lib/boostPricing";

interface Props {
  productId: string;
  locale: string;
}

const DURATIONS = [1, 3, 7];

export default function BoostForm({ productId, locale }: Props) {
  const router = useRouter();
  const isAr = locale === "ar";
  const [selected, setSelected] = useState<PlatformKey[]>(["tureed"]);
  const [days, setDays] = useState(3);
  const [targetNote, setTargetNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<null | { boost?: { id: string; status: string }; adRequest?: { id: string; status: string } }>(null);

  const { automatedPlatforms, manualPlatforms, totalPrice, manualEstimatedTotal } = useMemo(
    () => calculateBoostPrice(selected, days),
    [selected, days]
  );

  function toggle(key: PlatformKey) {
    setSelected((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/boosts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, platforms: selected, days, targetNoteAr: targetNote }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error === "unauthorized" ? (isAr ? "لازم تسجل دخول" : "Please log in") : isAr ? "حصل خطأ، حاول تاني" : "Something went wrong");
      return;
    }
    setResult(await res.json());
  }

  if (result) {
    return (
      <div className="rounded-2xl border border-gray-light bg-white p-6 text-center">
        {result.boost && (
          <div className="mb-4">
            {result.boost.status === "ACTIVE" ? (
              <p className="text-sm font-bold text-emerald-700">
                ✅ {isAr ? "الإعلان بقى مميز على تريد دلوقتي!" : "Your listing is now featured on Tureed!"}
              </p>
            ) : (
              <p className="text-sm font-bold text-amber-700">
                ⏳ {isAr
                  ? "طلبك اتسجل — خدمة الدفع لسه مش مفعّلة فعليًا، هيتم تفعيل التمييز بمجرد تفعيلها."
                  : "Your order is recorded — real payment isn't enabled yet, the boost will activate once it is."}
              </p>
            )}
          </div>
        )}
        {result.adRequest && (
          <p className="mb-4 text-sm font-bold text-primary">
            📨 {isAr
              ? "طلب الإعلان على المنصات الخارجية وصل لفريق التسويق — هيتواصلوا معاك قريب لتفاصيل الحملة."
              : "Your external-platform ad request reached our marketing team — they'll reach out soon to set it up."}
          </p>
        )}
        <button onClick={() => router.push(`/${locale}/my-ads`)} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
          {isAr ? "روح لمتابعة إعلاناتي" : "Go to My Ads"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-light bg-white p-6">
      <p className="mb-3 text-sm font-bold text-dark">{isAr ? "هتميّز الإعلان فين؟" : "Where do you want to feature it?"}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(PLATFORMS) as PlatformKey[]).map((key) => {
          const p = PLATFORMS[key];
          const active = selected.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`relative rounded-xl border p-3 text-start text-xs font-bold ${
                active ? "border-primary bg-primary/5 text-primary" : "border-gray-light text-dark"
              }`}
            >
              {isAr ? p.labelAr : p.labelEn}
              <div className="mt-1 text-[11px] font-normal text-mute">
                {p.pricePerDay} {isAr ? "ج/يوم" : "EGP/day"} {!p.automated && (isAr ? "(تقديري)" : "(estimate)")}
              </div>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-mute">
        {isAr
          ? "تريد بيتفعل أوتوماتيك فورًا. فيسبوك/إنستجرام/تيك توك هيتحول لطلب يتواصل معاك فيه فريق التسويق (مش تفعيل أوتوماتيك دلوقتي)."
          : "Tureed activates instantly. Facebook/Instagram/TikTok become a request our marketing team follows up on (not automated yet)."}
      </p>

      {manualPlatforms.length > 0 && (
        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium text-dark">
            {isAr ? "تفاصيل عن الفئة المستهدفة (اختياري)" : "Target audience notes (optional)"}
          </span>
          <textarea
            className="field-select"
            rows={2}
            placeholder={isAr ? "مثال: استهدف القاهرة والجيزة، سن 25-40" : "e.g. target Cairo & Giza, ages 25-40"}
            value={targetNote}
            onChange={(e) => setTargetNote(e.target.value)}
          />
        </label>
      )}

      <p className="mb-3 mt-6 text-sm font-bold text-dark">{isAr ? "لمدة كام يوم؟" : "For how many days?"}</p>
      <div className="flex gap-2">
        {DURATIONS.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={`rounded-xl border px-4 py-2 text-sm font-bold ${
              days === d ? "border-primary bg-primary/5 text-primary" : "border-gray-light text-dark"
            }`}
          >
            {d} {isAr ? "يوم" : d === 1 ? "day" : "days"}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-2">
        {automatedPlatforms.length > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-gray-bg p-3 text-sm">
            <span className="text-dark/70">{isAr ? "تريد (هيتحاسب دلوقتي)" : "Tureed (charged now)"}</span>
            <span className="font-display font-bold text-dark">{totalPrice} EGP</span>
          </div>
        )}
        {manualPlatforms.length > 0 && (
          <div className="flex items-center justify-between rounded-xl bg-amber-50 p-3 text-sm">
            <span className="text-amber-800">{isAr ? "تقدير المنصات الخارجية (هيتأكد مع فريق التسويق)" : "External platforms estimate (confirmed by our team)"}</span>
            <span className="font-display font-bold text-amber-800">{manualEstimatedTotal} EGP</span>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <button
        onClick={submit}
        disabled={submitting || selected.length === 0}
        className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {submitting ? (isAr ? "جاري الإرسال..." : "Sending...") : isAr ? "أكمل" : "Continue"}
      </button>
    </div>
  );
}
