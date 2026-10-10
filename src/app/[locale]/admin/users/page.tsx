import { db } from "@/lib/db";
import AdminUserRow from "@/components/admin/AdminUserRow";

// This is the "كل الـ profiles" control tab — every seller/buyer page on
// the platform, with a direct link to view the public page exactly as a
// customer would see it, plus verify/suspend controls.
export default async function AdminUsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-bold text-dark">المستخدمين والملفات الشخصية ({users.length})</h1>
      <p className="mb-6 text-sm text-mute">كل حساب على المنصة، مع رابط مباشر لصفحته العامة زي ما العميل شايفها بالظبط.</p>
      <div className="space-y-2">
        {users.map((u) => (
          <AdminUserRow
            key={u.id}
            id={u.id}
            name={u.name}
            storeName={u.storeName}
            avatarUrl={u.avatarUrl}
            phone={u.phone}
            role={u.role}
            status={u.status}
            isVerified={u.isVerified}
            listingCount={u._count.products}
            locale={locale}
          />
        ))}
        {users.length === 0 && <p className="text-sm text-mute">مفيش مستخدمين لسه.</p>}
      </div>
    </div>
  );
}
