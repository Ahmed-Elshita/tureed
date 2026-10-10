"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useErrorText } from "@/lib/useErrorText";

export interface AdminLocationNode {
  id: string; nameAr: string; nameEn: string; isActive: boolean; parentId: string | null;
  lat: number | null; lng: number | null; children: AdminLocationNode[];
}

export default function LocationTreeManager({ tree }: { tree: AdminLocationNode[] }) {
  return (
    <div className="space-y-2">
      {tree.map((node) => <Node key={node.id} node={node} depth={0} />)}
      {tree.length === 0 && <AddChildForm parentId={null} />}
    </div>
  );
}

function Node({ node, depth }: { node: AdminLocationNode; depth: number }) {
  const router = useRouter();
  const errText = useErrorText();
  const [open, setOpen] = useState(depth < 1);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameAr, setNameAr] = useState(node.nameAr);
  const [nameEn, setNameEn] = useState(node.nameEn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(data: Record<string, unknown>) {
    setBusy(true); setError(null);
    const res = await fetch(`/api/admin/locations/${node.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setBusy(false);
    if (!res.ok) { setError(errText((await res.json().catch(() => ({})))?.error)); return false; }
    router.refresh();
    return true;
  }

  async function remove() {
    if (!confirm("متأكد إنك عايز تمسح الموقع ده؟")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/locations/${node.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) { setError(errText((await res.json().catch(() => ({})))?.error)); return; }
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-gray-light bg-white" style={{ marginInlineStart: depth * 18 }}>
      <div className="flex flex-wrap items-center gap-2 p-3">
        <button onClick={() => setOpen((v) => !v)} className="w-5 text-mute" disabled={node.children.length === 0}>{node.children.length > 0 ? (open ? "▾" : "▸") : "·"}</button>
        {editing ? (
          <>
            <input className="field-select w-36" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
            <input className="field-select w-36" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
            <button disabled={busy} onClick={async () => (await patch({ nameAr, nameEn })) && setEditing(false)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">حفظ</button>
            <button onClick={() => setEditing(false)} className="text-xs text-mute">إلغاء</button>
          </>
        ) : (
          <>
            <span className={`font-semibold ${node.isActive ? "text-dark" : "text-mute line-through"}`}>{node.nameAr}</span>
            <span className="text-xs text-mute">/ {node.nameEn}</span>
            {node.lat != null && <span className="text-[10px] text-mute">📍 {node.lat.toFixed(3)}, {node.lng?.toFixed(3)}</span>}
          </>
        )}
        <div className="ms-auto flex flex-wrap items-center gap-1.5">
          {!editing && <button onClick={() => setEditing(true)} className="rounded-lg border border-gray-light px-2.5 py-1.5 text-[11px] font-bold text-dark">تعديل</button>}
          <button disabled={busy} onClick={() => setAdding((v) => !v)} className="rounded-lg border border-gray-light px-2.5 py-1.5 text-[11px] font-bold text-dark">+ موقع فرعي</button>
          <button disabled={busy} onClick={() => patch({ isActive: !node.isActive })} className="rounded-lg border border-gray-light px-2.5 py-1.5 text-[11px] font-bold text-dark">{node.isActive ? "إخفاء" : "إظهار"}</button>
          <button disabled={busy} onClick={remove} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-bold text-red-500">حذف</button>
        </div>
      </div>
      {error && <p className="px-3 pb-2 text-xs text-red-500">{error}</p>}
      {adding && <div className="border-t border-gray-light p-3"><AddChildForm parentId={node.id} onDone={() => setAdding(false)} /></div>}
      {open && node.children.length > 0 && (
        <div className="space-y-2 border-t border-gray-light p-2">
          {node.children.map((c) => <Node key={c.id} node={c} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

function AddChildForm({ parentId, onDone }: { parentId: string | null; onDone?: () => void }) {
  const router = useRouter();
  const errText = useErrorText();
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await fetch("/api/admin/locations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameAr, nameEn, parentId, lat: lat ? Number(lat) : null, lng: lng ? Number(lng) : null }),
    });
    setBusy(false);
    if (!res.ok) { setError(errText((await res.json().catch(() => ({})))?.error)); return; }
    setNameAr(""); setNameEn(""); setLat(""); setLng("");
    router.refresh();
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input required className="field-select w-32" placeholder="بالعربي" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
      <input required className="field-select w-32" placeholder="English" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
      <input className="field-select w-24 text-xs" placeholder="Lat (اختياري)" value={lat} onChange={(e) => setLat(e.target.value)} />
      <input className="field-select w-24 text-xs" placeholder="Lng (اختياري)" value={lng} onChange={(e) => setLng(e.target.value)} />
      <button disabled={busy} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50">+ إضافة</button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </form>
  );
}
