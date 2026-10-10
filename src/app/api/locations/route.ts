import { NextResponse } from "next/server";
import { getLocationTree } from "@/lib/locations";

export const dynamic = "force-dynamic";

// Public, read-only nested tree of active locations (any depth).
export async function GET() {
  const tree = await getLocationTree();
  return NextResponse.json(tree, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
