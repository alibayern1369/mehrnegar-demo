// Seed data — used by /api/setup only
export const SEED_PRODUCTS = [
  { name: "هودی اوورسایز کرم",           sku: "CF-HOD-CRM-L",  barcode: "6260200100011", category: "هودی و سوئیشرت", brand: "کامفی فیتس", supplier: "کامفی فیتس", color: "کرم",        size: "L",       sellingPrice: 890000,  tax: 9 },
  { name: "شلوار جین مام فیت آبی",        sku: "CF-JNS-BLU-M",  barcode: "6260200100022", category: "شلوار",           brand: "کامفی فیتس", supplier: "کامفی فیتس", color: "آبی",        size: "M",       sellingPrice: 750000,  tax: 9 },
  { name: "تی‌شرت یقه گرد مشکی",         sku: "CF-TSH-BLK-S",  barcode: "6260200100033", category: "تی‌شرت",          brand: "کامفی فیتس", supplier: "کامفی فیتس", color: "مشکی",       size: "S",       sellingPrice: 390000,  tax: 9 },
  { name: "پیراهن کتان آستین کوتاه سفید", sku: "CF-SHT-WHT-XL", barcode: "6260200100044", category: "پیراهن",          brand: "کامفی فیتس", supplier: "کامفی فیتس", color: "سفید",       size: "XL",      sellingPrice: 620000,  tax: 9 },
  { name: "ست ورزشی بنفش",               sku: "CF-SPT-PRP-M",  barcode: "6260200100055", category: "لباس ورزشی",      brand: "کامفی فیتس", supplier: "کامفی فیتس", color: "بنفش",       size: "M",       sellingPrice: 980000,  tax: 9 },
  { name: "کت تک اسپرت خاکستری",         sku: "CF-BLZ-GRY-L",  barcode: "6260200100066", category: "کت و بلیزر",      brand: "کامفی فیتس", supplier: "کامفی فیتس", color: "خاکستری",    size: "L",       sellingPrice: 1690000, tax: 9 },
  { name: "مانتو کرپ مشکی",              sku: "CF-MNT-BLK-M",  barcode: "6260200100077", category: "مانتو",           brand: "کامفی فیتس", supplier: "کامفی فیتس", color: "مشکی",       size: "M",       sellingPrice: 1290000, tax: 9 },
  { name: "شورت جین آبی روشن",           sku: "CF-SHR-LBL-S",  barcode: "6260200100088", category: "شلوار",           brand: "کامفی فیتس", supplier: "کامفی فیتس", color: "آبی روشن",   size: "S",       sellingPrice: 450000,  tax: 9 },
];

// Seed quantities — all stock is placed in Central warehouse on fresh seed
export const SEED_STOCK: number[][] = [
  [42, 18, 10, 15],
  [30, 12, 8,  12],
  [65, 30, 14, 20],
  [0,  0,  0,  0 ],
  [8,  3,  2,  4 ],
  [22, 10, 5,  7 ],
  [18, 9,  6,  8 ],
  [5,  2,  1,  3 ],
];
