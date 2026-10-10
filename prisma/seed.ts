import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

// ── Locations: real Egyptian governorates + cities, real coordinates ──
// "أوسع الأماكن" — enough breadth that the map/location pickers actually
// feel like a national platform, not a 2-city demo.
const LOCATIONS: { ar: string; en: string; lat: number; lng: number; cities: { ar: string; en: string; lat: number; lng: number }[] }[] = [
  { ar: "القاهرة", en: "Cairo", lat: 30.0444, lng: 31.2357, cities: [
    { ar: "مدينة نصر", en: "Nasr City", lat: 30.0511, lng: 31.3656 },
    { ar: "المعادي", en: "Maadi", lat: 29.9602, lng: 31.2569 },
    { ar: "التجمع الخامس", en: "New Cairo", lat: 30.0287, lng: 31.4914 },
    { ar: "مصر الجديدة", en: "Heliopolis", lat: 30.0875, lng: 31.3244 },
    { ar: "حلوان", en: "Helwan", lat: 29.8419, lng: 31.3344 },
  ]},
  { ar: "الجيزة", en: "Giza", lat: 30.0131, lng: 31.2089, cities: [
    { ar: "الدقي", en: "Dokki", lat: 30.0378, lng: 31.2126 },
    { ar: "6 أكتوبر", en: "6th of October", lat: 29.9660, lng: 30.9232 },
    { ar: "الشيخ زايد", en: "Sheikh Zayed", lat: 30.0778, lng: 30.9736 },
    { ar: "فيصل", en: "Faisal", lat: 29.9765, lng: 31.1998 },
  ]},
  { ar: "الإسكندرية", en: "Alexandria", lat: 31.2001, lng: 29.9187, cities: [
    { ar: "سيدي جابر", en: "Sidi Gaber", lat: 31.2251, lng: 29.9601 },
    { ar: "سموحة", en: "Smouha", lat: 31.2127, lng: 29.9511 },
    { ar: "العجمي", en: "Agami", lat: 31.0890, lng: 29.7739 },
  ]},
  { ar: "القليوبية", en: "Qalyubia", lat: 30.4280, lng: 31.2141, cities: [
    { ar: "بنها", en: "Banha", lat: 30.4598, lng: 31.1845 },
    { ar: "شبرا الخيمة", en: "Shubra El Kheima", lat: 30.1286, lng: 31.2442 },
  ]},
  { ar: "الشرقية", en: "Sharqia", lat: 30.7327, lng: 31.7195, cities: [
    { ar: "الزقازيق", en: "Zagazig", lat: 30.5877, lng: 31.5020 },
    { ar: "العاشر من رمضان", en: "10th of Ramadan", lat: 30.2956, lng: 31.7465 },
  ]},
  { ar: "الدقهلية", en: "Dakahlia", lat: 31.0409, lng: 31.3785, cities: [
    { ar: "المنصورة", en: "Mansoura", lat: 31.0409, lng: 31.3785 },
  ]},
  { ar: "الغربية", en: "Gharbia", lat: 30.8754, lng: 31.0335, cities: [
    { ar: "طنطا", en: "Tanta", lat: 30.7865, lng: 31.0004 },
  ]},
  { ar: "بورسعيد", en: "Port Said", lat: 31.2653, lng: 32.3019, cities: [
    { ar: "حي الشرق", en: "Al Sharq", lat: 31.2653, lng: 32.3019 },
  ]},
  { ar: "الإسماعيلية", en: "Ismailia", lat: 30.5965, lng: 32.2715, cities: [
    { ar: "وسط البلد", en: "Downtown", lat: 30.5965, lng: 32.2715 },
  ]},
  { ar: "أسوان", en: "Aswan", lat: 24.0889, lng: 32.8998, cities: [
    { ar: "وسط المدينة", en: "City Center", lat: 24.0889, lng: 32.8998 },
  ]},
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
}

async function seedLocations() {
  for (const gov of LOCATIONS) {
    const parent = await db.location.create({ data: { nameAr: gov.ar, nameEn: gov.en, slug: slugify(gov.en), lat: gov.lat, lng: gov.lng } });
    await db.location.createMany({
      data: gov.cities.map((c) => ({ nameAr: c.ar, nameEn: c.en, slug: slugify(`${gov.en}-${c.en}`), parentId: parent.id, lat: c.lat, lng: c.lng })),
    });
  }
  console.log(`✅ ${LOCATIONS.length} governorates, ${LOCATIONS.reduce((n, g) => n + g.cities.length, 0)} cities`);
}

type Opt = { ar: string; en: string };
async function addAttribute(categoryId: string, labelAr: string, labelEn: string, inputType: "SELECT" | "MULTISELECT" | "NUMBER", isRequired: boolean, options: Opt[] = [], sortOrder = 10) {
  await db.categoryAttribute.create({
    data: {
      categoryId, labelAr, labelEn, inputType, isRequired, sortOrder,
      options: options.length ? { create: options.map((o, i) => ({ labelAr: o.ar, labelEn: o.en, sortOrder: (i + 1) * 10 })) } : undefined,
    },
  });
}

const CONDITION_OPTIONS: Opt[] = [{ ar: "جديد", en: "New" }, { ar: "شبه جديد", en: "Like new" }, { ar: "مستعمل", en: "Used" }];

type Kind = "PRODUCT" | "REAL_ESTATE" | "SERVICE";
// Tiny helper: create a category (top-level when `parent` is omitted).
async function cat(kind: Kind, ar: string, en: string, parent?: { id: string }, icon?: string) {
  return db.category.create({ data: { kind, nameAr: ar, nameEn: en, slug: slugify(en), parentId: parent?.id, icon } });
}

// Flat, separate top-level categories (no single "Products" root):
//   Phones, Electrical Appliances, Computers, Clothing, Furniture, Kids,
//   Cars, Real Estate, Services — each with its own sub-categories.
async function seedCategories() {
  const SIZES: Opt[] = ["S", "M", "L", "XL", "XXL"].map((x) => ({ ar: x, en: x }));
  const ROOMS: Opt[] = ["1", "2", "3", "4", "5+"].map((x) => ({ ar: x, en: x }));

  // ── Phones & Tablets ─────────────────────────────────────────
  const phones = await cat("PRODUCT", "موبايلات وتابلت", "Phones & Tablets", undefined, "phone");
  await addAttribute(phones.id, "الحالة", "Condition", "SELECT", true, CONDITION_OPTIONS, 1);
  const mobilePhones = await cat("PRODUCT", "موبايلات", "Mobile Phones", phones);
  await addAttribute(mobilePhones.id, "المساحة التخزينية", "Storage", "SELECT", true, ["64", "128", "256", "512"].map((x) => ({ ar: `${x} جيجا`, en: `${x}GB` })), 2);
  await addAttribute(mobilePhones.id, "الماركة", "Brand", "SELECT", false, ["Apple", "Samsung", "Xiaomi", "Oppo", "Realme", "Huawei"].map((x) => ({ ar: x, en: x })), 3);
  await cat("PRODUCT", "تابلت", "Tablets", phones);
  await cat("PRODUCT", "إكسسوارات موبايل", "Phone Accessories", phones);

  // ── Electrical Appliances ────────────────────────────────────
  const appliances = await cat("PRODUCT", "أجهزة كهربائية", "Electrical Appliances", undefined, "plug");
  await addAttribute(appliances.id, "الحالة", "Condition", "SELECT", true, CONDITION_OPTIONS, 1); // inherited by every sub-category
  const tvs = await cat("PRODUCT", "تلفزيونات", "TVs", appliances);
  await addAttribute(tvs.id, "حجم الشاشة", "Screen Size", "SELECT", false, ["32", "43", "50", "55", "65"].map((x) => ({ ar: `${x} بوصة`, en: `${x}in` })), 2);
  await cat("PRODUCT", "غسالات", "Washing Machines", appliances);
  await cat("PRODUCT", "ثلاجات", "Refrigerators", appliances);
  await cat("PRODUCT", "تكييفات", "Air Conditioners", appliances);
  await cat("PRODUCT", "أجهزة مطبخ", "Kitchen Appliances", appliances);

  // ── Computers & Electronics ──────────────────────────────────
  const computers = await cat("PRODUCT", "كمبيوتر وإلكترونيات", "Computers & Electronics", undefined, "laptop");
  await addAttribute(computers.id, "الحالة", "Condition", "SELECT", true, CONDITION_OPTIONS, 1);
  const laptops = await cat("PRODUCT", "لابتوبات", "Laptops", computers);
  await addAttribute(laptops.id, "المعالج", "Processor", "SELECT", false, ["Intel i5", "Intel i7", "Apple M1/M2", "AMD Ryzen"].map((x) => ({ ar: x, en: x })), 2);
  await cat("PRODUCT", "كاميرات", "Cameras", computers);
  await cat("PRODUCT", "ألعاب فيديو", "Gaming", computers);

  // ── Clothing & Fashion ───────────────────────────────────────
  const clothing = await cat("PRODUCT", "ملابس وأزياء", "Clothing & Fashion", undefined, "shirt");
  await addAttribute(clothing.id, "الحالة", "Condition", "SELECT", true, [{ ar: "جديد بالتيكيت", en: "New with tags" }, { ar: "مستعمل بحالة جيدة", en: "Used - good" }], 1);
  const menC = await cat("PRODUCT", "ملابس رجالي", "Men's Clothing", clothing);
  await addAttribute(menC.id, "المقاس", "Size", "SELECT", true, SIZES, 2);
  const womenC = await cat("PRODUCT", "ملابس حريمي", "Women's Clothing", clothing);
  await addAttribute(womenC.id, "المقاس", "Size", "SELECT", true, SIZES, 2);
  await cat("PRODUCT", "ملابس أطفال", "Kids' Clothing", clothing);
  await cat("PRODUCT", "أحذية", "Shoes", clothing);
  await cat("PRODUCT", "شنط وإكسسوارات", "Bags & Accessories", clothing);

  // ── Furniture & Home ─────────────────────────────────────────
  const home = await cat("PRODUCT", "أثاث ومنزل", "Furniture & Home", undefined, "sofa");
  await addAttribute(home.id, "الحالة", "Condition", "SELECT", true, CONDITION_OPTIONS, 1);
  await cat("PRODUCT", "أنتريهات وصالونات", "Living Room", home);
  await cat("PRODUCT", "غرف نوم", "Bedroom", home);
  await cat("PRODUCT", "ديكور", "Home Decor", home);

  // ── Kids & Toys ──────────────────────────────────────────────
  const kids = await cat("PRODUCT", "أطفال وألعاب", "Kids & Toys", undefined, "toy");
  await cat("PRODUCT", "ألعاب", "Toys", kids);
  await cat("PRODUCT", "مستلزمات أطفال", "Baby Gear", kids);

  // ── Cars & Vehicles ──────────────────────────────────────────
  const vehicles = await cat("PRODUCT", "سيارات ومركبات", "Cars & Vehicles", undefined, "car");
  const cars = await cat("PRODUCT", "سيارات", "Cars", vehicles);
  await addAttribute(cars.id, "سنة الصنع", "Model Year", "NUMBER", true, [], 1);
  await addAttribute(cars.id, "ناقل الحركة", "Transmission", "SELECT", true, [{ ar: "أوتوماتيك", en: "Automatic" }, { ar: "مانيوال", en: "Manual" }], 2);
  await cat("PRODUCT", "موتوسيكلات", "Motorcycles", vehicles);

  // ── Real Estate > For Sale / For Rent ────────────────────────
  const realEstate = await cat("REAL_ESTATE", "عقارات", "Real Estate", undefined, "home");
  const forSale = await cat("REAL_ESTATE", "للبيع", "For Sale", realEstate);
  const saleApartments = await cat("REAL_ESTATE", "شقق للبيع", "Apartments for Sale", forSale);
  await addAttribute(saleApartments.id, "عدد الغرف", "Bedrooms", "SELECT", true, ROOMS, 1);
  await addAttribute(saleApartments.id, "المساحة (م²)", "Area (sqm)", "NUMBER", true, [], 2);
  const saleVillas = await cat("REAL_ESTATE", "فيلات للبيع", "Villas for Sale", forSale);
  await addAttribute(saleVillas.id, "المساحة (م²)", "Area (sqm)", "NUMBER", true, [], 1);
  await cat("REAL_ESTATE", "أراضي للبيع", "Land for Sale", forSale);

  const forRent = await cat("REAL_ESTATE", "للإيجار", "For Rent", realEstate);
  const rentApartments = await cat("REAL_ESTATE", "شقق للإيجار", "Apartments for Rent", forRent);
  await addAttribute(rentApartments.id, "عدد الغرف", "Bedrooms", "SELECT", true, ROOMS, 1);
  await addAttribute(rentApartments.id, "مفروشة؟", "Furnished", "SELECT", false, [{ ar: "مفروشة", en: "Furnished" }, { ar: "غير مفروشة", en: "Unfurnished" }], 2);
  await cat("REAL_ESTATE", "فيلات للإيجار", "Villas for Rent", forRent);
  await cat("REAL_ESTATE", "محلات ومكاتب للإيجار", "Commercial for Rent", forRent);

  // ── Services ─────────────────────────────────────────────────
  const services = await cat("SERVICE", "خدمات", "Services", undefined, "wrench");
  await cat("SERVICE", "تصميم وبرمجة", "Design & Development", services);
  await cat("SERVICE", "صيانة منزلية", "Home Maintenance", services);
  await cat("SERVICE", "دروس خصوصية", "Tutoring", services);
  await cat("SERVICE", "تنظيم مناسبات", "Events", services);

  console.log("✅ Categories: 9 separate top-level groups (Phones, Electrical Appliances, Computers, Clothing, Furniture, Kids, Cars, Real Estate, Services)");
}

async function main() {
  await seedLocations();
  const cairo = await db.location.findFirstOrThrow({ where: { nameEn: "Cairo", parentId: null } });
  await seedCategories();

  // ── A verified seller with one review, so isVerified/ratingAvg
  // actually render something in the UI instead of always being empty ──
  const seller = await db.user.create({
    data: {
      name: "Ahmed Store", phone: "+201000000001", whatsapp: "+201000000001",
      storeName: "Ahmed Store", isVerified: true, status: "ACTIVE", role: "SELLER", locationId: cairo.id,
      onboardingCompletedAt: new Date(),
    },
  });
  const buyer = await db.user.create({
    data: { name: "Sara", phone: "+201000000002", whatsapp: "+201000000002", status: "ACTIVE", role: "BUYER", locationId: cairo.id, onboardingCompletedAt: new Date(), birthDate: new Date("1996-04-12"), gender: "FEMALE", marketingConsent: true, marketingConsentAt: new Date() },
  });
  const rootCats = await db.category.findMany({ where: { parentId: null }, select: { id: true } });
  await db.userInterestCategory.createMany({
    data: rootCats.flatMap((c) => [
      { userId: seller.id, categoryId: c.id },
      { userId: buyer.id, categoryId: c.id },
    ]),
  });
  await db.review.create({ data: { sellerId: seller.id, authorId: buyer.id, rating: 5, comment: "تعامل محترم والمنتج زي الوصف بالظبط" } });
  await db.user.update({ where: { id: seller.id }, data: { ratingAvg: 5, ratingCount: 1 } });

  // Admin account — log in with this phone via the normal OTP flow (code
  // prints to the server console in dev, see src/lib/sms.ts) to reach /admin.
  await db.user.create({ data: { name: "Tureed Admin", phone: "+201000000000", status: "ACTIVE", role: "ADMIN" } });

  console.log("✅ Seed complete");
}

// Re-creates ONLY the category tree on an existing database (use this to
// move a live site to the new structure):  npm run db:reset-categories
// Safe by default: refuses to run if any NON-demo listing exists (demo ads
// have slugs starting with "demo-"; they are deleted and re-created by
// seed-ads.ts afterwards). Users' interested-categories are re-assigned.
async function resetCategories() {
  const real = await db.product.count({ where: { NOT: { slug: { startsWith: "demo-" } } } });
  if (real > 0 && process.env.FORCE !== "1") {
    throw new Error(`${real} real listing(s) use the old categories. Move them first, or run with FORCE=1 to delete ALL listings.`);
  }
  await db.product.deleteMany({});
  await db.userInterestCategory.deleteMany({});
  await db.user.updateMany({ where: { categoryId: { not: null } }, data: { categoryId: null } });
  await db.attributeOption.deleteMany({});
  await db.productAttributeValue.deleteMany({});
  await db.categoryAttribute.deleteMany({});
  // children before parents (self-reference has no cascade)
  for (let i = 0; i < 10; i++) {
    const leaves = await db.category.findMany({ where: { children: { none: {} } }, select: { id: true } });
    if (!leaves.length) break;
    await db.category.deleteMany({ where: { id: { in: leaves.map((l) => l.id) } } });
  }
  await seedCategories();
  const roots = await db.category.findMany({ where: { parentId: null }, select: { id: true } });
  const users = await db.user.findMany({ where: { role: { not: "ADMIN" }, onboardingCompletedAt: { not: null } }, select: { id: true } });
  await db.userInterestCategory.createMany({ data: users.flatMap((u) => roots.map((c) => ({ userId: u.id, categoryId: c.id }))), skipDuplicates: true });
  console.log("✅ Categories reset. Now run: npx tsx prisma/seed-ads.ts");
}

(process.env.SEED_MODE === "categories" ? resetCategories() : main())
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
