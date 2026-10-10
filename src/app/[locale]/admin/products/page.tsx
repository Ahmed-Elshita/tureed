import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import AdminListingRow from "@/components/admin/AdminListingRow";
import ListingStatusFilter from "@/components/admin/ListingStatusFilter";
import Pagination from "@/components/product/Pagination";

const PAGE_SIZE = 25;
const VALID_STATUSES = ["PENDING_REVIEW", "PUBLISHED", "PAUSED", "REJECTED", "EXPIRED", "SOLD"];

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const status = sp.status && VALID_STATUSES.includes(sp.status) ? sp.status : sp.status === "ALL" ? null : "PENDING_REVIEW";
  const q = sp.q?.trim().slice(0, 100);
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));

  const where: Prisma.ProductWhereInput = {
    ...(status ? { status: status as Prisma.EnumListingStatusFilter["equals"] } : {}),
    ...(q ? { titleAr: { contains: q, mode: "insensitive" } } : {}),
  };

  const [total, products] = await Promise.all([
    db.product.count({ where }),
    db.product.findMany({
      where, orderBy: { createdAt: status === "PENDING_REVIEW" ? "asc" : "desc" },
      skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE,
      include: { seller: { select: { name: true } }, category: { select: { nameAr: true } }, images: { take: 1 } },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-bold text-dark">الإعلانات ({total})</h1>
      <p className="mb-4 text-sm text-mute">كل إعلانات المنصة — مش بس اللي بانتظار المراجعة.</p>
      <ListingStatusFilter />
      <div className="space-y-3">
        {products.map((p) => (
          <AdminListingRow
            key={p.id}
            id={p.id}
            title={p.titleAr}
            meta={`${p.category.nameAr} · ${p.seller.name}`}
            imageUrl={p.images[0]?.url ?? "/placeholder.svg"}
            status={p.status}
          />
        ))}
        {products.length === 0 && <p className="text-sm text-dark/50">مفيش إعلانات مطابقة.</p>}
      </div>
      <Pagination page={page} totalPages={totalPages} params={Object.fromEntries(Object.entries(sp).filter(([, v]) => v !== undefined) as [string, string][])} isAr />
    </div>
  );
}
