/**
 * seed-ads.ts — inserts 10 sample PUBLISHED listings into EVERY leaf category
 * (the categories listings can be posted in), with prices, locations, photos,
 * required category fields filled in, and a few "featured" ones.
 *
 * Run (from the project folder, with DATABASE_URL set in .env):
 *     npx tsx prisma/seed-ads.ts
 *
 * Safe to re-run: it first removes the ads it created before (slug starts with
 * "demo-") and re-creates them, so you never get duplicates. Your real
 * listings are never touched. New categories you add from the dashboard are
 * picked up automatically (they get generic ads).
 *
 * Photos: ONE small (480x360) picture per ad from picsum.photos (fast, reliable;
 * they are random stock photos, not matched to the title). Real sellers upload their own.
 */
import { PrismaClient } from "@prisma/client";

// Kept small on purpose (fast pages, small DB). Override: ADS_PER_CATEGORY=10 npx tsx prisma/seed-ads.ts
const ADS_PER_CATEGORY = Math.min(10, Math.max(1, Number(process.env.ADS_PER_CATEGORY) || 6));

// ── Sample content, keyed by the category's English name ─────────────────
// [min price, max price, photo keyword, 10 Arabic titles]
type Pool = [number, number, string, string[]];
const POOLS: Record<string, Pool> = {
  "Mobiles & Tablets": [4000, 45000, "smartphone", ["آيفون 13 برو 256 جيجا", "سامسونج جالكسي S23 الترا", "شاومي ريدمي نوت 12", "أوبو رينو 8", "ريلمي 11 برو", "آيباد برو 11 بوصة", "سامسونج تاب S8", "هواوي نوفا 11", "آيفون 12 بحالة ممتازة", "إنفينيكس نوت 30"]],
  Laptops: [10000, 80000, "laptop", ["ماك بوك إير M1", "لينوفو ثينك باد T14", "ديل إكس بي إس 13", "إتش بي بافيليون i5", "أسوس روج جيمنج", "ماك بوك برو M2", "لينوفو أيديا باد 3", "ديل لاتيتيود 7420", "إتش بي إيليت بوك", "مايكروسوفت سيرفس لابتوب"]],
  TVs: [6000, 40000, "television", ["شاشة سامسونج 55 بوصة 4K", "شاشة LG OLED 65 بوصة", "شاشة سوني برافيا 50 بوصة", "شاشة تي سي إل 43 بوصة سمارت", "شاشة شارب 32 بوصة", "شاشة هايسنس 58 بوصة", "شاشة توشيبا 55 بوصة", "شاشة سامسونج كيرف 49 بوصة", "شاشة LG نانوسيل 55 بوصة", "شاشة شاومي 43 بوصة"]],
  Cameras: [5000, 70000, "camera", ["كاميرا كانون 200D", "كاميرا نيكون D3500", "سوني ألفا A7 III", "كانون EOS R6", "فوجي فيلم X-T30", "جوبرو هيرو 11", "كانون 80D بعدسة", "نيكون Z6", "سوني ZV-E10 للفلوج", "عدسة كانون 50mm"]],
  "Men's Clothing": [150, 2500, "menswear", ["قميص رجالي قطن", "بنطلون جينز رجالي", "جاكيت جلد طبيعي", "تيشيرت بولو", "بدلة كلاسيك كاملة", "هودي شتوي", "طقم رياضي رجالي", "جاكيت جينز", "شورت رياضي", "قميص كتان صيفي"]],
  "Men's Shoes": [300, 4000, "sneakers", ["نايك إير فورس 1", "أديداس سوبر ستار", "حذاء كلاسيك جلد", "كوتشي رياضي للجري", "صندل جلد رجالي", "بوت شتوي", "حذاء كاجوال", "فانز أولد سكول", "حذاء رسمي أسود", "نيو بالانس 530"]],
  "Women's Clothing": [150, 3000, "dress", ["فستان سهرة", "عباية كريب", "بلوزة ستان", "جيبة ميدي", "طقم حريمي كاجوال", "جاكيت شتوي حريمي", "فستان صيفي", "بنطلون واسع", "كارديجان صوف", "إسدال صلاة"]],
  "Bags & Accessories": [100, 6000, "handbag", ["شنطة يد جلد", "شنطة ظهر", "ساعة حريمي", "طقم إكسسوار فضة", "نظارة شمس", "شنطة كروس", "محفظة جلد", "إيشارب حرير", "حزام جلد", "شنطة سفر"]],
  "Kids' Clothing": [80, 1200, "kidsclothes", ["طقم مولود قطن", "فستان بنات للمناسبات", "بدلة ولادي", "جاكيت شتوي أطفال", "بيجامة أطفال", "طقم رياضي أطفال", "شورت وتيشيرت", "حذاء أطفال", "مريلة مدرسة", "أفرول مولود"]],
  Toys: [60, 3000, "toys", ["مكعبات ليجو", "عربية ريموت كنترول", "عروسة باربي", "لعبة تعليمية خشب", "دراجة أطفال", "بلاي ستيشن للأطفال", "بازل 500 قطعة", "سيارة كهربائية للأطفال", "مطبخ لعب", "ترامبولين صغير"]],
  "Living Room": [3000, 90000, "sofa", ["أنتريه مودرن 7 مقاعد", "ركنة كورنر قماش", "طقم كنب كلاسيك", "ترابيزة سفرة 8 كراسي", "ترابيزة وسط زجاج", "مكتبة تلفزيون", "سجادة تركي 3×4", "كنبة بلدي 3 مقاعد", "نيش خشب", "كرسي استرخاء"]],
  Bedroom: [8000, 150000, "bedroom", ["غرفة نوم كاملة مودرن", "سرير كينج مع مرتبة", "دولاب 6 أبواب", "غرفة أطفال", "سرير دورين", "تسريحة بمرايا", "غرفة نوم خشب زان", "كومودينو", "مرتبة طبية", "سرير حديد"]],
  "Home Appliances": [2000, 40000, "appliance", ["غسالة أوتوماتيك 10 كيلو", "ثلاجة نوفروست 18 قدم", "بوتاجاز 5 شعلة", "تكييف 1.5 حصان", "ميكروويف 30 لتر", "سخان غاز", "مكنسة كهربائية", "ديب فريزر", "خلاط مطبخ", "دفاية زيت"]],
  Cars: [150000, 1500000, "car", ["هيونداي إلنترا 2020", "تويوتا كورولا 2019", "كيا سيراتو 2021", "نيسان صني 2018", "شيفروليه أوبترا 2017", "مرسيدس C180 2016", "بي إم دبليو 320 2017", "ميتسوبيشي لانسر 2015", "سكودا أوكتافيا 2020", "فيات تيبو 2022"]],
  Motorcycles: [15000, 300000, "motorcycle", ["هوندا 150 سي سي", "ياماها R15", "بيجاج بولسر 200", "فيسبا 2020", "سوزوكي جكسر", "ديناميك 125", "TVS أباتشي 160", "سكوتر كهربائي", "كاوازاكي نينجا 400", "هوجن 150"]],
  "Apartments for Sale": [800000, 8000000, "apartment", ["شقة 150 م تشطيب سوبر لوكس", "شقة 120 م قريبة من الخدمات", "شقة 200 م بحديقة", "شقة 90 م استلام فوري", "دوبلكس 220 م", "شقة بإطلالة مفتوحة", "شقة 175 م ناصية", "شقة 110 م تقسيط", "شقة 140 م بالتكييفات", "شقة 100 م الدور الأرضي"]],
  "Villas for Sale": [4000000, 30000000, "villa", ["فيلا مستقلة 400 م", "تاون هاوس 250 م", "فيلا بحمام سباحة", "توين هاوس 300 م", "فيلا ركنية بجاردن", "فيلا في كمبوند مغلق", "فيلا 500 م تشطيب كامل", "فيلا على الجولف", "فيلا استلام فوري", "فيلا 350 م مميزة"]],
  "Land for Sale": [500000, 15000000, "land", ["أرض 500 م سكنية", "أرض 1000 م على طريق رئيسي", "أرض زراعية 2 فدان", "أرض 300 م بالمرافق", "أرض تجارية ناصية", "أرض 750 م قرب الخدمات", "أرض بالتقسيط", "أرض استثمارية 5000 م", "قطعة أرض 400 م", "أرض 600 م مميزة"]],
  "Apartments for Rent": [3000, 40000, "livingroom", ["شقة للإيجار 3 غرف", "شقة مفروشة 2 غرفة", "استوديو مفروش", "شقة 150 م إيجار جديد", "شقة قريبة من المترو", "شقة بإطلالة", "شقة للعائلات", "شقة 100 م بالتكييف", "شقة مفروشة إيجار يومي", "شقة 180 م سوبر لوكس"]],
  "Villas for Rent": [20000, 150000, "house", ["فيلا للإيجار بحمام سباحة", "فيلا مفروشة", "تاون هاوس للإيجار", "فيلا 400 م إيجار سنوي", "فيلا ببلكونات", "فيلا في كمبوند", "فيلا للشركات", "فيلا 300 م بجاردن", "فيلا إيجار صيفي", "توين هاوس للإيجار"]],
  "Commercial for Rent": [5000, 100000, "office", ["محل 40 م على شارع رئيسي", "مكتب إداري 100 م", "محل ناصية", "مكتب مفروش", "دور كامل للإيجار", "محل في مول", "مخزن 200 م", "عيادة جاهزة", "مكتب 60 م بالتكييف", "محل 25 م"]],
  "Design & Development": [300, 15000, "coding", ["تصميم لوجو احترافي", "تطوير موقع ووردبريس", "تصميم تطبيق موبايل", "تصميم هوية بصرية", "برمجة متجر إلكتروني", "مونتاج فيديو", "تصميم سوشيال ميديا", "برمجة بوت واتساب", "تصميم واجهات UI/UX", "سيو وتحسين محركات البحث"]],
  "Home Maintenance": [150, 3000, "repair", ["سباك محترف", "كهربائي منازل", "نقاش وديكور", "صيانة تكييفات", "صيانة غسالات", "نجار", "تركيب سيراميك", "مكافحة حشرات", "تنظيف شقق", "تركيب مطابخ"]],
  Tutoring: [100, 600, "classroom", ["دروس رياضيات ثانوية عامة", "مدرس لغة إنجليزية", "دروس فيزياء", "تأسيس لغة عربية", "دروس كيمياء", "مدرس برمجة للأطفال", "دروس لغة ألمانية", "مدرس أحياء", "تحفيظ قرآن", "دروس IELTS"]],
  Events: [3000, 80000, "party", ["تنظيم حفلات زفاف", "DJ لحفلات", "تصوير مناسبات", "تجهيز حفلات أطفال", "كوشة وتنسيق ورد", "تأجير قاعات", "كيك وحلويات للمناسبات", "تنظيم مؤتمرات", "إضاءة وصوتيات", "ضيافة وبوفيه"]],
  "Mobile Phones": [4000, 45000, "smartphone", ["آيفون 13 برو 256 جيجا", "سامسونج جالكسي S23 الترا", "شاومي ريدمي نوت 12", "أوبو رينو 8", "ريلمي 11 برو", "هواوي نوفا 10", "آيفون 12 مستعمل", "سامسونج A54"]],
  Tablets: [3000, 35000, "tablet", ["آيباد 9 ويفي", "سامسونج تاب S8", "آيباد برو 11 بوصة", "لينوفو تاب M10", "شاومي باد 5", "هواوي ميت باد"]],
  "Phone Accessories": [50, 4000, "earbuds", ["سماعات إيربودز", "شاحن سريع 65 وات", "كفر آيفون أصلي", "باور بانك 20000", "ساعة ذكية", "سماعة بلوتوث JBL"]],
  "Washing Machines": [6000, 30000, "washingmachine", ["غسالة أوتوماتيك 10 كيلو", "غسالة فرنت لود 8 كيلو", "غسالة نصف أوتوماتيك", "غسالة LG ذكية", "غسالة سامسونج 9 كيلو", "غسالة وتنشيف"]],
  Refrigerators: [8000, 45000, "refrigerator", ["ثلاجة نوفروست 18 قدم", "ثلاجة ديب فريزر", "ثلاجة سامسونج 2 باب", "ثلاجة LG انفرتر", "ثلاجة صغيرة للمكتب", "ثلاجة شارب 14 قدم"]],
  "Air Conditioners": [12000, 45000, "airconditioner", ["تكييف 1.5 حصان بارد", "تكييف شارب انفرتر", "تكييف كاريير 3 حصان", "تكييف سبليت 2.25 حصان", "تكييف تورنادو بارد ساخن", "تكييف يونيون إير"]],
  "Kitchen Appliances": [300, 15000, "blender", ["بوتاجاز 5 شعلة", "ميكروويف 30 لتر", "خلاط كهربائي", "غلاية مياه", "مكنسة كهربائية", "كبة وعصارة"]],
  Gaming: [500, 30000, "gaming", ["بلاي ستيشن 5", "إكس بوكس سيريس X", "يد تحكم PS5", "نينتندو سويتش", "كرسي جيمنج", "بلاي ستيشن 4 سلم"]],
  Shoes: [300, 4000, "sneakers", ["نايك إير فورس 1", "أديداس سوبر ستار", "حذاء كلاسيك جلد", "كوتشي رياضي للجري", "صندل جلد", "بوت شتوي"]],
  "Home Decor": [100, 8000, "decor", ["لوحة جدارية", "سجادة 3x4", "ستائر بلاك أوت", "مرآة ديكور", "أباجورة", "فازات ديكور"]],
  "Baby Gear": [300, 12000, "stroller", ["عربية أطفال", "كرسي سيارة للأطفال", "سرير أطفال", "كرسي طعام", "حقيبة مواليد", "مشاية أطفال"]],
};

const KIND_FALLBACK: Record<string, [number, number, string]> = {
  PRODUCT: [200, 20000, "product"],
  REAL_ESTATE: [1000000, 6000000, "building"],
  SERVICE: [200, 5000, "service"],
};

const ADJECTIVES = ["بحالة ممتازة", "نضيف جدًا", "حالة الزيرو", "استخدام خفيف", "السعر نهائي تقريبًا", "للجادين فقط", "عرض لفترة محدودة", "مكفول", "فرصة", "بالضمان"];

const DEMO_SELLERS = [
  { phone: "+201000000101", name: "Nile Market", storeName: "سوق النيل" },
  { phone: "+201000000102", name: "Delta Deals", storeName: "دلتا ديلز" },
  { phone: "+201000000103", name: "Cairo Services", storeName: "خدمات القاهرة" },
];

// ── tiny deterministic random so re-runs look the same ───────────────────
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
const pick = <T,>(r: () => number, arr: T[]): T => arr[Math.floor(r() * arr.length)];
function niceRound(n: number): number {
  const step = n >= 1_000_000 ? 50_000 : n >= 100_000 ? 5_000 : n >= 10_000 ? 500 : n >= 1_000 ? 50 : 10;
  return Math.max(step, Math.round(n / step) * step);
}

// ── pure generation logic (exported so it can be tested without a DB) ────
export interface Cat { id: string; parentId: string | null; nameAr: string; nameEn: string; slug: string; kind: string; isActive: boolean }
export interface Attr { id: string; categoryId: string; inputType: string; isRequired: boolean; labelEn: string; options: { id: string }[] }
export interface Loc { id: string; parentId: string | null; lat: number | null; lng: number | null }

export function leafCategories(all: Cat[]): Cat[] {
  const byId = new Map(all.map((c) => [c.id, c]));
  const hasChild = new Set(all.filter((c) => c.parentId).map((c) => c.parentId as string));
  const reachable = (c: Cat): boolean => {
    for (let cur: Cat | undefined = c; cur; cur = cur.parentId ? byId.get(cur.parentId) : undefined) if (!cur.isActive) return false;
    return true;
  };
  return all.filter((c) => c.isActive && !hasChild.has(c.id) && reachable(c) && c.parentId !== null);
}

export function ancestorIds(all: Cat[], id: string): string[] {
  const byId = new Map(all.map((c) => [c.id, c]));
  const chain: string[] = [];
  for (let cur = byId.get(id); cur; cur = cur.parentId ? byId.get(cur.parentId) : undefined) chain.unshift(cur.id);
  return chain;
}

export interface AdPlan {
  slug: string;
  titleAr: string;
  descriptionAr: string;
  price: number;
  isNegotiable: boolean;
  condition: "NEW" | "LIKE_NEW" | "USED" | null;
  categoryId: string;
  locationId: string;
  sellerIndex: number;
  lat: number | null;
  lng: number | null;
  ageDays: number;
  viewCount: number;
  featured: boolean;
  images: string[];
  attrs: { attributeId: string; optionId?: string; numberValue?: number }[];
}

export function planAds(cat: Cat, catIndex: number, all: Cat[], attrs: Attr[], leafLocs: Loc[], sellerCount: number): AdPlan[] {
  const r = rng(1000 + catIndex * 97);
  const pool = POOLS[cat.nameEn];
  const [minP, maxP, keyword] = pool ?? KIND_FALLBACK[cat.kind] ?? KIND_FALLBACK.PRODUCT;
  const chain = ancestorIds(all, cat.id);
  const effective = attrs.filter((a) => chain.includes(a.categoryId));
  const plans: AdPlan[] = [];

  for (let i = 0; i < ADS_PER_CATEGORY; i++) {
    const base = pool ? pool[3][i % pool[3].length] : `${cat.nameAr} — إعلان ${i + 1}`;
    const adj = ADJECTIVES[(i + catIndex) % ADJECTIVES.length];
    const loc = pick(r, leafLocs);
    const price = niceRound(minP + r() * (maxP - minP));
    const isProduct = cat.kind === "PRODUCT";
    const slug = `demo-${cat.slug}-${i + 1}-${Math.floor(r() * 1e6).toString(36)}`;

    const attrRows: AdPlan["attrs"] = [];
    for (const a of effective) {
      if (!a.isRequired && r() > 0.6) continue;
      if (a.inputType === "SELECT" && a.options.length) attrRows.push({ attributeId: a.id, optionId: pick(r, a.options).id });
      else if (a.inputType === "MULTISELECT" && a.options.length) attrRows.push({ attributeId: a.id, optionId: pick(r, a.options).id });
      else if (a.inputType === "NUMBER") {
        const en = a.labelEn.toLowerCase();
        const v = en.includes("year") ? 2012 + Math.floor(r() * 13) : en.includes("area") ? 60 + Math.floor(r() * 340) : 1 + Math.floor(r() * 10);
        attrRows.push({ attributeId: a.id, numberValue: v });
      }
    }

    plans.push({
      slug,
      titleAr: `${base} — ${adj}`.slice(0, 190),
      descriptionAr:
        `${base} ${adj}. ` +
        (cat.kind === "REAL_ESTATE" ? "الموقع مميز وقريب من الخدمات والمواصلات، والمعاينة في أي وقت بالاتفاق. " : cat.kind === "SERVICE" ? "خبرة سنوات وأعمال سابقة متاحة للمعاينة، والتواصل متاح كل يوم. " : "المنتج متاح للمعاينة والتجربة قبل الشراء. ") +
        "للتواصل واتساب أو اتصال. (إعلان تجريبي من منصة تريد)",
      price,
      isNegotiable: r() > 0.5,
      condition: isProduct ? pick(r, ["NEW", "LIKE_NEW", "USED"] as const) : null,
      categoryId: cat.id,
      locationId: loc.id,
      sellerIndex: Math.floor(r() * sellerCount),
      lat: loc.lat != null ? loc.lat + (r() - 0.5) * 0.02 : null,
      lng: loc.lng != null ? loc.lng + (r() - 0.5) * 0.02 : null,
      ageDays: Math.floor(r() * 20),
      viewCount: Math.floor(r() * 400),
      featured: i === 0, // the first ad in each category is "featured"
      images: [`https://picsum.photos/seed/${keyword}-${catIndex}-${i}/480/360`],
      attrs: attrRows,
    });
  }
  return plans;
}

// ── database part ────────────────────────────────────────────────────────
async function main() {
  const db = new PrismaClient();
  try {
    const cats = (await db.category.findMany({ select: { id: true, parentId: true, nameAr: true, nameEn: true, slug: true, kind: true, isActive: true } })) as Cat[];
    const leaves = leafCategories(cats);
    if (leaves.length === 0) throw new Error("No categories found. Run `npm run db:seed` first (or add categories from the dashboard).");

    const locs = (await db.location.findMany({ where: { isActive: true }, select: { id: true, parentId: true, lat: true, lng: true } })) as Loc[];
    const hasChild = new Set(locs.filter((l) => l.parentId).map((l) => l.parentId as string));
    const leafLocs = locs.filter((l) => !hasChild.has(l.id));
    if (leafLocs.length === 0) throw new Error("No locations found. Run `npm run db:seed` first (or add locations from the dashboard).");

    const attrs = (await db.categoryAttribute.findMany({
      where: { isActive: true },
      select: { id: true, categoryId: true, inputType: true, isRequired: true, labelEn: true, options: { where: { isActive: true }, select: { id: true } } },
    })) as Attr[];

    // Sellers: the seed's "Ahmed Store" (if it exists) + 3 demo sellers.
    const sellers: { id: string }[] = [];
    const existing = await db.user.findUnique({ where: { phone: "+201000000001" }, select: { id: true } });
    if (existing) sellers.push(existing);
    for (const s of DEMO_SELLERS) {
      sellers.push(
        await db.user.upsert({
          where: { phone: s.phone },
          update: {},
          create: { phone: s.phone, whatsapp: s.phone, name: s.name, storeName: s.storeName, role: "SELLER", status: "ACTIVE", locationId: leafLocs[0].id, onboardingCompletedAt: new Date(), isVerified: true },
          select: { id: true },
        })
      );
    }

    // Remove the ads this script made before (re-run safe).
    const removed = await db.product.deleteMany({ where: { slug: { startsWith: "demo-" } } }).catch(() => {
      throw new Error("Could not remove previous demo ads (some are referenced by orders/favorites). Delete them from the dashboard, then re-run.");
    });
    if (removed.count) console.log(`🧹 removed ${removed.count} previous demo ads`);

    let total = 0;
    for (const [idx, cat] of leaves.entries()) {
      const plans = planAds(cat, idx, cats, attrs, leafLocs, sellers.length);
      for (const p of plans) {
        const created = new Date(Date.now() - p.ageDays * 86_400_000);
        await db.product.create({
          data: {
            slug: p.slug,
            titleAr: p.titleAr,
            descriptionAr: p.descriptionAr,
            price: p.price,
            isNegotiable: p.isNegotiable,
            condition: p.condition ?? undefined,
            categoryId: p.categoryId,
            locationId: p.locationId,
            sellerId: sellers[p.sellerIndex].id,
            lat: p.lat,
            lng: p.lng,
            status: "PUBLISHED",
            viewCount: p.viewCount,
            createdAt: created,
            boostedUntil: p.featured ? new Date(Date.now() + 14 * 86_400_000) : null,
            images: { create: p.images.map((url, i) => ({ url, sortOrder: i })) },
            attributeValues: { create: p.attrs.map((a) => ({ attributeId: a.attributeId, optionId: a.optionId, numberValue: a.numberValue })) },
          },
        });
        total++;
      }
      console.log(`✅ ${cat.nameEn}: ${plans.length} ads`);
    }
    console.log(`\n🎉 Done — ${total} ads in ${leaves.length} categories. Open http://localhost:3000/ar`);
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error("❌", e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
