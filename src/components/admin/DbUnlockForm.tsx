"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MESSAGES: Record<string, string> = {
  wrong_db_password: "الباسورد غلط",
  too_many_requests: "محاولات كتير — استنى 15 دقيقة",
  db_password_not_configured: "ADMIN_DB_PASSWORD مش متظبط في ملف .env",
  forbidden: "مش مسموحلك",
};

export default function DbUnlockForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/db/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(MESSAGES[body.error] ?? "حصل خطأ");
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-16 max-w-sm space-y-4 rounded-2xl border border-gray-light bg-white p-6 text-center">
      <p className="text-3xl">🔐</p>
      <h1 className="font-display text-lg font-bold text-dark">قاعدة البيانات</h1>
      <p className="text-sm text-mute">اكتب الباسورد السري عشان تفتح الجداول.</p>
      <input type="password" autoFocus required className="field-select text-center" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-50">
        {busy ? "..." : "فتح"}
      </button>
    </form>
  );
}
