import { NextResponse } from "next/server";
import { getEffectiveAttributes } from "@/lib/categories";

export const dynamic = "force-dynamic";

// The fields a seller must fill (and buyers can filter by) for one
// category: its own attributes plus everything inherited from ancestors.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const attributes = await getEffectiveAttributes(id);
  return NextResponse.json({ attributes }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" } });
}
