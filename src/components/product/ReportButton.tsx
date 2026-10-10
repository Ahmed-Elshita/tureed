"use client";

import { useState } from "react";

const REASONS: { value: string; ar: string; en: string }[] = [
  { value: "FRAUD", ar: "نصب / احتيال", en: "Fraud / scam" },
  { value: "PROHIBITED", ar: "محتوى ممنوع", en: "Prohibited content" },
  { value: "DUPLICATE", ar: "إعلان مكرر", en: "Duplicate listing" },
  { value: "WRONG_CATEGORY", ar: "قسم غلط", en: "Wrong category" },
  { value: "OTHER", ar: "سبب تاني", en: "Other" },
];

export default function ReportButton({ productId, isAr, isLoggedIn }: { productId: string; isAr: boolean; isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("FRAUD");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isLoggedIn) {
    return <a href="../../login" className="text-xs text-mute underline">🚩 {isAr ? "سجل دخول للإبلاغ عن الإعلان" : "Log in to report this listing"}</a>;
  }

  if (done) return <p className="text-xs font-bold text-emerald-600">✓ {isAr ? "تم إرسال البلاغ، شكرًا" : "Report sent, thank you"}</p>;

  if (!open) {
    return <button onClick={() => setOpen(true)} className="text-xs text-mute underline">🚩 {isAr ? "إبلاغ عن الإعلان" : "Report this listing"}</button>;
  }

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, reason, note }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error === "already_reported_recently" ? (isAr ? "أبلغت عن الإعلان ده قبل كده" : "You already reported this") : isAr ? "حصل خطأ" : "Something went wrong");
      return;
    }
    setDone(true);
  }

  return (
    <div className="rounded-xl border border-gray-light bg-gray-bg p-3">
      <select className="field-select text-xs" value={reason} onChange={(e) => setReason(e.target.value)}>
        {REASONS.map((r) => <option key={r.value} value={r.value}>{isAr ? r.ar : r.en}</option>)}
      </select>
      <textarea className="field-select mt-2 text-xs" rows={2} placeholder={isAr ? "تفاصيل إضافية (اختياري)" : "Extra details (optional)"} value={note} onChange={(e) => setNote(e.target.value)} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button onClick={submit} disabled={busy} className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">{isAr ? "إرسال البلاغ" : "Send report"}</button>
        <button onClick={() => setOpen(false)} className="text-xs text-mute">{isAr ? "إلغاء" : "Cancel"}</button>
      </div>
    </div>
  );
}
