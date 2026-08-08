export type Warehouse = { id: string; name: string; manager: string; address: string };

export const warehouses: Warehouse[] = [
  { id: "main", name: "انبار مرکزی", manager: "بردیا سیادتی", address: "تهران، ولنجک، خیابان شهید لواسانی" },
  { id: "branch1", name: "انبار شعبه شمال", manager: "سید سلطان سیادتی", address: "تهران، شمیران، خیابان پارک‌وی" },
  { id: "branch2", name: "انبار شعبه مرکز", manager: "ابراهیم سیادتی", address: "تهران، ونک، میدان ونک" },
];

export type SampleProduct = {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  supplier: string;
  color: string;
  size: string;
  purchasePrice: number;
  sellingPrice: number;
  tax: number;
  warehouseStock: Record<string, number>;
  webStock: number;
  digikalaStock: number;
  status: "active" | "low" | "out";
  emoji: string;
  lastSale: string;
  lastPurchase: string;
  sold30: number;
};

export const products: SampleProduct[] = [
  {
    id: 1, name: "هودی اوورسایز کرم", sku: "CF-HOD-CRM-L", barcode: "6260200100011",
    category: "هودی و سوئیشرت", brand: "کامفی فیتس", supplier: "کامفی فیتس", color: "کرم", size: "L",
    purchasePrice: 480000, sellingPrice: 890000, tax: 9,
    warehouseStock: { main: 42, branch1: 18, branch2: 24 }, webStock: 15, digikalaStock: 10,
    status: "active", emoji: "🧥", lastSale: "۱۴۰۳/۱۲/۰۶", lastPurchase: "۱۴۰۳/۱۱/۲۰", sold30: 97,
  },
  {
    id: 2, name: "شلوار جین مام فیت آبی", sku: "CF-JNS-BLU-M", barcode: "6260200100022",
    category: "شلوار", brand: "کامفی فیتس", supplier: "کامفی فیتس", color: "آبی", size: "M",
    purchasePrice: 390000, sellingPrice: 750000, tax: 9,
    warehouseStock: { main: 30, branch1: 12, branch2: 16 }, webStock: 12, digikalaStock: 8,
    status: "active", emoji: "👖", lastSale: "۱۴۰۳/۱۲/۰۶", lastPurchase: "۱۴۰۳/۱۱/۲۸", sold30: 83,
  },
  {
    id: 3, name: "تی‌شرت یقه گرد مشکی", sku: "CF-TSH-BLK-S", barcode: "6260200100033",
    category: "تی‌شرت", brand: "کامفی فیتس", supplier: "کامفی فیتس", color: "مشکی", size: "S",
    purchasePrice: 180000, sellingPrice: 390000, tax: 9,
    warehouseStock: { main: 65, branch1: 30, branch2: 28 }, webStock: 20, digikalaStock: 14,
    status: "active", emoji: "👕", lastSale: "۱۴۰۳/۱۲/۰۶", lastPurchase: "۱۴۰۳/۱۱/۱۵", sold30: 142,
  },
  {
    id: 4, name: "پیراهن کتان آستین کوتاه سفید", sku: "CF-SHT-WHT-XL", barcode: "6260200100044",
    category: "پیراهن", brand: "کامفی فیتس", supplier: "کامفی فیتس", color: "سفید", size: "XL",
    purchasePrice: 310000, sellingPrice: 620000, tax: 9,
    warehouseStock: { main: 0, branch1: 0, branch2: 0 }, webStock: 0, digikalaStock: 0,
    status: "out", emoji: "👔", lastSale: "۱۴۰۳/۱۱/۳۰", lastPurchase: "۱۴۰۳/۱۰/۱۰", sold30: 21,
  },
  {
    id: 5, name: "ست ورزشی بنفش", sku: "CF-SPT-PRP-M", barcode: "6260200100055",
    category: "لباس ورزشی", brand: "کامفی فیتس", supplier: "کامفی فیتس", color: "بنفش", size: "M",
    purchasePrice: 520000, sellingPrice: 980000, tax: 9,
    warehouseStock: { main: 8, branch1: 3, branch2: 2 }, webStock: 4, digikalaStock: 2,
    status: "low", emoji: "🩱", lastSale: "۱۴۰۳/۱۲/۰۵", lastPurchase: "۱۴۰۳/۱۱/۲۵", sold30: 58,
  },
  {
    id: 6, name: "کت تک اسپرت خاکستری", sku: "CF-BLZ-GRY-L", barcode: "6260200100066",
    category: "کت و بلیزر", brand: "کامفی فیتس", supplier: "کامفی فیتس", color: "خاکستری", size: "L",
    purchasePrice: 890000, sellingPrice: 1690000, tax: 9,
    warehouseStock: { main: 22, branch1: 10, branch2: 8 }, webStock: 7, digikalaStock: 5,
    status: "active", emoji: "🧣", lastSale: "۱۴۰۳/۱۲/۰۵", lastPurchase: "۱۴۰۳/۱۱/۱۸", sold30: 34,
  },
  {
    id: 7, name: "مانتو کرپ مشکی", sku: "CF-MNT-BLK-M", barcode: "6260200100077",
    category: "مانتو", brand: "کامفی فیتس", supplier: "کامفی فیتس", color: "مشکی", size: "M",
    purchasePrice: 670000, sellingPrice: 1290000, tax: 9,
    warehouseStock: { main: 18, branch1: 9, branch2: 11 }, webStock: 8, digikalaStock: 6,
    status: "active", emoji: "🥻", lastSale: "۱۴۰۳/۱۲/۰۴", lastPurchase: "۱۴۰۳/۱۱/۲۲", sold30: 47,
  },
  {
    id: 8, name: "شورت جین آبی روشن", sku: "CF-SHR-LBL-S", barcode: "6260200100088",
    category: "شلوار", brand: "کامفی فیتس", supplier: "کامفی فیتس", color: "آبی روشن", size: "S",
    purchasePrice: 220000, sellingPrice: 450000, tax: 9,
    warehouseStock: { main: 5, branch1: 2, branch2: 1 }, webStock: 3, digikalaStock: 1,
    status: "low", emoji: "🩲", lastSale: "۱۴۰۳/۱۱/۲۸", lastPurchase: "۱۴۰۳/۱۰/۳۰", sold30: 29,
  },
];

export type Role = {
  id: string; name: string; users: number; color: string;
  permissions: string[];
};

export const permissionList = [
  "مشاهده محصولات", "ویرایش محصولات", "حذف محصولات", "مشاهده گزارش‌ها",
  "مدیریت کاربران", "مدیریت انبارها", "دسترسی حسابداری", "دسترسی قیمت‌گذاری",
  "همگام‌سازی وب‌سایت", "همگام‌سازی دیجی‌کالا", "تنظیمات",
];

export const roles: Role[] = [
  { id: "admin", name: "مدیر کل", users: 1, color: "violet", permissions: permissionList },
  { id: "manager", name: "مدیر فروش", users: 2, color: "sky", permissions: ["مشاهده محصولات", "ویرایش محصولات", "مشاهده گزارش‌ها", "مدیریت انبارها", "دسترسی حسابداری", "دسترسی قیمت‌گذاری"] },
  { id: "sales", name: "فروشنده", users: 3, color: "emerald", permissions: ["مشاهده محصولات", "مشاهده گزارش‌ها"] },
  { id: "warehouse", name: "انباردار", users: 1, color: "amber", permissions: ["مشاهده محصولات", "مدیریت انبارها"] },
  { id: "accounting", name: "حسابدار", users: 1, color: "rose", permissions: ["مشاهده گزارش‌ها", "دسترسی حسابداری", "دسترسی قیمت‌گذاری"] },
];

export type User = {
  id: number; name: string; username: string; role: string; status: "online" | "offline";
  avatar: string; lastSeen: string; sales: number; trend: "up" | "down" | "stable";
};

export const users: User[] = [
  { id: 1, name: "بردیا سیادتی",       username: "b.siadati",  role: "مدیر کل",    status: "online",  avatar: "👨‍💼", lastSeen: "آنلاین",        sales: 0,          trend: "stable" },
  { id: 2, name: "سید سلطان سیادتی",   username: "s.siadati",  role: "مدیر فروش",  status: "online",  avatar: "🧑‍💼", lastSeen: "آنلاین",        sales: 748000000,  trend: "up"     },
  { id: 3, name: "ابراهیم سیادتی",     username: "e.siadati",  role: "فروشنده",    status: "online",  avatar: "👨",  lastSeen: "آنلاین",        sales: 512000000,  trend: "up"     },
  { id: 4, name: "صبا گریوانی",        username: "s.garivani", role: "فروشنده",    status: "online",  avatar: "👩",  lastSeen: "آنلاین",        sales: 389000000,  trend: "down"   },
  { id: 5, name: "توماس مولر",         username: "t.muller",   role: "فروشنده",    status: "offline", avatar: "🧑‍🦱", lastSeen: "۳ ساعت پیش",   sales: 204000000,  trend: "down"   },
];

export type Movement = {
  id: number; product: string; type: "خرید" | "فروش" | "مرجوعی" | "انتقال انبار" | "اصلاح" | "ویرایش دستی";
  qty: number; warehouse: string; user: string; date: string; time: string;
};

export const movements: Movement[] = [
  { id: 1, product: "هودی اوورسایز کرم",         type: "فروش",         qty: -5,  warehouse: "انبار مرکزی",       user: "سید سلطان سیادتی", date: "۱۴۰۳/۱۲/۰۶", time: "۱۴:۲۲" },
  { id: 2, product: "تی‌شرت یقه گرد مشکی",       type: "فروش",         qty: -12, warehouse: "انبار شعبه شمال",   user: "ابراهیم سیادتی",   date: "۱۴۰۳/۱۲/۰۶", time: "۱۲:۴۵" },
  { id: 3, product: "ست ورزشی بنفش",             type: "خرید",         qty: 50,  warehouse: "انبار مرکزی",       user: "بردیا سیادتی",     date: "۱۴۰۳/۱۲/۰۶", time: "۱۱:۰۵" },
  { id: 4, product: "شلوار جین مام فیت آبی",      type: "انتقال انبار", qty: 10,  warehouse: "مرکزی ← شعبه شمال", user: "بردیا سیادتی",    date: "۱۴۰۳/۱۲/۰۵", time: "۱۶:۴۰" },
  { id: 5, product: "مانتو کرپ مشکی",            type: "فروش",         qty: -3,  warehouse: "انبار شعبه مرکز",  user: "صبا گریوانی",      date: "۱۴۰۳/۱۲/۰۵", time: "۱۰:۱۲" },
  { id: 6, product: "کت تک اسپرت خاکستری",       type: "مرجوعی",       qty: 1,   warehouse: "انبار مرکزی",       user: "توماس مولر",        date: "۱۴۰۳/۱۲/۰۴", time: "۱۸:۳۰" },
  { id: 7, product: "پیراهن کتان آستین کوتاه",   type: "اصلاح",        qty: -2,  warehouse: "انبار شعبه مرکز",  user: "ابراهیم سیادتی",   date: "۱۴۰۳/۱۲/۰۴", time: "۰۹:۱۵" },
];

export const salesTrend = [
  { label: "شنبه",    value: 42 },
  { label: "یکشنبه",  value: 68 },
  { label: "دوشنبه",  value: 54 },
  { label: "سه‌شنبه", value: 83 },
  { label: "چهارشنبه",value: 71 },
  { label: "پنجشنبه", value: 110 },
  { label: "جمعه",    value: 49 },
];

export const monthlyRevenue = [
  { label: "مهر",   value: 1420 },
  { label: "آبان",  value: 1780 },
  { label: "آذر",   value: 2050 },
  { label: "دی",    value: 2380 },
  { label: "بهمن",  value: 2740 },
  { label: "اسفند", value: 3190 },
];

export const topCategories = [
  { label: "تی‌شرت",          value: 34, color: "#8b5cf6" },
  { label: "هودی و سوئیشرت", value: 28, color: "#06b6d4" },
  { label: "شلوار",           value: 18, color: "#10b981" },
  { label: "لباس ورزشی",      value: 12, color: "#f59e0b" },
  { label: "سایر",            value: 8,  color: "#f43f5e" },
];

export const warehouseCompare = [
  { label: "انبار مرکزی",       value: 190 },
  { label: "انبار شعبه شمال",   value: 84  },
  { label: "انبار شعبه مرکز",   value: 90  },
];

export type Notif = { id: number; title: string; body: string; kind: "low" | "out" | "order" | "sync" | "transfer" | "price"; time: string };

export const notifications: Notif[] = [
  { id: 1, title: "موجودی بحرانی",        body: "ست ورزشی بنفش به کمتر از ۱۵ عدد رسید",            kind: "low",      time: "چند لحظه پیش"   },
  { id: 2, title: "اتمام موجودی",         body: "پیراهن کتان آستین کوتاه سفید ناموجود شد",          kind: "out",      time: "۲۰ دقیقه پیش"  },
  { id: 3, title: "سفارش جدید وب‌سایت",  body: "سفارش #۱۰۴۸۲ ثبت شد — ۸۹۰٬۰۰۰ تومان",            kind: "order",    time: "۳۵ دقیقه پیش"  },
  { id: 4, title: "همگام‌سازی موفق",      body: "موجودی دیجی‌کالا با موفقیت به‌روزرسانی شد",        kind: "sync",     time: "۱ ساعت پیش"    },
  { id: 5, title: "انتقال انبار",         body: "۱۰ عدد شلوار جین از مرکزی به شعبه شمال منتقل شد", kind: "transfer", time: "۲ ساعت پیش"    },
  { id: 6, title: "به‌روزرسانی قیمت",    body: "قیمت ۸ محصول دسته هودی و سوئیشرت تغییر کرد",      kind: "price",    time: "دیروز"          },
];

export const orders = [
  { id: "۱۰۴۸۲", customer: "نیلوفر رحیمی",   channel: "وب‌سایت",  amount: 890000,  status: "در انتظار",       items: 1 },
  { id: "۱۰۴۸۱", customer: "آرمان کاظمی",    channel: "دیجی‌کالا", amount: 1290000, status: "در انتظار",       items: 1 },
  { id: "۱۰۴۸۰", customer: "مهسا موسوی",     channel: "حضوری",    amount: 1690000, status: "تکمیل شده",       items: 1 },
  { id: "۱۰۴۷۹", customer: "رضا اکبری",      channel: "وب‌سایت",  amount: 980000,  status: "در حال پردازش",   items: 2 },
  { id: "۱۰۴۷۸", customer: "سوگند طاهری",    channel: "دیجی‌کالا", amount: 750000,  status: "در انتظار",       items: 1 },
];

// رتبه‌بندی فروشندگان برای داشبورد
export const sellerRanking = [
  { rank: 1, name: "سید سلطان سیادتی", avatar: "🧑‍💼", sales: 748000000, items: 312, badge: "🥇", trend: "up",     change: "+۲۳٪", role: "مدیر فروش"  },
  { rank: 2, name: "ابراهیم سیادتی",   avatar: "👨",   sales: 512000000, items: 218, badge: "🥈", trend: "up",     change: "+۱۵٪", role: "فروشنده"    },
  { rank: 3, name: "صبا گریوانی",      avatar: "👩",   sales: 389000000, items: 167, badge: "🥉", trend: "down",   change: "-۴٪",  role: "فروشنده"    },
  { rank: 4, name: "توماس مولر",       avatar: "🧑‍🦱",  sales: 204000000, items: 89,  badge: "۴",  trend: "down",   change: "-۱۱٪", role: "فروشنده"    },
];
