import { buildTree } from "@/lib/tree";
import { getCategoriesFlat } from "@/lib/categories";
import CategoryTreeManager from "@/components/admin/CategoryTreeManager";

// Admin sees INACTIVE nodes too (greyed out / strikethrough), unlike every
// public page which only ever shows active ones.
export default async function AdminCategoriesPage() {
  const flat = await getCategoriesFlat(false);
  const tree = buildTree(flat);

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-bold text-dark">الأقسام</h1>
      <p className="mb-6 text-sm text-mute">قسم رئيسي، فرعي، وفرعي-فرعي — بلا حد للعمق. كل قسم جديد بيظهر فورًا في فورم الإعلان وفلاتر البحث.</p>
      <CategoryTreeManager tree={tree} />
    </div>
  );
}
