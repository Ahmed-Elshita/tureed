import Link from "next/link";
import { notFound } from "next/navigation";
import { requireDbAccess } from "@/lib/dbAccess";
import { cellToString, countRows, fetchRows, getTable } from "@/lib/dbBrowser";
import DbUnlockForm from "@/components/admin/DbUnlockForm";
import DbImportPanel from "@/components/admin/DbImportPanel";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 50;

export default async function DatabaseTablePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; table: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale, table: tableName } = await params;
  const { page: pageParam } = await searchParams;
  if (!(await requireDbAccess())) return <DbUnlockForm />;

  const table = getTable(tableName);
  if (!table) notFound();

  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const [total, rows] = await Promise.all([countRows(table), fetchRows(table, (page - 1) * PAGE_SIZE, PAGE_SIZE)]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const base = `/${locale}/admin/database/${table.name}`;

  return (
    <div>
      <Link href={`/${locale}/admin/database`} className="text-xs font-bold text-primary">← كل الجداول</Link>
      <div className="mb-4 mt-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold text-dark">{table.name} <span className="text-sm font-normal text-mute">({total.toLocaleString("en")} صف)</span></h1>
        <a href={`/api/admin/db/${table.name}/export`} className="rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white">⬇️ تصدير CSV</a>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-light bg-white">
        <table className="w-full text-start text-xs" dir="ltr">
          <thead className="bg-gray-bg text-mute">
            <tr>{table.columns.map((c) => <th key={c.name} className="whitespace-nowrap px-3 py-2 text-left font-bold">{c.name}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-gray-light">
                {table.columns.map((c) => {
                  const v = cellToString(r[c.name], c);
                  return <td key={c.name} className="max-w-[260px] truncate px-3 py-2 text-dark" title={v}>{v}</td>;
                })}
              </tr>
            ))}
            {rows.length === 0 && <tr><td className="px-3 py-6 text-center text-mute" colSpan={table.columns.length}>الجدول فاضي</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="my-4 flex items-center justify-center gap-3 text-xs font-bold">
        {page > 1 && <Link href={`${base}?page=${page - 1}`} className="text-primary">← السابق</Link>}
        <span className="text-mute">{page} / {pages}</span>
        {page < pages && <Link href={`${base}?page=${page + 1}`} className="text-primary">التالي →</Link>}
      </div>

      {table.readOnly ? (
        <p className="rounded-xl bg-gray-bg p-3 text-xs text-mute">🔒 الجدول ده قراءة فقط (جدول أمان) — الاستيراد مقفول.</p>
      ) : (
        <DbImportPanel table={table.name} />
      )}
      <p className="mt-3 text-[11px] text-mute">الأعمدة الحساسة (زي passwordHash و codeHash) مش بتظهر ولا بتتصدّر.</p>
    </div>
  );
}
