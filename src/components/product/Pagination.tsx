import Link from "next/link";
import { buildQuery } from "@/lib/listingQuery";

export default function Pagination({
  page, totalPages, params, isAr,
}: { page: number; totalPages: number; params: Record<string, string>; isAr: boolean }) {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-6 flex items-center justify-center gap-2">
      <Link
        aria-disabled={page <= 1}
        href={buildQuery(params, { page: String(Math.max(1, page - 1)) })}
        className={`rounded-xl border border-gray-light px-3 py-2 text-sm font-bold ${page <= 1 ? "pointer-events-none opacity-40" : "text-dark"}`}
      >
        {isAr ? "السابق" : "Prev"}
      </Link>
      <span className="text-sm text-mute">{page} / {totalPages}</span>
      <Link
        aria-disabled={page >= totalPages}
        href={buildQuery(params, { page: String(Math.min(totalPages, page + 1)) })}
        className={`rounded-xl border border-gray-light px-3 py-2 text-sm font-bold ${page >= totalPages ? "pointer-events-none opacity-40" : "text-dark"}`}
      >
        {isAr ? "التالي" : "Next"}
      </Link>
    </div>
  );
}
