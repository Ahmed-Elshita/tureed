import { randomBytes } from "crypto";

// Trims and length-limits a user-supplied string. Returns null when it's
// not a string or ends up empty, so callers can treat "missing" uniformly.
export function cleanString(v: unknown, maxLen: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length === 0 || t.length > maxLen) return null;
  return t;
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  // Random suffix guarantees uniqueness without a lookup-then-insert race.
  return `${base || "item"}-${randomBytes(3).toString("hex")}`;
}

// Real client IP behind a proxy: x-forwarded-for is a comma list
// ("client, proxy1, proxy2"). Using the raw header as a rate-limit key let
// an attacker rotate the tail of the list to dodge limits — take only the
// first entry. (Only trustworthy when the app runs behind a proxy that
// sets/overwrites the header, e.g. Vercel or Cloudflare.)
export function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim().slice(0, 64) || "unknown";
  return req.headers.get("x-real-ip")?.slice(0, 64) ?? "unknown";
}

// URL-safe slug that KEEPS Arabic letters (so an Arabic title gives a
// readable, SEO-friendly URL) plus a random suffix for uniqueness.
export function slugifyUnicode(input: string): string {
  const base = input
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "listing"}-${randomBytes(3).toString("hex")}`;
}

// Phone numbers arrive as people type them: "01012345678", "+20 101 234 5678",
// "0020...". WhatsApp links (wa.me) need full international digits, and the
// same person must not become two accounts ("010..." vs "+2010..."), so every
// phone is normalized to E.164 (+201012345678) BEFORE it's stored or compared.
// Returns null when it can't be a valid number.
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let p = input.replace(/[\s\-()]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (/^01[0-9]{9}$/.test(p)) p = "+20" + p.slice(1); // Egyptian mobile in local format
  else if (/^20[0-9]{10}$/.test(p)) p = "+" + p; // country code without "+"
  return /^\+[1-9][0-9]{7,14}$/.test(p) ? p : null;
}
