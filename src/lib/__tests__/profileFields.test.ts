import { describe, expect, it } from "vitest";
import { ageOn, parseBirthDate } from "../profileFields";

const now = new Date("2026-10-10T12:00:00Z");

describe("parseBirthDate", () => {
  it("accepts a valid adult date", () => {
    expect(parseBirthDate("1995-05-20", now)?.toISOString().slice(0, 10)).toBe("1995-05-20");
  });
  it("rejects malformed, impossible and future dates", () => {
    for (const v of ["", "20-05-1995", "2000-02-31", "2999-01-01", null, 123]) expect(parseBirthDate(v, now)).toBeNull();
  });
  it("enforces the 18+ minimum on the exact birthday", () => {
    expect(parseBirthDate("2008-10-10", now)).not.toBeNull(); // turns 18 today
    expect(parseBirthDate("2008-10-11", now)).toBeNull(); // tomorrow
  });
  it("rejects absurdly old dates", () => {
    expect(parseBirthDate("1900-01-01", now)).toBeNull();
  });
  it("computes age", () => {
    expect(ageOn(new Date("2000-10-11T00:00:00Z"), now)).toBe(25);
  });
});
