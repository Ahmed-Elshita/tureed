import { NextRequest, NextResponse } from "next/server";
import { getClientIp, normalizePhone } from "@/lib/validate";
import { verifyOtp, createSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/spamGuard";

const CODE_RE = /^[0-9]{6}$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone = normalizePhone(body?.phone);
  const code = body?.code;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : "";

  if (!phone || typeof code !== "string" || !CODE_RE.test(code)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // verifyOtp() already caps wrong-code attempts per OTP record, but this
  // adds a second, IP-scoped limit so a script can't cycle through many
  // different phone numbers' codes from one machine.
  const ip = getClientIp(req);
  const limited = await checkRateLimit(`verify-ip:${ip}`, 20, 10 * 60);
  if (!limited.allowed) {
    return NextResponse.json({ error: "too_many_requests" }, { status: 429 });
  }

  const result = await verifyOtp(phone, code, "login");
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 401 });
  }

  // First successful OTP for a new phone number creates the account —
  // this is intentionally the whole signup flow, no separate form. The
  // client uses `isNewUser` to send first-timers to /onboarding (name,
  // location, shop category, bio, WhatsApp, photos) instead of straight
  // to the home page with a bare "phone number" profile.
  const existing = await db.user.findUnique({ where: { phone }, select: { id: true } });
  const user = await db.user.upsert({
    where: { phone },
    update: {}, // deliberately empty: does NOT clear an existing SUSPENDED status on re-login
    create: { phone, name: name || phone, status: "ACTIVE" },
  });

  await createSession(user.id);
  const needsOnboarding = user.role !== "ADMIN" && !user.onboardingCompletedAt;
  return NextResponse.json({ ok: true, userId: user.id, isNewUser: !existing, needsOnboarding });
}
