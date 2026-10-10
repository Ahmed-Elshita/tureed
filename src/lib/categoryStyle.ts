// Categories are admin-created data (see prisma schema), so we can't
// hand-pick a color for each one in code. Instead we hash the slug to a
// fixed index into a curated palette — the same category always gets the
// same color, and a brand-new category an admin adds tomorrow still gets
// a distinct, deliberate accent instead of falling back to generic gray.
const PALETTE = [
  { color: "#2563EB", tint: "#EFF4FF" }, // blue
  { color: "#059669", tint: "#ECFDF5" }, // emerald
  { color: "#DB2777", tint: "#FDF2F8" }, // rose
  { color: "#0D9488", tint: "#F0FDFA" }, // teal
  { color: "#D97706", tint: "#FFFBEB" }, // amber
  { color: "#7C3AED", tint: "#F5F3FF" }, // violet
  { color: "#DC2626", tint: "#FEF2F2" }, // red
  { color: "#0284C7", tint: "#F0F9FF" }, // sky
] as const;

export function categoryAccent(slug: string): { color: string; tint: string } {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}
