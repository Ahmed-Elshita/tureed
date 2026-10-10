import { db } from "@/lib/db";
import AdRequestRow from "@/components/admin/AdRequestRow";

export default async function AdminAdRequestsPage() {
  const requests = await db.adRequest.findMany({
    include: { product: true, seller: true },
    orderBy: { createdAt: "asc" },
  });

  const openCount = requests.filter((r) => r.status === "REQUESTED").length;

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-bold text-dark">طلبات الإعلانات الخارجية</h1>
      <p className="mb-6 text-sm text-mute">{openCount} طلب جديد بانتظار التواصل مع البائع</p>
      <div className="space-y-3">
        {requests.map((r) => (
          <AdRequestRow
            key={r.id}
            id={r.id}
            productTitle={r.product.titleAr}
            sellerName={r.seller.name}
            sellerPhone={r.seller.phone}
            platforms={r.platforms}
            budgetPerDay={Number(r.budgetPerDay)}
            days={r.days}
            estimatedTotal={Number(r.estimatedTotal)}
            targetNoteAr={r.targetNoteAr}
            status={r.status}
          />
        ))}
        {requests.length === 0 && <p className="text-sm text-mute">مفيش طلبات إعلانات خارجية لسه.</p>}
      </div>
    </div>
  );
}
