import { NextRequest, NextResponse } from "next/server";
import { requireDbAccess } from "@/lib/dbAccess";
import { getTable, importRows, MAX_IMPORT_BYTES } from "@/lib/dbBrowser";
import { parseCsv } from "@/lib/csv";

export async function POST(req: NextRequest, { params }: { params: Promise<{ table: string }> }) {
  if (!(await requireDbAccess())) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const table = getTable((await params).table);
  if (!table) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (typeof body?.csv !== "string" || body.csv.length === 0) return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  if (body.csv.length > MAX_IMPORT_BYTES) return NextResponse.json({ error: "file_too_large" }, { status: 413 });

  const result = await importRows(table, parseCsv(body.csv), body.dryRun !== false);
  return NextResponse.json(result, { status: result.fatal ? 400 : 200 });
}
