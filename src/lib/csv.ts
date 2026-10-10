// Minimal RFC 4180 CSV parser/serializer (no dependency).

// Cells starting with = + - @ TAB CR are treated as formulas by Excel/Sheets
// ("CSV injection"). On export we prefix such TEXT cells with a single quote.
const FORMULA_START = /^[=+\-@\t\r]/;

export function neutralizeFormula(v: string): string {
  return FORMULA_START.test(v) ? `'${v}` : v;
}

// Reverse of neutralizeFormula, applied on import so export -> import round-trips.
export function restoreFormula(v: string): string {
  return v.length > 1 && v[0] === "'" && FORMULA_START.test(v[1]) ? v.slice(1) : v;
}

function escapeCell(v: string): string {
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(headers: string[], rows: string[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const r of rows) lines.push(r.map(escapeCell).join(","));
  // BOM so Excel opens Arabic text as UTF-8.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export function parseCsv(input: string): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
      } else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === ""));
}
