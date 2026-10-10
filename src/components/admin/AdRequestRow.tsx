"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const STATUSES = ["REQUESTED", "CONTACTED", "IN_PROGRESS", "LIVE", "COMPLETED", "CANCELLED"];

interface Props {
  id: string;
  productTitle: string;
  sellerName: string;
  sellerPhone: string;
  platforms: string[];
  budgetPerDay: number;
  days: number;
  estimatedTotal: number;
  targetNoteAr: string | null;
  status: string;
}

export default function AdRequestRow(props: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(props.status);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function updateStatus(next: string) {
    setBusy(true);
    setStatus(next);
    await fetch(`/api/ad-requests/${props.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    setBusy(false);
    router.refresh();
  }

  async function saveNote() {
    setBusy(true);
    await fetch(`/api/ad-requests/${props.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminNote: note }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-gray-light bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-dark">{props.productTitle}</p>
          <p className="text-xs text-mute">
            {props.sellerName} · {props.sellerPhone}
          </p>
        </div>
        <select
          value={status}
          disabled={busy}
          onChange={(e) => updateStatus(e.target.value)}
          className="field-select w-auto text-xs"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {props.platforms.map((p) => (
          <span key={p} className="rounded-full bg-gray-bg px-2.5 py-1 text-[11px] font-bold text-dark">
            {p}
          </span>
        ))}
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
          {props.estimatedTotal} EGP / {props.days} يوم
        </span>
      </div>

      {props.targetNoteAr && <p className="mt-2 text-xs text-dark/70">🎯 {props.targetNoteAr}</p>}

      <div className="mt-3 flex gap-2">
        <input
          placeholder="ملاحظة داخلية للفريق..."
          className="field-select text-xs"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button onClick={saveNote} disabled={busy} className="shrink-0 rounded-xl bg-dark px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
          حفظ
        </button>
      </div>
    </div>
  );
}
