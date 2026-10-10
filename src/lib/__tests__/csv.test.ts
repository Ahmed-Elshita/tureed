import { describe, expect, it } from "vitest";
import { neutralizeFormula, parseCsv, restoreFormula, toCsv } from "../csv";

describe("csv", () => {
  it("round-trips quotes, commas, newlines and Arabic", () => {
    const rows = [["a,b", 'say "hi"', "سطر\nتاني"], ["", "x", "y"]];
    const parsed = parseCsv(toCsv(["h1", "h2", "h3"], rows));
    expect(parsed[0]).toEqual(["h1", "h2", "h3"]);
    expect(parsed.slice(1)).toEqual(rows);
  });
  it("handles CRLF and trailing newline", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
  it("neutralizes formulas and restores them", () => {
    for (const v of ["=1+1", "+cmd", "-5", "@SUM(A1)"]) {
      const safe = neutralizeFormula(v);
      expect(safe.startsWith("'")).toBe(true);
      expect(restoreFormula(safe)).toBe(v);
    }
    expect(neutralizeFormula("hello")).toBe("hello");
    expect(restoreFormula("'hello")).toBe("'hello");
  });
});
