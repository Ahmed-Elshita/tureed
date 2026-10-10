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

async function seedCategories() {
  // ── Products > Mobiles & Tablets ──────────────────────────────
  const products = await db.category.create({ data: { kind: "PRODUCT", nameAr: "منتجات", nameEn: "Products", slug: slugify("products"), icon: "shop" } });
  const mobiles = await db.category.create({ data: { kind: "PRODUCT", nameAr: "موبايلات وتابلت", nameEn: "Mobiles & Tablets", slug: slugify("mobiles-tablets"), parentId: products.id } });
  await addAttribute(mobiles.id, "المساحة التخزينية", "Storage", "SELECT", true, [{ ar: "64 جيجا", en: "64GB" }, { ar: "128 جيجا", en: "128GB" }, { ar: "256 جيجا", en: "256GB" }, { ar: "512 جيجا", en: "512GB" }], 1);
  await addAttribute(mobiles.id, "الحالة", "Condition", "SELECT", true, CONDITION_OPTIONS, 2);

  // ── Products > Electronics (Laptops, TVs, Cameras) ────────────
  const electronics = await db.category.create({ data: { kind: "PRODUCT", nameAr: "إلكترونيات", nameEn: "Electronics", slug: slugify("electronics"), parentId: products.id } });
  await addAttribute(electronics.id, "الحالة", "Condition", "SELECT", true, CONDITION_OPTIONS, 1); // inherited by every sub-category below
  const laptops = await db.category.create({ data: { kind: "PRODUCT", nameAr: "لابتوبات", nameEn: "Laptops", slug: slugify("laptops"), parentId: electronics.id } });
  await addAttribute(laptops.id, "المعالج", "Processor", "SELECT", false, [{ ar: "Intel i5", en: "Intel i5" }, { ar: "Intel i7", en: "Intel i7" }, { ar: "Apple M-Series", en: "Apple M-Series" }, { ar: "AMD Ryzen", en: "AMD Ryzen" }]);
  const tvs = await db.category.create({ data: { kind: "PRODUCT", nameAr: "شاشات تلفزيون", nameEn: "TVs", slug: slugify("tvs"), parentId: electronics.id } });
  await addAttribute(tvs.id, "حجم الشاشة", "Screen Size", "SELECT", false, [{ ar: "32 بوصة", en: "32in" }, { ar: "43 بوصة", en: "43in" }, { ar: "55 بوصة", en: "55in" }, { ar: "65 بوصة فأكثر", en: "65in+" }]);
  await db.category.create({ data: { kind: "PRODUCT", nameAr: "كاميرات", nameEn: "Cameras", slug: slugify("cameras"), parentId: electronics.id } });

  // ── Products > Fashion > Men/Women/Kids (exactly the example given) ──
  const fashion = await db.category.create({ data: { kind: "PRODUCT", nameAr: "أزياء", nameEn: "Fashion", slug: slugify("fashion"), parentId: products.id } });
  await addAttribute(fashion.id, "الحالة", "Condition", "SELECT", true, [{ ar: "جديد بالتيكيت", en: "New with tags" }, { ar: "مستعمل بحالة ممتازة", en: "Used - excellent" }, { ar: "مستعمل", en: "Used" }], 1);

  const men = await db.category.create({ data: { kind: "PRODUCT", nameAr: "رجالي", nameEn: "Men", slug: slugify("men-fashion"), parentId: fashion.id } });
  const menClothing = await db.category.create({ data: { kind: "PRODUCT", nameAr: "ملابس رجالي", nameEn: "Men's Clothing", slug: slugify("men-clothing"), parentId: men.id } });
  await addAttribute(menClothing.id, "المقاس", "Size", "SELECT", true, [{ ar: "S", en: "S" }, { ar: "M", en: "M" }, { ar: "L", en: "L" }, { ar: "XL", en: "XL" }, { ar: "XXL", en: "XXL" }]);
  await db.category.create({ data: { kind: "PRODUCT", nameAr: "أحذية رجالي", nameEn: "Men's Shoes", slug: slugify("men-shoes"), parentId: men.id } });

  const women = await db.category.create({ data: { kind: "PRODUCT", nameAr: "حريمي", nameEn: "Women", slug: slugify("women-fashion"), parentId: fashion.id } });
  const womenClothing = await db.category.create({ data: { kind: "PRODUCT", nameAr: "ملابس حريمي", nameEn: "Women's Clothing", slug: slugify("women-clothing"), parentId: women.id } });
  await addAttribute(womenClothing.id, "المقاس", "Size", "SELECT", true, [{ ar: "S", en: "S" }, { ar: "M", en: "M" }, { ar: "L", en: "L" }, { ar: "XL", en: "XL" }]);
  await db.category.create({ data: { kind: "PRODUCT", nameAr: "شنط وإكسسوارات", nameEn: "Bags & Accessories", slug: slugify("women-bags"), parentId: women.id } });

  const kids = await db.category.create({ data: { kind: "PRODUCT", nameAr: "أطفالي", nameEn: "Kids", slug: slugify("kids-fashion"), parentId: fashion.id } });
  await db.category.create({ data: { kind: "PRODUCT", nameAr: "ملابس أطفال", nameEn: "Kids' Clothing", slug: slugify("kids-clothing"), parentId: kids.id } });
  await db.category.create({ data: { kind: "PRODUCT", nameAr: "ألعاب", nameEn: "Toys", slug: slugify("toys"), parentId: kids.id } });

  // ── Products > Home & Furniture ────────────────────────────────
  const home = await db.category.create({ data: { kind: "PRODUCT", nameAr: "أثاث ومنزل", nameEn: "Home & Furniture", slug: slugify("home-furniture"), parentId: products.id } });
  await db.category.create({ data: { kind: "PRODUCT", nameAr: "أنتريهات وصالونات", nameEn: "Living Room", slug: slugify("living-room"), parentId: home.id } });
  await db.category.create({ data: { kind: "PRODUCT", nameAr: "غرف نوم", nameEn: "Bedroom", slug: slugify("bedroom"), parentId: home.id } });
  await db.category.create({ data: { kind: "PRODUCT", nameAr: "أجهزة منزلية", nameEn: "Home Appliances", slug: slugify("appliances"), parentId: home.id } });

  // ── Products > Vehicles ─────────────────────────────────────────
  const vehicles = await db.category.create({ data: { kind: "PRODUCT", nameAr: "عربيات", nameEn: "Vehicles", slug: slugify("vehicles"), parentId: products.id } });
  const cars = await db.category.create({ data: { kind: "PRODUCT", nameAr: "سيارات", nameEn: "Cars", slug: slugify("cars"), parentId: vehicles.id } });
  await addAttribute(cars.id, "سنة الصنع", "Model Year", "NUMBER", true);
  await addAttribute(cars.id, "ناقل الحركة", "Transmission", "SELECT", true, [{ ar: "أوتوماتيك", en: "Automatic" }, { ar: "مانيوال", en: "Manual" }]);
  await db.category.create({ data: { kind: "PRODUCT", nameAr: "موتوسيكلات", nameEn: "Motorcycles", slug: slugify("motorcycles"), parentId: vehicles.id } });

  // ── Real Estate > For Sale / For Rent > Apartments / Villas ──────
  // (exactly the example given: بيع/إيجار ثم شقق/فيلات)
  const realEstate = await db.category.create({ data: { kind: "REAL_ESTATE", nameAr: "عقارات", nameEn: "Real Estate", slug: slugify("real-estate"), icon: "home" } });

  const forSale = await db.category.create({ data: { kind: "REAL_ESTATE", nameAr: "للبيع", nameEn: "For Sale", slug: slugify("for-sale"), parentId: realEstate.id } });
  const saleApartments = await db.category.create({ data: { kind: "REAL_ESTATE", nameAr: "شقق للبيع", nameEn: "Apartments for Sale", slug: slugify("apartments-sale"), parentId: forSale.id } });
  await addAttribute(saleApartments.id, "عدد الغرف", "Bedrooms", "SELECT", true, [{ ar: "1", en: "1" }, { ar: "2", en: "2" }, { ar: "3", en: "3" }, { ar: "4+", en: "4+" }]);
  await addAttribute(saleApartments.id, "المساحة (م²)", "Area (sqm)", "NUMBER", true, [], 2);
  const saleVillas = await db.category.create({ data: { kind: "REAL_ESTATE", nameAr: "فيلات للبيع", nameEn: "Villas for Sale", slug: slugify("villas-sale"), parentId: forSale.id } });
  await addAttribute(saleVillas.id, "المساحة (م²)", "Area (sqm)", "NUMBER", true);
  await db.category.create({ data: { kind: "REAL_ESTATE", nameAr: "أراضي للبيع", nameEn: "Land for Sale", slug: slugify("land-sale"), parentId: forSale.id } });

  const forRent = await db.category.create({ data: { kind: "REAL_ESTATE", nameAr: "للإيجار", nameEn: "For Rent", slug: slugify("for-rent"), parentId: realEstate.id } });
  const rentApartments = await db.category.create({ data: { kind: "REAL_ESTATE", nameAr: "شقق للإيجار", nameEn: "Apartments for Rent", slug: slugify("apartments-rent"), parentId: forRent.id } });
  await addAttribute(rentApartments.id, "عدد الغرف", "Bedrooms", "SELECT", true, [{ ar: "1", en: "1" }, { ar: "2", en: "2" }, { ar: "3", en: "3" }, { ar: "4+", en: "4+" }]);
  await addAttribute(rentApartments.id, "مفروشة؟", "Furnished", "SELECT", false, [{ ar: "مفروشة", en: "Furnished" }, { ar: "غير مفروشة", en: "Unfurnished" }], 2);
  await db.category.create({ data: { kind: "REAL_ESTATE", nameAr: "فيلات للإيجار", nameEn: "Villas for Rent", slug: slugify("villas-rent"), parentId: forRent.id } });
  await db.category.create({ data: { kind: "REAL_ESTATE", nameAr: "محلات ومكاتب للإيجار", nameEn: "Commercial for Rent", slug: slugify("commercial-rent"), parentId: forRent.id } });

  // ── Services ─────────────────────────────────────────────────────
  const services = await db.category.create({ data: { kind: "SERVICE", nameAr: "خدمات", nameEn: "Services", slug: slugify("services"), icon: "wrench" } });
  await db.category.create({ data: { kind: "SERVICE", nameAr: "تصميم وبرمجة", nameEn: "Design & Development", slug: slugify("design-dev"), parentId: services.id } });
  await db.category.create({ data: { kind: "SERVICE", nameAr: "صيانة منزلية", nameEn: "Home Maintenance", slug: slugify("maintenance"), parentId: services.id } });
  await db.category.create({ data: { kind: "SERVICE", nameAr: "دروس خصوصية", nameEn: "Tutoring", slug: slugify("tutoring"), parentId: services.id } });
  await db.category.create({ data: { kind: "SERVICE", nameAr: "تنظيم مناسبات", nameEn: "Events", slug: slugify("events"), parentId: services.id } });

  console.log("✅ Category tree: Products(Mobiles, Electronics>Laptops/TVs/Cameras, Fashion>Men/Women/Kids, Home, Vehicles>Cars/Motorcycles), Real Estate(For Sale/For Rent>Apartments/Villas/Land), Services(4 sub-categories)");
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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
