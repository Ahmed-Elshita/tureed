import { createHash, randomInt } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "./db";

const OTP_TTL_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const SESSION_COOKIE = "tureed_session";

const DEV_SECRET = "dev-only-secret-change-me";

// SECURITY: if this ever ran in production with the default secret,
// anyone could hand-craft a JWT for any user id — including a future
// admin account — and the server would accept it as a valid session.
// Failing loudly here (crashing on boot) is much safer than silently
// running with a publicly-known signing key, which a "works fine in the
// demo" deploy could easily do by accident.
if (process.env.NODE_ENV === "production" && (!process.env.AUTH_SECRET || process.env.AUTH_SECRET === DEV_SECRET)) {
  throw new Error(
    "AUTH_SECRET is missing or using the default dev value. Set a real random secret " +
      "(openssl rand -base64 32) before running in production — sessions are not safe otherwise."
  );
}

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || DEV_SECRET);

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

// Step 1 of login: generate a 6-digit code, store only its hash, send it
// via the SMS provider. Rate limiting the call site is the caller's job
// (see lib/spamGuard.ts) — this function just issues the code.
export async function requestOtp(phone: string, purpose: "login" | "signup" = "login") {
  const code = randomInt(100000, 999999).toString();
  await db.otpCode.create({
    data: {
      phone,
      purpose,
      codeHash: hashCode(code),
      expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000),
    },
  });
  return code; // caller passes this to smsProvider.send(), never returns it to the client
}

// Step 2: check the code against the most recent unconsumed OTP for that
// phone/purpose. Capped attempts + expiry stop brute-forcing a 6-digit code.
export async function verifyOtp(phone: string, code: string, purpose: "login" | "signup" = "login") {
  const record = await db.otpCode.findFirst({
    where: { phone, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) return { ok: false as const, reason: "expired_or_missing" };
  if (record.attempts >= OTP_MAX_ATTEMPTS) return { ok: false as const, reason: "too_many_attempts" };

  if (record.codeHash !== hashCode(code)) {
    await db.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return { ok: false as const, reason: "wrong_code" };
  }

  await db.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
  return { ok: true as const };
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.sub as string) ?? null;
  } catch {
    return null; // expired or tampered — treat as logged out
  }
}

// A valid session cookie only proves "this JWT was signed by us" — it
// does NOT prove the account is still allowed to act (an admin may have
// suspended it since the cookie was issued, and a 30-day cookie easily
// outlives that). Any endpoint that lets someone DO something (post a
// listing, boost, buy) should use this instead of getSessionUserId()
// alone, so a suspension takes effect immediately instead of up to 30
// days later.
export async function getActiveUser() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.status === "SUSPENDED") return null;
  return user;
}

// Like getActiveUser(), but the account must also have finished the
// mandatory signup form (name, WhatsApp, location, role, interests).
// Admins are exempt. Used by contacting sellers, posting, boosting, buying.
export async function getOnboardedUser() {
  const user = await getActiveUser();
  if (!user) return null;
  if (user.role === "ADMIN") return user;
  if (!user.onboardingCompletedAt) return null;
  return user;
}

// Every /admin page and admin-only API route should call this first.
// Returns the admin user on success, or null — callers turn null into a
// redirect (pages) or a 403 (API routes). There is currently no invite
// flow for admins; promote a user by setting role = 'ADMIN' directly in
// the database (see README) until an admin-management UI exists.
export async function requireAdmin() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user || user.role !== "ADMIN" || user.status === "SUSPENDED") return null;
  return user;
}

export async function clearSession() {
  (await cookies()).delete(SESSION_COOKIE);
}
