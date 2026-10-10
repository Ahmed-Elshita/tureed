"use client";

export interface InterestCategory {
  id: string;
  nameAr: string;
  nameEn: string;
}

export default function InterestCheckboxes({
  categories,
  value,
  onChange,
  isAr,
}: {
  categories: InterestCategory[];
  value: string[];
  onChange: (ids: string[]) => void;
  isAr: boolean;
}) {
  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {categories.map((c) => {
        const checked = value.includes(c.id);
        return (
          <label
            key={c.id}
            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm ${
              checked ? "border-primary bg-primary/5 font-semibold text-primary" : "border-gray-light text-dark"
            }`}
          >
            <input type="checkbox" className="accent-primary" checked={checked} onChange={() => toggle(c.id)} />
            {isAr ? c.nameAr : c.nameEn}
          </label>
        );
      })}
    </div>
  );
}
