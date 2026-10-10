// The listing form hides/validates fields in the browser, but the browser
// can't be trusted: a script can POST anything. This is the server-side
// check that enforces the two rules the business depends on —
//   1. every REQUIRED attribute of the chosen category (own + inherited
//      from ancestors) is filled in, and
//   2. every dropdown value is a real option of THAT attribute (so the
//      data stays clean and filterable — no free text, no foreign ids).

export type AttributeInputType = "SELECT" | "MULTISELECT" | "NUMBER" | "BOOLEAN";

export interface AttributeDef {
  id: string;
  inputType: AttributeInputType;
  isRequired: boolean;
  options: { id: string }[];
}

export interface SubmittedValue {
  attributeId?: unknown;
  optionId?: unknown;
  numberValue?: unknown;
  boolValue?: unknown;
}

export interface AttributeRow {
  attributeId: string;
  optionId: string | null;
  numberValue: number | null;
  boolValue: boolean | null;
}

export type ValidationResult =
  | { ok: true; rows: AttributeRow[] }
  | { ok: false; error: string; attributeId?: string };

const MAX_NUMBER = 1_000_000_000_000;

export function validateAttributeValues(defs: AttributeDef[], submitted: unknown): ValidationResult {
  if (submitted === undefined || submitted === null) submitted = [];
  if (!Array.isArray(submitted)) return { ok: false, error: "invalid_attribute_values" };

  const defById = new Map(defs.map((d) => [d.id, d]));
  const grouped = new Map<string, SubmittedValue[]>();

  for (const item of submitted as SubmittedValue[]) {
    if (!item || typeof item !== "object" || typeof item.attributeId !== "string") {
      return { ok: false, error: "invalid_attribute_values" };
    }
    if (!defById.has(item.attributeId)) {
      return { ok: false, error: "unknown_attribute", attributeId: item.attributeId };
    }
    const list = grouped.get(item.attributeId) ?? [];
    list.push(item);
    grouped.set(item.attributeId, list);
  }

  const rows: AttributeRow[] = [];

  for (const def of defs) {
    const values = grouped.get(def.id) ?? [];
    const optionIds = new Set(def.options.map((o) => o.id));

    if (def.inputType === "SELECT") {
      if (values.length === 0) {
        if (def.isRequired) return { ok: false, error: "missing_required_attribute", attributeId: def.id };
        continue;
      }
      if (values.length > 1) return { ok: false, error: "too_many_values", attributeId: def.id };
      const optionId = values[0].optionId;
      if (typeof optionId !== "string" || !optionIds.has(optionId)) {
        return { ok: false, error: "invalid_option", attributeId: def.id };
      }
      rows.push({ attributeId: def.id, optionId, numberValue: null, boolValue: null });
    } else if (def.inputType === "MULTISELECT") {
      const chosen = new Set<string>();
      for (const v of values) {
        if (typeof v.optionId !== "string" || !optionIds.has(v.optionId)) {
          return { ok: false, error: "invalid_option", attributeId: def.id };
        }
        chosen.add(v.optionId);
      }
      if (chosen.size === 0) {
        if (def.isRequired) return { ok: false, error: "missing_required_attribute", attributeId: def.id };
        continue;
      }
      for (const optionId of chosen) {
        rows.push({ attributeId: def.id, optionId, numberValue: null, boolValue: null });
      }
    } else if (def.inputType === "NUMBER") {
      if (values.length === 0 || values[0].numberValue === null || values[0].numberValue === undefined) {
        if (def.isRequired) return { ok: false, error: "missing_required_attribute", attributeId: def.id };
        continue;
      }
      if (values.length > 1) return { ok: false, error: "too_many_values", attributeId: def.id };
      const n = values[0].numberValue;
      if (typeof n !== "number" || !Number.isFinite(n) || Math.abs(n) > MAX_NUMBER) {
        return { ok: false, error: "invalid_number", attributeId: def.id };
      }
      rows.push({ attributeId: def.id, optionId: null, numberValue: n, boolValue: null });
    } else {
      // BOOLEAN — absent simply means "not set"; a required checkbox would
      // mean "must be ticked", which isn't a meaningful listing rule.
      if (values.length === 0 || values[0].boolValue === undefined || values[0].boolValue === null) continue;
      if (typeof values[0].boolValue !== "boolean") return { ok: false, error: "invalid_boolean", attributeId: def.id };
      rows.push({ attributeId: def.id, optionId: null, numberValue: null, boolValue: values[0].boolValue });
    }
  }

  return { ok: true, rows };
}
