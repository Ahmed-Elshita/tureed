import { NextRequest, NextResponse } from "next/server";
import { searchListings } from "@/lib/search";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json([]);
  const results = await searchListings(q);
  return NextResponse.json(results);
}
