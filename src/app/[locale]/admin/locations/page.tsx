import { buildTree } from "@/lib/tree";
import { getLocationsFlat } from "@/lib/locations";
import LocationTreeManager from "@/components/admin/LocationTreeManager";

export default async function AdminLocationsPage() {
  const flat = await getLocationsFlat(false);
  const tree = buildTree(flat);

  return (
    <div>
      <h1 className="mb-1 font-display text-xl font-bold text-dark">المواقع</h1>
      <p className="mb-6 text-sm text-mute">محافظة، مدينة/منطقة، حي — بلا حد للعمق. الإحداثيات اختيارية وبتتفعّل خريطة العقارات.</p>
      <LocationTreeManager tree={tree} />
    </div>
  );
}
