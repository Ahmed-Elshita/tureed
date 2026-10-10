"use client";

import { useRouter } from "next/navigation";

export default function DbLockButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/admin/db/unlock", { method: "DELETE" });
        router.refresh();
      }}
      className="rounded-lg border border-gray-light bg-white px-3 py-1.5 text-xs font-bold text-dark"
    >
      🔒 قفل
    </button>
  );
}
