import { NextResponse } from "next/server";
import { requireDbAccess } from "@/lib/dbAccess";
import { exportRows, getTable } from "@/lib/dbBrowser";
import { toCsv } from "@/lib/csv";

export async function GET(_req: Request, { params }: { params: Promise<{ table: string }> }) {
  if (!(await requireDbAccess())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const table = getTable((await params).table);
  if (!table) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { headers, rows } = await exportRows(table);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${table.name}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
