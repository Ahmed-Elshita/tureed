import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "./auth";

// Returns a 403 response when the caller isn't an admin, otherwise null.
//   const denied = await adminGuard(); if (denied) return denied;
export async function adminGuard() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  // Admin routes are the only place categories/locations/fields change, so
  // drop the cached taxonomy here: the admin sees their edit immediately
  // (the public cache otherwise lives up to 30s).
  revalidateTag("taxonomy");
  return null;
}

export const jsonError = (error: string, status = 400, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ error, ...extra }, { status });
