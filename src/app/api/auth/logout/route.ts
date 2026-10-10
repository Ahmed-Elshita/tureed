import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth";

// Until now there was no way to log out at all (the cookie lived 30 days).
export async function POST() {
  await clearSession();
  return NextResponse.json({ ok: true });
}
