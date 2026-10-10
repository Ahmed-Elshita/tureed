"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useErrorText } from "@/lib/useErrorText";

interface OptionRow { id: string; labelAr: string; labelEn: string; isActive: boolean }
interface AttrRow { id: string; labelAr: string; labelEn: string; inputType: string; isRequired: boolean; isFilterable: boolean; isActive: boolean; options: OptionRow[] }

const TYPE_LABEL: Record<string, string> = { SELECT: "اختيار واحد", MULTISELECT: "اختيار متعدد", NUMBER: "رقم", BOOLEAN: "نعم/لا" };

export default function AttributeManager({ categoryId, attributes }: { categoryId: string; attributes: AttrRow[] }) {
  return (
    <div className="space-y-3">
      {attributes.map((a) => <AttrCard key={a.id} attr={a} />)}
      <NewAttrForm categoryId={categoryId} />
    </div>
  );
}

function AttrCard({ attr }: { attr: AttrRow }) {
  const router = useRouter();
  const errText = useErrorText();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newOptAr, setNewOptAr] = useState("");
  const [newOptEn, setNewOptEn] = useState("");

  async function patchAttr(data: Record<string, unknown>) {
    setBusy(true); setError(null);
    const res = await fetch(`/api/admin/attributes/${attr.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setBusy(false);
    if (!res.ok) { setError(errText((await res.json().catch(() => ({})))?.error)); return; }
    router.refresh();
  }

  async function removeAttr() {
    if (!confirm("متأكد؟ لو الحقل ده مستخدم في إعلانات، هيترفض الحذف وهنقولك تعطّله بدل كده.")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/attributes/${attr.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) { setError(errText((await res.json().catch(() => ({})))?.error)); return; }
    router.refresh();
  }

  async function addOptions(e: React.FormEvent) {
    e.preventDefault();
    if (!newOptAr.trim() || !newOptEn.trim()) return;
    setBusy(true); setError(null);
    const res = await fetch(`/api/admin/attributes/${attr.id}/options`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ options: [{ labelAr: newOptAr, labelEn: newOptEn }] }),
    });
    setBusy(false);
    if (!res.ok) { setError(errText((await res.json().catch(() => ({})))?.error)); return; }
    setNewOptAr(""); setNewOptEn("");
    router.refresh();
  }

  async function toggleOption(id: string, isActive: boolean) {
    setBusy(true);
    await fetch(`/api/admin/options/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !isActive }) });
    setBusy(false);
    router.refresh();
  }

  const hasOptions = attr.inputType === "SELECT" || attr.inputType === "MULTISELECT";

  return (
    <div className={`rounded-2xl border bg-white p-4 ${attr.isActive ? "border-gray-light" : "border-gray-light opacity-60"}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-dark">{attr.labelAr}</span>
        <span className="text-xs text-mute">/ {attr.labelEn}</span>
        <span className="rounded-full bg-gray-bg px-2 py-0.5 text-[10px] font-bold text-dark/60">{TYPE_LABEL[attr.inputType]}</span>
        {attr.isRequired && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">إجباري</span>}
        <div className="ms-auto flex gap-1.5">
          <button disabled={busy} onClick={() => patchAttr({ isRequired: !attr.isRequired })} className="rounded-lg border border-gray-light px-2.5 py-1.5 text-[11px] font-bold text-dark">
            {attr.isRequired ? "خليه اختياري" : "خليه إجباري"}
          </button>
          <button disabled={busy} onClick={() => patchAttr({ isActive: !attr.isActive })} className="rounded-lg border border-gray-light px-2.5 py-1.5 text-[11px] font-bold text-dark">
            {attr.isActive ? "إخفاء" : "إظهار"}
          </button>
          <button disabled={busy} onClick={removeAttr} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-bold text-red-500">حذف</button>
        </div>
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {hasOptions && (
        <div className="mt-3 border-t border-gray-light pt-3">
          <div className="flex flex-wrap gap-1.5">
            {attr.options.map((o) => (
              <button key={o.id} onClick={() => toggleOption(o.id, o.isActive)} disabled={busy}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${o.isActive ? "border-gray-light text-dark" : "border-gray-light text-mute line-through"}`}>
                {o.labelAr}
              </button>
            ))}
          </div>
          <form onSubmit={addOptions} className="mt-2 flex flex-wrap gap-1.5">
            <input className="field-select w-32 text-xs" placeholder="خيار بالعربي" value={newOptAr} onChange={(e) => setNewOptAr(e.target.value)} />
            <input className="field-select w-32 text-xs" placeholder="Option in English" value={newOptEn} onChange={(e) => setNewOptEn(e.target.value)} />
            <button disabled={busy} className="rounded-lg bg-dark px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50">+ خيار</button>
          </form>
        </div>
      )}
    </div>
  );
}

function NewAttrForm({ categoryId }: { categoryId: string }) {
  const router = useRouter();
  const errText = useErrorText();
  const [labelAr, setLabelAr] = useState("");
  const [labelEn, setLabelEn] = useState("");
  const [inputType, setInputType] = useState("SELECT");
  const [isRequired, setIsRequired] = useState(false);
  const [optionsText, setOptionsText] = useState(""); // one "ar|en" pair per line, for fast bulk entry
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const options = optionsText
      .split("\n")
      .map((l) => l.split("|").map((s) => s.trim()))
      .filter(([ar, en]) => ar && en)
      .map(([labelAr, labelEn]) => ({ labelAr, labelEn }));

    const res = await fetch(`/api/admin/categories/${categoryId}/attributes`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ labelAr, labelEn, inputType, isRequired, options }),
    });
    setBusy(false);
    if (!res.ok) { setError(errText((await res.json().catch(() => ({})))?.error)); return; }
    setLabelAr(""); setLabelEn(""); setOptionsText(""); setIsRequired(false);
    router.refresh();
  }

  const hasOptions = inputType === "SELECT" || inputType === "MULTISELECT";

  return (
    <form onSubmit={submit} className="rounded-2xl border border-dashed border-gray-light bg-gray-bg p-4">
      <p className="mb-2 text-sm font-bold text-dark">+ إضافة حقل جديد</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <input required className="field-select" placeholder="اسم الحقل بالعربي" value={labelAr} onChange={(e) => setLabelAr(e.target.value)} />
        <input required className="field-select" placeholder="Field name in English" value={labelEn} onChange={(e) => setLabelEn(e.target.value)} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <select className="field-select w-auto" value={inputType} onChange={(e) => setInputType(e.target.value)}>
          <option value="SELECT">اختيار واحد (Dropdown)</option>
          <option value="MULTISELECT">اختيار متعدد</option>
          <option value="NUMBER">رقم</option>
          <option value="BOOLEAN">نعم / لا</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs font-bold text-dark">
          <input type="checkbox" checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} /> إجباري
        </label>
      </div>
      {hasOptions && (
        <textarea
          className="field-select mt-2" rows={3}
          placeholder={"الخيارات — سطر لكل خيار، الشكل: عربي|English\nمثال:\n64 جيجا|64GB\n128 جيجا|128GB"}
          value={optionsText} onChange={(e) => setOptionsText(e.target.value)}
        />
      )}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      <button disabled={busy} className="mt-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
        {busy ? "جاري الإضافة..." : "إضافة الحقل"}
      </button>
    </form>
  );
}
