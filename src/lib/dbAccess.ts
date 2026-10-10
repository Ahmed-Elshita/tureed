import { createHash, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { requireAdmin } from "./auth";

// Second lock on top of admin login: the database browser needs
// ADMIN_DB_PASSWORD. Unlocking sets a short-lived signed HttpOnly cookie
// bound to the admin's user id. If ADMIN_DB_PASSWORD isn't set the feature
// is disabled entirely (never open by default).
const COOKIE = "tureed_dbunlock";
const TTL_SECONDS = 30 * 60;

const secret = new TextEncoder().encode((process.env.AUTH_SECRET || "dev-only-secret-change-me") + ":db-unlock");

export const isDbBrowserConfigured = () => !!process.env.ADMIN_DB_PASSWORD;

export function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_DB_PASSWORD;
  if (!expected) return false;
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export async function grantDbAccess(adminId: string) {
  const token = await new SignJWT({ sub: adminId, scope: "db" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secret);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: TTL_SECONDS,
    path: "/",
  });
}

export async function revokeDbAccess() {
  (await cookies()).delete(COOKIE);
}

// Returns the admin when BOTH locks are open (admin session + DB password).
export async function requireDbAccess() {
  if (!isDbBrowserConfigured()) return null;
  const admin = await requireAdmin();
  if (!admin) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload.sub === admin.id && payload.scope === "db" ? admin : null;
  } catch {
    return null;
  }
}
