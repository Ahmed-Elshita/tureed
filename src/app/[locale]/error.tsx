"use client";

import { useEffect } from "react";

// Friendly fallback instead of the bare "Application error" screen.
export default function LocaleError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[page error]", error.digest, error.message);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="text-4xl">😕</p>
      <h1 className="mt-3 font-display text-lg font-bold text-dark">حصلت مشكلة مؤقتة / Something went wrong</h1>
      <p className="mt-1 text-sm text-mute">جرّب تاني بعد لحظات. / Please try again in a moment.</p>
      {error.digest && <p className="mt-2 text-[11px] text-mute" dir="ltr">ref: {error.digest}</p>}
      <button onClick={reset} className="mt-5 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white">
        إعادة المحاولة / Retry
      </button>
    </div>
  );
}
