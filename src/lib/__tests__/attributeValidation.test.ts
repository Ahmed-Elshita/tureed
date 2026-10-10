import { describe, it, expect } from "vitest";
import { validateAttributeValues, type AttributeDef } from "../attributeValidation";

const storage: AttributeDef = {
  id: "storage", inputType: "SELECT", isRequired: true,
  options: [{ id: "64gb" }, { id: "128gb" }],
};
const colors: AttributeDef = {
  id: "colors", inputType: "MULTISELECT", isRequired: false,
  options: [{ id: "black" }, { id: "white" }, { id: "blue" }],
};
const warranty: AttributeDef = { id: "warranty", inputType: "NUMBER", isRequired: false, options: [] };
const negotiable: AttributeDef = { id: "negotiable", inputType: "BOOLEAN", isRequired: false, options: [] };

describe("validateAttributeValues", () => {
  it("accepts a valid full submission", () => {
    const r = validateAttributeValues([storage, colors, warranty, negotiable], [
      { attributeId: "storage", optionId: "128gb" },
      { attributeId: "colors", optionId: "black" },
      { attributeId: "colors", optionId: "blue" },
      { attributeId: "warranty", numberValue: 12 },
      { attributeId: "negotiable", boolValue: true },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rows).toHaveLength(5); // 2 colors = 2 rows
  });

  it("rejects when a required SELECT is missing", () => {
    const r = validateAttributeValues([storage], []);
    expect(r).toMatchObject({ ok: false, error: "missing_required_attribute", attributeId: "storage" });
  });

  it("rejects an optionId that isn't a real option of that attribute (can't smuggle a foreign id)", () => {
    const r = validateAttributeValues([storage], [{ attributeId: "storage", optionId: "some-other-attrs-option" }]);
    expect(r).toMatchObject({ ok: false, error: "invalid_option" });
  });

  it("rejects an attributeId that doesn't belong to this category at all", () => {
    const r = validateAttributeValues([storage], [{ attributeId: "not-a-real-attribute", optionId: "x" }]);
    expect(r).toMatchObject({ ok: false, error: "unknown_attribute" });
  });

  it("optional MULTISELECT with nothing chosen is fine", () => {
    const r = validateAttributeValues([colors], []);
    expect(r.ok).toBe(true);
  });

  it("rejects a non-finite NUMBER value", () => {
    const r = validateAttributeValues([warranty], [{ attributeId: "warranty", numberValue: Infinity }]);
    expect(r).toMatchObject({ ok: false, error: "invalid_number" });
  });

  it("silently ignores a BOOLEAN that's never required even when absent", () => {
    const r = validateAttributeValues([negotiable], []);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rows).toHaveLength(0);
  });

  it("rejects a malformed submitted-values shape instead of throwing", () => {
    expect(validateAttributeValues([storage], "not-an-array" as unknown)).toMatchObject({ ok: false, error: "invalid_attribute_values" });
    expect(validateAttributeValues([storage], [{ optionId: "128gb" }])).toMatchObject({ ok: false, error: "invalid_attribute_values" }); // missing attributeId
  });

  it("treats null/undefined submission as empty (not a crash)", () => {
    expect(validateAttributeValues([], null).ok).toBe(true);
    expect(validateAttributeValues([], undefined).ok).toBe(true);
  });
});
