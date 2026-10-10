"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { errorMessage } from "@/lib/errors";

// Real two-step OTP flow: request a code, verify it. A successful verify
// creates the account on first login (see /api/auth/verify-otp) — there's
// no separate signup form, which matches how most Egyptian users expect
// phone-first apps to work.
function LoginForm() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
  const sp = useSearchParams();
  const rt = sp.get("returnTo");
  // Same-site paths only (open-redirect protection).
  const returnTo = rt && rt.startsWith(`/${locale}/`) && !rt.startsWith("//") && !rt.includes("\\") ? rt : null;
  const isAr = locale === "ar";

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setLoading(false);
    if (!res.ok) {
      setError(errorMessage((await res.json().catch(() => ({}))).error, isAr));
      return;
    }
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    setLoading(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(errorMessage(body.error, isAr));
      return;
    }
    // First-time signup: send them to complete their profile (name,
    // location, shop category, bio, WhatsApp, photos) instead of dropping
    // them on the home page with nothing but a phone number as a name.
    if (body.needsOnboarding) {
      router.push(`/${locale}/onboarding${returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`);
    } else {
      router.push(returnTo || `/${locale}`);
    }
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="font-display text-2xl font-bold text-dark">
        {isAr ? "أهلاً بيك تاني" : "Welcome back"}
      </h1>
      <p className="mt-1 text-sm text-dark/50">
        {isAr ? "سجل دخولك برقم موبايلك — مفيش باسورد" : "Sign in with your phone — no password needed"}
      </p>

      {step === "phone" ? (
        <form onSubmit={requestCode} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-dark">{isAr ? "رقم الموبايل" : "Phone number"}</span>
            <input
              required
              type="tel"
              placeholder="01000000000"
              className="field-select"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button disabled={loading} type="submit" className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? (isAr ? "جاري الإرسال..." : "Sending...") : isAr ? "ابعتلي كود" : "Send code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-6 space-y-4">
          <p className="text-sm text-dark/60">
            {isAr ? `بعتنالك كود على ${phone}` : `We sent a code to ${phone}`}
            <span className="block text-xs text-mute">{isAr ? "الكود بيوصلك على واتساب" : "The code arrives on WhatsApp"}</span>
          </p>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-dark">{isAr ? "الكود" : "Code"}</span>
            <input
              required
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              className="field-select tracking-[0.5em] text-center"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button disabled={loading} type="submit" className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50">
            {loading ? (isAr ? "جاري التأكيد..." : "Verifying...") : isAr ? "تأكيد" : "Verify"}
          </button>
          <button type="button" onClick={() => setStep("phone")} className="w-full text-center text-xs font-semibold text-primary">
            {isAr ? "غيّر رقم الموبايل" : "Change phone number"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
