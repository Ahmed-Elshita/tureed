"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  productId: string;
  locale: string;
  isAr: boolean;
  isLoggedIn: boolean;
  hasFixedPrice: boolean;
  initialFavorited: boolean;
  initialInCart: boolean;
}

export default function BuyerActions({ productId, locale, isAr, isLoggedIn, hasFixedPrice, initialFavorited, initialInCart }: Props) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [inCart, setInCart] = useState(initialInCart);
  const [busy, setBusy] = useState(false);
  const [orderMsg, setOrderMsg] = useState<string | null>(null);

  function requireLogin() {
    router.push(`/${locale}/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
  }

  async function toggleFavorite() {
    if (!isLoggedIn) return requireLogin();
    setBusy(true);
    await fetch("/api/favorites", {
      method: favorited ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    setBusy(false);
    setFavorited(!favorited);
  }

  async function toggleCart() {
    if (!isLoggedIn) return requireLogin();
    setBusy(true);
    await fetch("/api/cart", {
      method: inCart ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    setBusy(false);
    setInCart(!inCart);
  }

  async function buyNow() {
    if (!isLoggedIn) return requireLogin();
    setBusy(true);
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });
    setBusy(false);
    const body = await res.json().catch(() => ({}));
    if (res.status === 403 && body.error === "onboarding_required") {
      router.push(`/${locale}/onboarding?returnTo=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!res.ok) {
      setOrderMsg(isAr ? "معنديش إمكانية أشتري ده دلوقتي" : "Can't buy this right now");
      return;
    }
    setOrderMsg(
      body.status === "PAID"
        ? isAr
          ? "✅ تم الدفع! هيتواصل معاك البائع لتسليم المنتج."
          : "✅ Paid! The seller will reach out to arrange delivery."
        : isAr
        ? "⏳ خدمة الدفع لسه مش مفعّلة فعليًا — طلبك اتسجل وهيتواصل معاك فريقنا أو البائع."
        : "⏳ Real payment isn't enabled yet — your request is recorded and our team or the seller will follow up."
    );
  }

  return (
    <div className="mt-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={toggleFavorite}
          disabled={busy}
          className={`rounded-xl border py-2.5 text-sm font-bold ${favorited ? "border-red-300 bg-red-50 text-red-600" : "border-gray-light text-dark"}`}
        >
          {favorited ? "❤️" : "🤍"} {isAr ? "محفوظ" : "Saved"}
        </button>
        <button
          onClick={toggleCart}
          disabled={busy}
          className={`rounded-xl border py-2.5 text-sm font-bold ${inCart ? "border-primary bg-primary/5 text-primary" : "border-gray-light text-dark"}`}
        >
          🛒 {inCart ? (isAr ? "في السلة" : "In cart") : isAr ? "أضف للسلة" : "Add to cart"}
        </button>
      </div>

      {hasFixedPrice && (
        <button onClick={buyNow} disabled={busy} className="mt-2 w-full rounded-xl bg-dark py-3 text-sm font-bold text-white disabled:opacity-50">
          {isAr ? "اشترِ الآن" : "Buy now"}
        </button>
      )}
      {orderMsg && <p className="mt-2 text-center text-xs text-dark/70">{orderMsg}</p>}
      {!isLoggedIn && (
        <p className="mt-2 text-center text-[11px] text-mute">
          {isAr ? "سجل دخول علشان تحفظ أو تضيف للسلة أو تشتري" : "Log in to save, add to cart, or buy"}
        </p>
      )}
    </div>
  );
}
