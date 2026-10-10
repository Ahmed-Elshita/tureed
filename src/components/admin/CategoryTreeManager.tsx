"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useErrorText } from "@/lib/useErrorText";

export interface AdminCategoryNode {
  id: string;
  nameAr: string;
  nameEn: string;
  kind: "PRODUCT" | "REAL_ESTATE" | "SERVICE";
  isActive: boolean;
  parentId: string | null;
  children: AdminCategoryNode[];
}

const KIND_LABEL: Record<string, string> = { PRODUCT: "منتجات", REAL_ESTATE: "عقارات", SERVICE: "خدمات" };

// Unlimited depth: every node can get a child, so "Fashion > Men > Shoes >
// Sports Shoes" is just the same component nested four times.
export default function CategoryTreeManager({ tree }: { tree: AdminCategoryNode[] }) {
  return (
    <div className="space-y-2">
      {tree.map((node) => (
        <Node key={node.id} node={node} depth={0} />
      ))}
      {tree.length === 0 && <AddChildForm parentId={null} />}
    </div>
  );
}

function Node({ node, depth }: { node: AdminCategoryNode; depth: number }) {
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
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/categories/${node.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    setBusy(false);
    if (!res.ok) { setError(errText((await res.json().catch(() => ({})))?.error)); return false; }
    router.refresh();
    return true;
  }

  async function remove() {
    if (!confirm("متأكد إنك عايز تمسح القسم ده؟")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/categories/${node.id}`, { method: "DELETE" });
    setBusy(false);
    if (!res.ok) { setError(errText((await res.json().catch(() => ({})))?.error)); return; }
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-gray-light bg-white" style={{ marginInlineStart: depth * 18 }}>
      <div className="flex flex-wrap items-center gap-2 p-3">
        <button onClick={() => setOpen((v) => !v)} className="w-5 text-mute" aria-label="toggle" disabled={node.children.length === 0}>
          {node.children.length > 0 ? (open ? "▾" : "▸") : "·"}
        </button>

        {editing ? (
          <>
            <input className="field-select w-36" value={nameAr} onChange={(e) => setNameAr(e.target.value)} placeholder="بالعربي" />
            <input className="field-select w-36" value={nameEn} onChange={(e) => setNameEn(e.target.value)} placeholder="English" />
            <button disabled={busy} onClick={async () => (await patch({ nameAr, nameEn })) && setEditing(false)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">حفظ</button>
            <button onClick={() => { setEditing(false); setNameAr(node.nameAr); setNameEn(node.nameEn); }} className="text-xs text-mute">إلغاء</button>
          </>
        ) : (
          <>
            <span className={`font-semibold ${node.isActive ? "text-dark" : "text-mute line-through"}`}>{node.nameAr}</span>
            <span className="text-xs text-mute">/ {node.nameEn}</span>
            {depth === 0 && <span className="rounded-full bg-gray-bg px-2 py-0.5 text-[10px] font-bold text-dark/60">{KIND_LABEL[node.kind]}</span>}
          </>
        )}

        <div className="ms-auto flex flex-wrap items-center gap-1.5">
          {!editing && <button onClick={() => setEditing(true)} className="rounded-lg border border-gray-light px-2.5 py-1.5 text-[11px] font-bold text-dark">تعديل الاسم</button>}
          <a href={`./categories/${node.id}/attributes`} className="rounded-lg border border-gray-light px-2.5 py-1.5 text-[11px] font-bold text-primary">الحقول</a>
          <button disabled={busy} onClick={() => setAdding((v) => !v)} className="rounded-lg border border-gray-light px-2.5 py-1.5 text-[11px] font-bold text-dark">+ قسم فرعي</button>
          <button disabled={busy} onClick={() => patch({ isActive: !node.isActive })} className="rounded-lg border border-gray-light px-2.5 py-1.5 text-[11px] font-bold text-dark">{node.isActive ? "إخفاء" : "إظهار"}</button>
          <button disabled={busy} onClick={remove} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-[11px] font-bold text-red-500">حذف</button>
        </div>
      </div>
      {error && <p className="px-3 pb-2 text-xs text-red-500">{error}</p>}
      {adding && <div className="border-t border-gray-light p-3"><AddChildForm parentId={node.id} onDone={() => setAdding(false)} /></div>}
      {open && node.children.length > 0 && (
        <div className="space-y-2 border-t border-gray-light p-2">
          {node.children.map((child) => <Node key={child.id} node={child} depth={depth + 1} />)}
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
  const [kind, setKind] = useState("PRODUCT");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameAr, nameEn, parentId, kind: parentId ? undefined : kind }),
    });
    setBusy(false);
    if (!res.ok) { setError(errText((await res.json().catch(() => ({})))?.error)); return; }
    setNameAr(""); setNameEn("");
    router.refresh();
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input required className="field-select w-36" placeholder="الاسم بالعربي" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
      <input required className="field-select w-36" placeholder="Name in English" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
      {!parentId && (
        <select className="field-select w-auto" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="PRODUCT">منتجات</option>
          <option value="REAL_ESTATE">عقارات</option>
          <option value="SERVICE">خدمات</option>
        </select>
      )}
      <button disabled={busy} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
        + إضافة {parentId ? "قسم فرعي" : "قسم رئيسي"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </form>
  );
}
