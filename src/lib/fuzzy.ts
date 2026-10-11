// Forgiving search ("like Google"): Arabic/English normalisation, light
// stemming, a small synonym table (mobile ↔ موبايل ↔ تليفون…), prefix and
// typo tolerance. Pure functions — unit-tested, no DB.

const DIACRITICS = /[ً-ٰٟـ]/g; // tashkeel + tatweel
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)))
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Strips the Arabic article and common plural/feminine endings so
// "الموبايلات" ≈ "موبايل", "شقق"/"شقه" stay close.
export function stem(token: string): string {
  let t = token;
  if (t.length > 4 && t.startsWith("ال")) t = t.slice(2);
  if (t.length > 4 && (t.endsWith("ات") || t.endsWith("ين") || t.endsWith("ون"))) t = t.slice(0, -2);
  else if (t.length > 3 && (t.endsWith("ه") || t.endsWith("ي"))) t = t.slice(0, -1);
  if (t.length > 3 && t.endsWith("s") && /^[a-z]+$/.test(t)) t = t.slice(0, -1); // English plural
  return t;
}

export function tokenize(input: string): string[] {
  return normalize(input).split(" ").filter(Boolean).map(stem).filter((t) => t.length > 0);
}

// Each group = words people use for the same thing (already in normalised form).
const SYNONYM_GROUPS: string[][] = [
  ["mobile", "phone", "smartphone", "cell", "iphone", "موبايل", "موبيل", "هاتف", "تليفون", "جوال", "فون"],
  ["tablet", "ipad", "تابلت", "ايباد"],
  ["laptop", "notebook", "macbook", "لابتوب", "لاب توب", "كمبيوتر", "حاسوب"],
  ["tv", "television", "screen", "تلفزيون", "تلفاز", "شاشه", "تليفزيون"],
  ["washing", "washer", "غساله", "غسالات"],
  ["fridge", "refrigerator", "freezer", "ثلاجه", "تلاجه", "فريزر"],
  ["ac", "conditioner", "air", "تكييف", "مكيف"],
  ["car", "vehicle", "auto", "عربيه", "سياره", "عربية", "سيارات"],
  ["motorcycle", "bike", "موتوسيكل", "دراجه", "موتور"],
  ["apartment", "flat", "شقه", "شقق"],
  ["villa", "house", "فيلا", "بيت", "منزل"],
  ["land", "plot", "ارض", "اراضي"],
  ["shop", "office", "commercial", "محل", "مكتب", "تجاري"],
  ["sofa", "couch", "living", "كنبه", "انتريه", "صالون", "ركنه"],
  ["bedroom", "bed", "غرفه", "سرير"],
  ["clothes", "clothing", "fashion", "wear", "ملابس", "هدوم", "لبس", "ازياء"],
  ["shoes", "shoe", "sneakers", "حذاء", "جزمه", "كوتشي", "احذيه"],
  ["bag", "handbag", "شنطه", "حقيبه"],
  ["toy", "toys", "game", "لعبه", "العاب"],
  ["camera", "كاميرا", "تصوير"],
  ["kitchen", "cooker", "مطبخ", "بوتاجاز"],
  ["service", "services", "خدمه", "خدمات"],
  ["tutor", "tutoring", "lesson", "teacher", "دروس", "مدرس", "درس"],
  ["repair", "maintenance", "plumber", "electrician", "صيانه", "سباك", "كهربائي"],
  ["design", "developer", "development", "website", "تصميم", "برمجه", "موقع"],
];

const SYN_INDEX = new Map<string, number>();
SYNONYM_GROUPS.forEach((group, i) => {
  for (const w of group) for (const t of tokenize(w)) if (!SYN_INDEX.has(t)) SYN_INDEX.set(t, i);
});

function trigrams(s: string): Set<string> {
  const p = `  ${s} `;
  const out = new Set<string>();
  for (let i = 0; i < p.length - 2; i++) out.add(p.slice(i, i + 3));
  return out;
}

export function trigramSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const A = trigrams(a);
  const B = trigrams(b);
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return (2 * inter) / (A.size + B.size);
}

// How well does ONE query token match ONE document token? 0..1
export function tokenMatch(q: string, d: string): number {
  if (q === d) return 1;
  const qs = SYN_INDEX.get(q);
  if (qs !== undefined && qs === SYN_INDEX.get(d)) return 0.9;
  if (q.length >= 2 && d.startsWith(q)) return 0.85; // typing "موب" finds "موبايل"
  if (q.length >= 3 && d.includes(q)) return 0.7;
  if (q.length >= 3 && d.length >= 3) {
    const sim = trigramSimilarity(q, d);
    if (sim >= 0.45) return sim * 0.8; // typos: "samsng" ≈ "samsung"
  }
  return 0;
}

export interface Field { text: string; weight: number }

// Score a document against a query: for each query token take its best
// match anywhere (weighted by field), then average over query tokens.
// A token that matches nothing drags the score down but does not zero it,
// so partial matches still surface as "closest results".
export function scoreDocument(queryTokens: string[], fields: Field[]): number {
  if (!queryTokens.length) return 0;
  const prepared = fields.map((f) => ({ w: f.weight, tokens: tokenize(f.text) }));
  let total = 0;
  for (const q of queryTokens) {
    let best = 0;
    for (const f of prepared) {
      for (const d of f.tokens) {
        const m = tokenMatch(q, d) * f.w;
        if (m > best) best = m;
      }
    }
    total += best;
  }
  return total / queryTokens.length;
}

export interface Doc { id: string; fields: Field[] }

// Strict pass first; if nothing is good enough, return the closest ones.
export function rankDocuments(query: string, docs: Doc[], limit = 500): string[] {
  const q = tokenize(query);
  if (!q.length) return [];
  const scored = docs.map((d) => ({ id: d.id, s: scoreDocument(q, d.fields) })).filter((x) => x.s > 0);
  scored.sort((a, b) => b.s - a.s);
  const strict = scored.filter((x) => x.s >= 0.6);
  const pickFrom = strict.length ? strict : scored.filter((x) => x.s >= 0.3);
  return pickFrom.slice(0, limit).map((x) => x.id);
}
