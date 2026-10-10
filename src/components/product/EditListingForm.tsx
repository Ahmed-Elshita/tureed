"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ImageDropzone from "@/components/product/ImageDropzone";

interface Props {
  slug: string;
  locale: string;
  isAr: boolean;
  initial: {
    titleAr: string;
    descriptionAr: string;
    price: number | null;
    isNegotiable: boolean;
    imageUrls: string[];
  };
}

export default function EditListingForm({ slug, locale, isAr, initial }: Props) {
  const router = useRouter();
  const [titleAr, setTitleAr] = useState(initial.titleAr);
  const [descriptionAr, setDescriptionAr] = useState(initial.descriptionAr);
  const [price, setPrice] = useState(initial.price?.toString() ?? "");
  const [isNegotiable, setIsNegotiable] = useState(initial.isNegotiable);
  const [imageUrls, setImageUrls] = useState(initial.imageUrls);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/products/${slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titleAr,
        descriptionAr,
        price: price ? Number(price) : null,
        isNegotiable,
        imageUrls,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError(isAr ? "حصل خطأ، حاول تاني" : "Something went wrong");
      return;
    }
    router.push(`/${locale}/profile`);
  }

  return (
    <form onSubmit={save} className="space-y-5 rounded-2xl border border-gray-light bg-white p-6">
      <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
        {isAr
          ? "تعديل العنوان/الوصف/السعر/الصور بيرجع الإعلان لطابور المراجعة قبل ما يظهر تاني."
          : "Editing title/description/price/photos sends the listing back to moderation before it's public again."}
      </p>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-dark">{isAr ? "عنوان الإعلان" : "Title"}</span>
        <input required className="field-select" value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-dark">{isAr ? "السعر (EGP)" : "Price (EGP)"}</span>
        <input type="number" className="field-select" value={price} onChange={(e) => setPrice(e.target.value)} />
      </label>

      <label className="flex items-center gap-2 text-sm font-medium text-dark">
        <input type="checkbox" checked={isNegotiable} onChange={(e) => setIsNegotiable(e.target.checked)} />
        {isAr ? "قابل للتفاوض" : "Negotiable"}
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-dark">{isAr ? "الوصف" : "Description"}</span>
        <textarea required rows={4} className="field-select" value={descriptionAr} onChange={(e) => setDescriptionAr(e.target.value)} />
      </label>

      <div>
        <label className="mb-1 block text-sm font-medium text-dark">{isAr ? "الصور" : "Photos"}</label>
        <ImageDropzone initialUrls={imageUrls} onChange={setImageUrls} />
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button disabled={saving} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white disabled:opacity-50">
        {saving ? (isAr ? "جاري الحفظ..." : "Saving...") : isAr ? "احفظ التعديلات" : "Save changes"}
      </button>
    </form>
  );
}
