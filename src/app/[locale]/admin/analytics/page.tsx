import { db } from "@/lib/db";

// Real aggregates from the actual tables — nothing here is a placeholder
// number. Date-bucketing is done in JS on a capped row fetch rather than a
// raw SQL date_trunc: simpler, no injection surface, and fine at this
// scale — revisit with a materialized daily-stats table once listing
// volume is high enough that this query gets slow.
async function listingsPerDay(days: number) {
  const since = new Date(Date.now() - days * 86400000);
  const rows = await db.product.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true }, take: 10000 });
  const buckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) buckets.set(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10), 0);
  for (const r of rows) {
    const key = r.createdAt.toISOString().slice(0, 10);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  return [...buckets.entries()];
}

export default async function AdminAnalyticsPage() {
  const [
    daily, totalViews, totalClicks, paidOrders, boostRevenueAgg,
    topCategoriesRaw, topLocationsRaw, usersByRole,
  ] = await Promise.all([
    listingsPerDay(14),
    db.product.aggregate({ _sum: { viewCount: true } }),
    db.product.aggregate({ _sum: { clickCount: true } }),
    db.order.count({ where: { status: "PAID" } }),
    db.boostOrder.aggregate({ where: { status: { in: ["ACTIVE", "EXPIRED"] } }, _sum: { totalPrice: true } }),
    db.product.groupBy({ by: ["categoryId"], where: { status: "PUBLISHED" }, _count: true, orderBy: { _count: { categoryId: "desc" } }, take: 5 }),
    db.product.groupBy({ by: ["locationId"], where: { status: "PUBLISHED" }, _count: true, orderBy: { _count: { locationId: "desc" } }, take: 5 }),
    db.user.groupBy({ by: ["role"], _count: true }),
  ]);

  const [categories, locations] = await Promise.all([
    db.category.findMany({ where: { id: { in: topCategoriesRaw.map((c) => c.categoryId) } }, select: { id: true, nameAr: true } }),
    db.location.findMany({ where: { id: { in: topLocationsRaw.map((l) => l.locationId) } }, select: { id: true, nameAr: true } }),
  ]);
  const catName = (id: string) => categories.find((c) => c.id === id)?.nameAr ?? id;
  const locName = (id: string) => locations.find((l) => l.id === id)?.nameAr ?? id;

  const maxDaily = Math.max(1, ...daily.map(([, n]) => n));

  return (
    <div>
      <h1 className="mb-6 font-display text-xl font-bold text-dark">الإحصائيات</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "إجمالي المشاهدات", value: totalViews._sum.viewCount ?? 0 },
          { label: "إجمالي التفاعل (اتصال/واتساب)", value: totalClicks._sum.clickCount ?? 0 },
          { label: "طلبات شراء مدفوعة", value: paidOrders },
          { label: "إيراد التمييز (EGP)", value: Number(boostRevenueAgg._sum.totalPrice ?? 0) },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-gray-light bg-white p-5">
            <p className="font-display text-2xl font-bold text-dark">{c.value.toLocaleString()}</p>
            <p className="mt-1 text-xs text-mute">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-gray-light bg-white p-5">
        <p className="mb-3 text-sm font-bold text-dark">إعلانات جديدة — آخر 14 يوم</p>
        <div className="flex h-28 items-end gap-1">
          {daily.map(([day, n]) => (
            <div key={day} className="flex-1 rounded-t bg-primary/70" style={{ height: `${(n / maxDaily) * 100}%`, minHeight: n > 0 ? 4 : 1 }} title={`${day}: ${n}`} />
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-gray-light bg-white p-5">
          <p className="mb-3 text-sm font-bold text-dark">أكتر الأقسام نشاطًا</p>
          {topCategoriesRaw.map((c) => (
            <div key={c.categoryId} className="flex justify-between border-t border-gray-light py-2 text-sm first:border-t-0">
              <span className="text-dark">{catName(c.categoryId)}</span>
              <span className="font-bold text-dark">{c._count}</span>
            </div>
          ))}
          {topCategoriesRaw.length === 0 && <p className="text-xs text-mute">لسه مفيش بيانات.</p>}
        </div>
        <div className="rounded-2xl border border-gray-light bg-white p-5">
          <p className="mb-3 text-sm font-bold text-dark">أكتر المناطق نشاطًا</p>
          {topLocationsRaw.map((l) => (
            <div key={l.locationId} className="flex justify-between border-t border-gray-light py-2 text-sm first:border-t-0">
              <span className="text-dark">{locName(l.locationId)}</span>
              <span className="font-bold text-dark">{l._count}</span>
            </div>
          ))}
          {topLocationsRaw.length === 0 && <p className="text-xs text-mute">لسه مفيش بيانات.</p>}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-light bg-white p-5">
        <p className="mb-3 text-sm font-bold text-dark">المستخدمين حسب النوع</p>
        <div className="flex flex-wrap gap-3">
          {usersByRole.map((r) => (
            <span key={r.role} className="rounded-full bg-gray-bg px-3 py-1.5 text-xs font-bold text-dark">{r.role}: {r._count}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
