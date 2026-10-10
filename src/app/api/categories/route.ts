import { NextResponse } from "next/server";
import { getCategoryTree } from "@/lib/categories";

export const dynamic = "force-dynamic";

// Public, read-only: the full ACTIVE tree at any depth. Creating/editing
// categories lives under /api/admin/categories (admin only).
export async function GET() {
  const tree = await getCategoryTree();
  return NextResponse.json(tree, {
    // Short CDN cache: category trees change rarely and every visitor's
    // listing form/filters need them — cheaper on slow mobile networks.
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
