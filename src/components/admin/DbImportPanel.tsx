"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Result {
  ok: boolean;
  dryRun: boolean;
  totalRows: number;
  inserted: number;
  skippedDuplicates: number;
  errors: { row: number; message: string }[];
  fatal?: string;
  error?: string;
}

export default function DbImportPanel({ table }: { table: string }) {
  const router = useRouter();
  const [csv, setCsv] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(dryRun: boolean) {
    if (!csv) return;
    setBusy(true);
    const res = await fetch(`/api/admin/db/${table}/import`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv, dryRun }),
    });
    const body = (await res.json().catch(() => ({ ok: false, error: "failed" }))) as Result;
    setBusy(false);
    setResult(body);
    if (!dryRun && body.ok) router.refresh();
  }

  return (
    <div className="rounded-2xl border border-gray-light bg-white p-5">
      <h2 className="mb-1 font-display text-sm font-bold text-dark">⬆️ استيراد CSV (إضافة صفوف جديدة)</h2>
      <p className="mb-3 text-xs text-mute">
        الصف الأول = أسماء الأعمدة (نفس أسماء التصدير). بيتعمل فحص الأول، ولو فيه أي صف غلط مفيش حاجة بتتكتب. الصفوف اللي الـ id بتاعها موجود بتتخطى ومش بتتعدل.
      </p>
      <input
        type="file"
        accept=".csv,text/csv"
        className="text-sm"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          setResult(null);
          if (!f) { setCsv(null); return; }
          setFileName(f.name);
          setCsv(await f.text());
        }}
      />
      <div className="mt-3 flex gap-2">
        <button disabled={!csv || busy} onClick={() => run(true)} className="rounded-lg border border-primary px-4 py-2 text-xs font-bold text-primary disabled:opacity-40">
          1) فحص بدون حفظ
        </button>
        <button
          disabled={!csv || busy || !result?.ok || !result.dryRun}
          onClick={() => confirm(`تأكيد إضافة ${result?.inserted} صف في ${table}؟`) && run(false)}
          className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
        >
          2) تنفيذ الاستيراد
        </button>
      </div>
      {result && (
        <div className={`mt-3 rounded-lg p-3 text-xs ${result.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
          {result.ok ? (
            result.dryRun ? (
              <p>✓ {fileName}: {result.totalRows} صف سليم وجاهز للإضافة.</p>
            ) : (
              <p>✓ اتضاف {result.inserted} صف{result.skippedDuplicates ? ` — اتخطى ${result.skippedDuplicates} (موجودين قبل كده)` : ""}.</p>
            )
          ) : (
            <>
              <p className="font-bold">✗ الاستيراد اترفض{result.fatal || result.error ? `: ${result.fatal ?? result.error}` : ""}</p>
              <ul className="mt-1 list-disc ps-5">
                {result.errors?.map((er, i) => <li key={i}>سطر {er.row}: {er.message}</li>)}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
