export const GENDERS = ["MALE", "FEMALE"] as const;
export const REFERRAL_SOURCES = ["FACEBOOK", "INSTAGRAM", "TIKTOK", "GOOGLE", "FRIEND", "OTHER"] as const;
export const MIN_AGE = 18;
export const MAX_AGE = 100;

// "YYYY-MM-DD" -> Date (UTC midnight), or null when malformed, in the
// future, or the person would be younger than MIN_AGE / older than MAX_AGE.
export function parseBirthDate(input: unknown, now: Date = new Date()): Date | null {
  if (typeof input !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input)) return null;
  const d = new Date(`${input}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== input) return null; // e.g. 2000-02-31
  const age = ageOn(d, now);
  return age >= MIN_AGE && age <= MAX_AGE ? d : null;
}

export function ageOn(birth: Date, now: Date = new Date()): number {
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  const m = now.getUTCMonth() - birth.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < birth.getUTCDate())) age--;
  return age;
}
