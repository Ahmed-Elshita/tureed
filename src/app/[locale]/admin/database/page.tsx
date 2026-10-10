import Link from "next/link";
import { requireDbAccess, isDbBrowserConfigured } from "@/lib/dbAccess";
import { countRows, listTables } from "@/lib/dbBrowser";
import DbUnlockForm from "@/components/admin/DbUnlockForm";
import DbLockButton from "@/components/admin/DbLockButton";

export const dynamic = "force-dynamic";

export default async function DatabasePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isDbBrowserConfigured()) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-gray-light bg-white p-6 text-center text-sm text-dark">
        <p className="text-3xl">🗄️</p>
        <p className="mt-2 font-bold">الميزة دي مقفولة</p>
        <p className="mt-1 text-mute">ضيف <code>ADMIN_DB_PASSWORD=...</code> في ملف <code>.env</code> وأعد تشغيل السيرفر.</p>
      </div>
    );
  }
  if (!(await requireDbAccess())) return <DbUnlockForm />;

  const tables = listTables();
  const counts = await Promise.all(tables.map((t) => countRows(t).catch(() => -1)));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="font-display text-xl font-bold text-dark">🗄️ قاعدة البيانات ({tables.length} جدول)</h1>
        <DbLockButton />
      </div>
      <p className="mb-6 text-sm text-mute">كل جداول الداتا بيز. افتح أي جدول عشان تشوف الصفوف، تصدّر CSV، أو تستورد صفوف جديدة. بتتقفل لوحدها بعد 30 دقيقة.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tables.map((t, i) => (
          <Link key={t.name} href={`/${locale}/admin/database/${t.name}`} className="rounded-2xl border border-gray-light bg-white p-4 hover:border-primary">
            <p className="font-display font-bold text-dark">{t.name}</p>
            <p className="mt-1 text-xs text-mute">{counts[i] >= 0 ? counts[i].toLocaleString("en") : "?"} صف · {t.columns.length} عمود{t.readOnly ? " · 🔒 قراءة فقط" : ""}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
