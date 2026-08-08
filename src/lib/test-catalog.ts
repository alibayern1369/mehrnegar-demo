/**
 * In-app test catalog — 10 clothing products with multi color/size + free-size.
 * Used by /api/seed to populate realistic warehouse/sales/return scenarios.
 */

export type TestVariation = {
  color: string;
  size: string;
  price: number;
  /** Initial receipt qty into Central Warehouse */
  quantity: number;
};

export type TestProduct = {
  name: string;
  sku: string;
  category: string;
  brand: string;
  variations: TestVariation[];
};

export const TEST_SKU_PREFIX = "TST-";

export const TEST_PRODUCTS: TestProduct[] = [
  {
    name: "تی‌شرت راهین",
    sku: "TST-RAHIN-TEE",
    category: "تی‌شرت",
    brand: "کامفی فیتس",
    variations: [
      { color: "مشکی", size: "S", price: 490000, quantity: 18 },
      { color: "مشکی", size: "M", price: 490000, quantity: 22 },
      { color: "مشکی", size: "L", price: 510000, quantity: 20 },
      { color: "مشکی", size: "XL", price: 520000, quantity: 14 },
      { color: "سفید", size: "S", price: 490000, quantity: 16 },
      { color: "سفید", size: "M", price: 490000, quantity: 20 },
      { color: "سفید", size: "L", price: 510000, quantity: 18 },
      { color: "سرمه‌ای", size: "M", price: 500000, quantity: 15 },
      { color: "سرمه‌ای", size: "L", price: 520000, quantity: 12 },
    ],
  },
  {
    name: "هودی اورسایز نورا",
    sku: "TST-NORA-HOOD",
    category: "هودی و سوئیشرت",
    brand: "کامفی فیتس",
    variations: [
      { color: "کرم", size: "M", price: 890000, quantity: 14 },
      { color: "کرم", size: "L", price: 920000, quantity: 16 },
      { color: "کرم", size: "XL", price: 940000, quantity: 10 },
      { color: "مشکی", size: "M", price: 890000, quantity: 12 },
      { color: "مشکی", size: "L", price: 920000, quantity: 14 },
      { color: "خاکستری", size: "L", price: 900000, quantity: 12 },
      { color: "خاکستری", size: "XL", price: 930000, quantity: 10 },
    ],
  },
  {
    name: "شلوار جین مام‌فیت",
    sku: "TST-MOM-JEAN",
    category: "شلوار",
    brand: "کامفی فیتس",
    variations: [
      { color: "آبی", size: "28", price: 780000, quantity: 10 },
      { color: "آبی", size: "30", price: 780000, quantity: 14 },
      { color: "آبی", size: "32", price: 790000, quantity: 12 },
      { color: "آبی", size: "34", price: 790000, quantity: 8 },
      { color: "مشکی", size: "30", price: 800000, quantity: 12 },
      { color: "مشکی", size: "32", price: 800000, quantity: 10 },
      { color: "مشکی", size: "34", price: 810000, quantity: 8 },
    ],
  },
  {
    name: "پیراهن کتان تابستانی",
    sku: "TST-LINEN-SHIRT",
    category: "پیراهن",
    brand: "کامفی فیتس",
    variations: [
      { color: "سفید", size: "S", price: 620000, quantity: 10 },
      { color: "سفید", size: "M", price: 620000, quantity: 14 },
      { color: "سفید", size: "L", price: 640000, quantity: 12 },
      { color: "آبی روشن", size: "M", price: 630000, quantity: 12 },
      { color: "آبی روشن", size: "L", price: 650000, quantity: 10 },
      { color: "آبی روشن", size: "XL", price: 660000, quantity: 8 },
    ],
  },
  {
    name: "ست ورزشی اکتیو",
    sku: "TST-ACTIVE-SET",
    category: "لباس ورزشی",
    brand: "کامفی فیتس",
    variations: [
      { color: "مشکی", size: "M", price: 980000, quantity: 14 },
      { color: "مشکی", size: "L", price: 990000, quantity: 12 },
      { color: "قرمز", size: "M", price: 980000, quantity: 10 },
      { color: "قرمز", size: "L", price: 990000, quantity: 10 },
      { color: "بنفش", size: "L", price: 1000000, quantity: 8 },
      { color: "بنفش", size: "XL", price: 1020000, quantity: 8 },
    ],
  },
  {
    name: "مانتو کرپ الین",
    sku: "TST-ELIN-MANTO",
    category: "مانتو",
    brand: "کامفی فیتس",
    variations: [
      { color: "مشکی", size: "M", price: 1290000, quantity: 10 },
      { color: "مشکی", size: "L", price: 1320000, quantity: 12 },
      { color: "مشکی", size: "XL", price: 1350000, quantity: 8 },
      { color: "نسکافه‌ای", size: "M", price: 1290000, quantity: 8 },
      { color: "نسکافه‌ای", size: "L", price: 1320000, quantity: 10 },
      { color: "نسکافه‌ای", size: "XL", price: 1350000, quantity: 8 },
    ],
  },
  {
    name: "کت بلیزر کلاسیک",
    sku: "TST-CLASSIC-BLAZER",
    category: "کت و بلیزر",
    brand: "کامفی فیتس",
    variations: [
      { color: "خاکستری", size: "L", price: 1690000, quantity: 10 },
      { color: "خاکستری", size: "XL", price: 1720000, quantity: 8 },
      { color: "سرمه‌ای", size: "L", price: 1690000, quantity: 10 },
      { color: "سرمه‌ای", size: "XL", price: 1720000, quantity: 8 },
      { color: "مشکی", size: "L", price: 1750000, quantity: 8 },
      { color: "مشکی", size: "XL", price: 1780000, quantity: 6 },
    ],
  },
  {
    name: "شال کشمیر سبک",
    sku: "TST-CASHMERE-SHAWL",
    category: "اکسسوری",
    brand: "کامفی فیتس",
    variations: [
      { color: "مشکی", size: "فری سایز", price: 320000, quantity: 28 },
      { color: "کرم", size: "فری سایز", price: 320000, quantity: 24 },
      { color: "بژ", size: "فری سایز", price: 330000, quantity: 22 },
    ],
  },
  {
    name: "کلاه بیسبال شهری",
    sku: "TST-CITY-CAP",
    category: "اکسسوری",
    brand: "کامفی فیتس",
    variations: [
      { color: "مشکی", size: "فری سایز", price: 280000, quantity: 30 },
      { color: "سفید", size: "فری سایز", price: 280000, quantity: 26 },
      { color: "زیتونی", size: "فری سایز", price: 290000, quantity: 20 },
    ],
  },
  {
    name: "جوراب نخی سه‌تایی",
    sku: "TST-COTTON-SOCKS",
    category: "اکسسوری",
    brand: "کامفی فیتس",
    variations: [
      { color: "سفید", size: "فری سایز", price: 120000, quantity: 40 },
      { color: "مشکی", size: "فری سایز", price: 120000, quantity: 40 },
      { color: "طوسی", size: "فری سایز", price: 125000, quantity: 35 },
    ],
  },
];

export function countTestCatalogUnits() {
  return TEST_PRODUCTS.reduce(
    (sum, p) => sum + p.variations.reduce((s, v) => s + v.quantity, 0),
    0,
  );
}

export function countTestVariations() {
  return TEST_PRODUCTS.reduce((sum, p) => sum + p.variations.length, 0);
}
