import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Who tried to contact whom: one row per buyer click on a seller's contact.
export default async function AdminContactsPage() {
  const [events, total, top] = await Promise.all([
    db.contactEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true, type: true, createdAt: true,
        buyer: { select: { name: true, phone: true } },
        seller: { select: { name: true, storeName: true, phone: true } },
        product: { select: { titleAr: true, slug: true } },
      },
    }),
    db.contactEvent.count(),
    db.contactEvent.groupBy({ by: ["sellerId"], _count: { _all: true }, orderBy: { _count: { sellerId: "desc" } }, take: 5 }),
  ]);
  const topSellers = await db.user.findMany({ where: { id: { in: top.map((t) => t.sellerId) } }, select: { id: true, name: true, storeName: true } });
  const nameOf = (id: string) => { const u = topSellers.find((x) => x.id === id); return u ? u.storeName || u.name : id; };

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-bold text-dark">🤝 تفاعلات المشترين والبائعين ({total})</h1>
      <p className="mb-4 text-sm text-mute">كل مرة مشتري بيدوس على تواصل مع بائع بتتسجل هنا. التصدير الكامل من تبويب قاعدة البيانات ← ContactEvent.</p>
      {top.length > 0 && (
        <p className="mb-4 text-xs text-dark">الأكتر تلقيًا للتواصل: {top.map((t) => `${nameOf(t.sellerId)} (${t._count._all})`).join(" · ")}</p>
      )}
      <div className="overflow-x-auto rounded-2xl border border-gray-light bg-white">
        <table className="w-full text-xs">
          <thead className="bg-gray-bg text-mute">
            <tr>{["الوقت", "المشتري", "البائع", "الإعلان", "النوع"].map((h) => <th key={h} className="px-3 py-2 text-start font-bold">{h}</th>)}</tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-t border-gray-light">
                <td className="whitespace-nowrap px-3 py-2" dir="ltr">{e.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td className="px-3 py-2">{e.buyer.name} <span className="text-mute" dir="ltr">{e.buyer.phone}</span></td>
                <td className="px-3 py-2">{e.seller.storeName || e.seller.name} <span className="text-mute" dir="ltr">{e.seller.phone}</span></td>
                <td className="max-w-[240px] truncate px-3 py-2">{e.product.titleAr}</td>
                <td className="px-3 py-2">{e.type}</td>
              </tr>
            ))}
            {events.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-mute">لسه مفيش تفاعلات.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
