"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  productId: string;
  slug: string;
  title: string;
  price: number | null;
  imageUrl: string;
  locale: string;
  isAr: boolean;
}

export default function CartItemRow({ productId, slug, title, price, imageUrl, locale, isAr }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function remove() {
    setBusy(true);
    await fetch("/api/cart", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    router.refresh();
  }

  async function buyNow() {
    setBusy(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    setBusy(false);
    const body = await res.json().catch(() => ({}));
    setMsg(
      !res.ok
        ? isAr ? "معنديش إمكانية أشتري ده دلوقتي" : "Can't buy this right now"
        : body.status === "PAID"
        ? isAr ? "✅ تم الدفع!" : "✅ Paid!"
        : isAr ? "⏳ اتسجل الطلب — الدفع الحقيقي لسه مش مفعّل" : "⏳ Request recorded — real payment isn't enabled yet"
    );
  }

  return (
    <div className="rounded-2xl border border-gray-light bg-white p-3">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
        <div className="min-w-0 flex-1">
          <a href={`/${locale}/product/${slug}`} className="line-clamp-1 text-sm font-bold text-dark">
            {title}
          </a>
          {price && <p className="text-sm font-bold text-primary">{price.toLocaleString()} EGP</p>}
        </div>
        <button onClick={remove} disabled={busy} className="shrink-0 text-xs font-bold text-red-500 disabled:opacity-50">
          {isAr ? "حذف" : "Remove"}
        </button>
      </div>
      {price && (
        <button onClick={buyNow} disabled={busy} className="mt-2 w-full rounded-xl bg-dark py-2 text-xs font-bold text-white disabled:opacity-50">
          {isAr ? "اشترِ الآن" : "Buy now"}
        </button>
      )}
      {msg && <p className="mt-2 text-center text-xs text-dark/70">{msg}</p>}
    </div>
  );
}
