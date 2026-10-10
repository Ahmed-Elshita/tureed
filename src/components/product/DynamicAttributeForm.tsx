"use client";

import type { CategoryAttributeDTO } from "@/lib/types";

interface Props {
  attributes: CategoryAttributeDTO[];
  values: Record<string, string | string[] | number | boolean | undefined>;
  onChange: (attributeId: string, value: string | string[] | number | boolean | undefined) => void;
  errorIds?: Set<string>; // attributes to highlight (required but empty)
  isAr: boolean;
}

// Renders whatever fields the chosen category defines (its own + inherited
// from every ancestor). Every choice is a closed list (SELECT/MULTISELECT)
// or a constrained NUMBER/BOOLEAN — never free text — so the data stays
// clean and filterable.
export default function DynamicAttributeForm({ attributes, values, onChange, errorIds, isAr }: Props) {
  if (attributes.length === 0) {
    return <p className="text-sm text-dark/50">{isAr ? "القسم ده مفيهوش خصائص إضافية." : "This category has no extra fields."}</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {attributes.map((attr) => {
        const label = isAr ? attr.labelAr : attr.labelEn;
        const hasError = errorIds?.has(attr.id);
        const star = attr.isRequired && <span className="text-red-500"> *</span>;
        const errorRing = hasError ? "ring-2 ring-red-300" : "";

        if (attr.inputType === "SELECT") {
          return (
            <label key={attr.id} className="block text-sm">
              <span className="mb-1 block font-medium text-dark">{label}{star}</span>
              <select
                className={`field-select ${errorRing}`}
                value={(values[attr.id] as string) ?? ""}
                onChange={(e) => onChange(attr.id, e.target.value || undefined)}
              >
                <option value="">{isAr ? "اختار..." : "Select..."}</option>
                {attr.options.map((opt) => (
                  <option key={opt.id} value={opt.id}>{isAr ? opt.labelAr : opt.labelEn}</option>
                ))}
              </select>
            </label>
          );
        }

        if (attr.inputType === "MULTISELECT") {
          const current = (values[attr.id] as string[]) ?? [];
          return (
            <fieldset key={attr.id} className={`block rounded-xl text-sm ${errorRing}`}>
              <legend className="mb-1 font-medium text-dark">{label}{star}</legend>
              <div className="flex flex-wrap gap-2">
                {attr.options.map((opt) => {
                  const checked = current.includes(opt.id);
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      aria-pressed={checked}
                      onClick={() => onChange(attr.id, checked ? current.filter((v) => v !== opt.id) : [...current, opt.id])}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${checked ? "border-primary bg-primary/10 text-primary" : "border-gray-light text-dark/70"}`}
                    >
                      {isAr ? opt.labelAr : opt.labelEn}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        }

        if (attr.inputType === "NUMBER") {
          return (
            <label key={attr.id} className="block text-sm">
              <span className="mb-1 block font-medium text-dark">{label}{star}</span>
              <input
                type="number"
                inputMode="decimal"
                className={`field-select ${errorRing}`}
                value={(values[attr.id] as number | undefined) ?? ""}
                onChange={(e) => onChange(attr.id, e.target.value === "" ? undefined : Number(e.target.value))}
              />
            </label>
          );
        }

        return (
          <label key={attr.id} className="flex items-center gap-2 text-sm font-medium text-dark">
            <input
              type="checkbox"
              checked={Boolean(values[attr.id])}
              onChange={(e) => onChange(attr.id, e.target.checked)}
              className="h-4 w-4 rounded border-gray-light text-primary"
            />
            {label}
          </label>
        );
      })}
    </div>
  );
}
