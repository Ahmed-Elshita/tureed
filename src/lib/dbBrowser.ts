import { Prisma } from "@prisma/client";
import { db } from "./db";
import { neutralizeFormula, restoreFormula } from "./csv";

// The table list, columns and types come from Prisma's own schema metadata
// (DMMF), so a new model/column shows up here automatically — nothing to
// maintain by hand.
const READ_ONLY_TABLES = new Set(["OtpCode", "RateLimitHit"]); // security tables: viewable, never importable
const SENSITIVE_COLUMNS: Record<string, string[]> = {
  User: ["passwordHash"],
  OtpCode: ["codeHash"],
};

export const MAX_IMPORT_ROWS = 5000;
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
export const MAX_EXPORT_ROWS = 100_000;

export interface ColumnInfo {
  name: string;
  type: string; // String | Int | Float | Decimal | Boolean | DateTime | <enum name>
  isEnum: boolean;
  isRequired: boolean;
  hasDefault: boolean;
  isId: boolean;
}

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  pk: string[];
  readOnly: boolean;
}

const ENUMS = new Map(Prisma.dmmf.datamodel.enums.map((e) => [e.name, e.values.map((v) => v.name)]));

export function listTables(): TableInfo[] {
  return Prisma.dmmf.datamodel.models.map((m) => {
    const sensitive = SENSITIVE_COLUMNS[m.name] ?? [];
    const columns: ColumnInfo[] = m.fields
      .filter((f) => f.kind === "scalar" || f.kind === "enum")
      .filter((f) => !sensitive.includes(f.name))
      .map((f) => ({
        name: f.name,
        type: f.type,
        isEnum: f.kind === "enum",
        isRequired: f.isRequired,
        hasDefault: f.hasDefaultValue,
        isId: f.isId,
      }));
    const pk = m.primaryKey?.fields ? [...m.primaryKey.fields] : m.fields.filter((f) => f.isId).map((f) => f.name);
    return { name: m.name, columns, pk, readOnly: READ_ONLY_TABLES.has(m.name) };
  });
}

export function getTable(name: string): TableInfo | null {
  return listTables().find((t) => t.name === name) ?? null;
}

interface Delegate {
  count(): Promise<number>;
  findMany(args: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  createMany(args: { data: Record<string, unknown>[]; skipDuplicates: boolean }): Promise<{ count: number }>;
}

function delegate(table: TableInfo): Delegate {
  const key = table.name.charAt(0).toLowerCase() + table.name.slice(1);
  return (db as unknown as Record<string, Delegate>)[key];
}

function selectOf(table: TableInfo) {
  return Object.fromEntries(table.columns.map((c) => [c.name, true]));
}

function orderOf(table: TableInfo) {
  const col = table.columns.find((c) => c.name === "createdAt");
  return col ? { createdAt: "desc" } : table.pk.length ? { [table.pk[0]]: "asc" } : undefined;
}

export async function countRows(table: TableInfo) {
  return delegate(table).count();
}

export async function fetchRows(table: TableInfo, skip: number, take: number) {
  return delegate(table).findMany({ select: selectOf(table), orderBy: orderOf(table), skip, take });
}

export function cellToString(v: unknown, col: ColumnInfo): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  const s = typeof v === "object" ? String(v) : String(v); // Decimal -> string
  // only TEXT columns can carry a formula payload
  return col.type === "String" ? neutralizeFormula(s) : s;
}

export async function exportRows(table: TableInfo) {
  const rows = await delegate(table).findMany({ select: selectOf(table), orderBy: orderOf(table), take: MAX_EXPORT_ROWS });
  return {
    headers: table.columns.map((c) => c.name),
    rows: rows.map((r) => table.columns.map((c) => cellToString(r[c.name], c))),
  };
}

function coerce(raw: string, col: ColumnInfo): { ok: true; value: unknown } | { ok: false; error: string } {
  const v = col.type === "String" ? restoreFormula(raw) : raw.trim();
  if (col.type !== "String" && v === "") return { ok: true, value: null };
  if (col.type === "String") return { ok: true, value: raw === "" ? null : v };
  switch (col.type) {
    case "Int": {
      if (!/^-?\d+$/.test(v)) return { ok: false, error: "not an integer" };
      const n = Number(v);
      return Number.isSafeInteger(n) && Math.abs(n) <= 2147483647 ? { ok: true, value: n } : { ok: false, error: "integer out of range" };
    }
    case "Float": {
      const n = Number(v);
      return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, error: "not a number" };
    }
    case "Decimal":
      return /^-?\d+(\.\d+)?$/.test(v) ? { ok: true, value: v } : { ok: false, error: "not a decimal" };
    case "Boolean": {
      const l = v.toLowerCase();
      if (["true", "1", "yes"].includes(l)) return { ok: true, value: true };
      if (["false", "0", "no"].includes(l)) return { ok: true, value: false };
      return { ok: false, error: "not a boolean" };
    }
    case "DateTime": {
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? { ok: false, error: "invalid date" } : { ok: true, value: d };
    }
    default: {
      if (col.isEnum) {
        return ENUMS.get(col.type)?.includes(v) ? { ok: true, value: v } : { ok: false, error: `must be one of ${ENUMS.get(col.type)?.join("/")}` };
      }
      return { ok: false, error: `unsupported type ${col.type}` };
    }
  }
}

export interface ImportResult {
  ok: boolean;
  dryRun: boolean;
  totalRows: number;
  inserted: number;
  skippedDuplicates: number;
  errors: { row: number; message: string }[]; // row = CSV line number (header = 1)
  fatal?: string;
}

// Insert-only bulk import: validated row by row; ANY invalid row aborts the
// whole import (nothing is written). Rows whose primary key already exists
// are skipped, never overwritten.
export async function importRows(table: TableInfo, csvRows: string[][], dryRun: boolean): Promise<ImportResult> {
  const base = { dryRun, totalRows: 0, inserted: 0, skippedDuplicates: 0, errors: [] as { row: number; message: string }[] };
  if (table.readOnly) return { ...base, ok: false, fatal: "table_is_read_only" };
  if (csvRows.length < 2) return { ...base, ok: false, fatal: "csv_has_no_rows" };
  if (csvRows.length - 1 > MAX_IMPORT_ROWS) return { ...base, ok: false, fatal: "too_many_rows" };

  const headers = csvRows[0].map((h) => h.trim());
  const byName = new Map(table.columns.map((c) => [c.name, c]));
  const unknown = headers.filter((h) => !byName.has(h));
  if (unknown.length) return { ...base, ok: false, fatal: `unknown_columns: ${unknown.join(", ")}` };
  if (new Set(headers).size !== headers.length) return { ...base, ok: false, fatal: "duplicate_columns" };
  const missing = table.columns.filter((c) => c.isRequired && !c.hasDefault && !headers.includes(c.name));
  if (missing.length) return { ...base, ok: false, fatal: `missing_required_columns: ${missing.map((c) => c.name).join(", ")}` };

  const data: Record<string, unknown>[] = [];
  const errors: { row: number; message: string }[] = [];
  for (let i = 1; i < csvRows.length; i++) {
    const cells = csvRows[i];
    if (cells.length !== headers.length) {
      errors.push({ row: i + 1, message: `expected ${headers.length} columns, got ${cells.length}` });
      continue;
    }
    const rec: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      const col = byName.get(headers[j])!;
      const r = coerce(cells[j], col);
      if (!r.ok) { errors.push({ row: i + 1, message: `${col.name}: ${r.error}` }); continue; }
      if (r.value === null) {
        if (col.isRequired && !col.hasDefault) errors.push({ row: i + 1, message: `${col.name}: required` });
        continue; // empty = use default / null
      }
      rec[col.name] = r.value;
    }
    if (table.name === "User" && rec.role === "ADMIN") errors.push({ row: i + 1, message: "role: ADMIN can't be imported" });
    data.push(rec);
    if (errors.length >= 50) break;
  }
  const result = { ...base, totalRows: csvRows.length - 1, errors };
  if (errors.length) return { ...result, ok: false };
  if (dryRun) return { ...result, ok: true, inserted: data.length };

  try {
    const { count } = await delegate(table).createMany({ data, skipDuplicates: true });
    return { ...result, ok: true, inserted: count, skippedDuplicates: data.length - count };
  } catch (e) {
    // FK violations etc. — surface a short message, never the stack/SQL.
    const code = e instanceof Prisma.PrismaClientKnownRequestError ? e.code : "unknown";
    return { ...result, ok: false, fatal: `database_rejected_import (${code})` };
  }
}
