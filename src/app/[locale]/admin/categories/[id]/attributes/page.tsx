import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCategoryBreadcrumb } from "@/lib/categories";
import AttributeManager from "@/components/admin/AttributeManager";

export default async function AdminCategoryAttributesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const category = await db.category.findUnique({ where: { id } });
  if (!category) notFound();

  const [attributes, breadcrumb] = await Promise.all([
    db.categoryAttribute.findMany({ where: { categoryId: id }, orderBy: { sortOrder: "asc" }, include: { options: { orderBy: { sortOrder: "asc" } } } }),
    getCategoryBreadcrumb(id),
  ]);

  return (
    <div>
      <nav className="mb-1 text-xs text-mute">
        <a href="../.." className="hover:text-dark">الأقسام</a>
        {breadcrumb.map((c) => <span key={c.id}> / {c.nameAr}</span>)}
      </nav>
      <h1 className="mb-1 font-display text-xl font-bold text-dark">حقول &quot;{category.nameAr}&quot;</h1>
      <p className="mb-6 text-sm text-mute">
        الحقول دي بتظهر لأي بائع بيرفّع إعلان في &quot;{category.nameAr}&quot; أو أي قسم فرعي منه — وبتبقى فلتر تلقائي في صفحة القسم.
      </p>
      <AttributeManager categoryId={id} attributes={attributes} />
    </div>
  );
}
