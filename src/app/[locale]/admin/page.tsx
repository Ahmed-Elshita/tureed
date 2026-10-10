import { db } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export default async function AdminDashboard({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isAr = locale === "ar";

  const [productCount, userCount, pendingCount, reportCount, activeBoosts, pendingAdRequests, cartItems, pendingOrders, settings] =
    await Promise.all([
      db.product.count().catch(() => 0),
      db.user.count().catch(() => 0),
      db.product.count({ where: { status: "PENDING_REVIEW" } }).catch(() => 0),
      db.report.count({ where: { resolved: false } }).catch(() => 0),
      db.boostOrder.count({ where: { status: "ACTIVE" } }).catch(() => 0),
      db.adRequest.count({ where: { status: "REQUESTED" } }).catch(() => 0),
      db.cartItem.count().catch(() => 0),
      db.order.count({ where: { status: "PENDING_PAYMENT" } }).catch(() => 0),
      getSettings().catch(() => null),
    ]);

  const cards = [
    { label: isAr ? "إجمالي الإعلانات" : "Total listings", value: productCount, icon: "📦", tint: "#EFF4FF", color: "#2563EB" },
    { label: isAr ? "المستخدمين" : "Users", value: userCount, icon: "👥", tint: "#ECFDF5", color: "#16A34A" },
    { label: isAr ? "بانتظار المراجعة" : "Pending review", value: pendingCount, icon: "⏳", tint: "#FFFBEB", color: "#D97706" },
    { label: isAr ? "بلاغات مفتوحة" : "Open reports", value: reportCount, icon: "🚩", tint: "#FEF2F2", color: "#DC2626" },
    { label: isAr ? "إعلانات مميزة حاليًا" : "Currently boosted", value: activeBoosts, icon: "⚡", tint: "#FFFBEB", color: "#D97706" },
    { label: isAr ? "طلبات إعلانات جديدة" : "New ad requests", value: pendingAdRequests, icon: "📣", tint: "#F5F3FF", color: "#7C3AED" },
    { label: isAr ? "منتجات في السلات" : "Items in carts", value: cartItems, icon: "🛒", tint: "#F0F9FF", color: "#0284C7" },
    { label: isAr ? "طلبات شراء معلّقة" : "Pending buy requests", value: pendingOrders, icon: "🧾", tint: "#FDF2F8", color: "#DB2777" },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-xl font-bold text-dark">{isAr ? "لوحة التحكم" : "Dashboard"}</h1>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            settings?.paymentGatewayEnabled ? "bg-emerald-50 text-emerald-700" : "bg-gray-light text-dark/60"
          }`}
        >
          {isAr ? "بوابة الدفع:" : "Payment gateway:"} {settings?.paymentGatewayEnabled ? (isAr ? "مفعّلة" : "ON") : isAr ? "معطّلة" : "OFF"}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-gray-light bg-white p-5">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl text-sm"
              style={{ background: c.tint, color: c.color }}
            >
              {c.icon}
            </span>
            <p className="mt-3 font-display text-2xl font-bold text-dark">{c.value}</p>
            <p className="mt-0.5 text-xs text-mute">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
