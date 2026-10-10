import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { grantDbAccess, isDbBrowserConfigured, passwordMatches, revokeDbAccess } from "@/lib/dbAccess";
import { checkRateLimit } from "@/lib/spamGuard";
import { getClientIp } from "@/lib/validate";

export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!isDbBrowserConfigured()) return NextResponse.json({ error: "db_password_not_configured" }, { status: 503 });

  // Brute-force protection: 5 attempts / 15 min per admin and per IP.
  const a = await checkRateLimit(`dbunlock:${admin.id}`, 5, 15 * 60);
  const b = await checkRateLimit(`dbunlock-ip:${getClientIp(req)}`, 10, 15 * 60);
  if (!a.allowed || !b.allowed) return NextResponse.json({ error: "too_many_requests" }, { status: 429 });

  const body = await req.json().catch(() => null);
  if (typeof body?.password !== "string" || !passwordMatches(body.password)) {
    return NextResponse.json({ error: "wrong_db_password" }, { status: 401 });
  }
  await grantDbAccess(admin.id);
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  await revokeDbAccess();
  return NextResponse.json({ ok: true });
}
