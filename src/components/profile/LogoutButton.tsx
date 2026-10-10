"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton({ isAr, locale }: { isAr: boolean; locale: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/${locale}`);
    router.refresh(); // re-fetch server components (Header) so it drops back to "guest" state
  }

  return (
    <button
      onClick={logout}
      disabled={busy}
      className="mt-6 w-full rounded-xl border border-red-200 py-2.5 text-sm font-bold text-red-500 disabled:opacity-50"
    >
      {busy ? (isAr ? "جاري تسجيل الخروج..." : "Logging out...") : isAr ? "تسجيل الخروج" : "Log out"}
    </button>
  );
}
