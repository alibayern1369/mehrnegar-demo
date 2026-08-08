import { TEST_PRODUCTS } from "@/lib/test-catalog";
import { SEED_PRODUCTS, SEED_STOCK } from "@/lib/seed-data";
import {
  DEFAULT_ADMIN_SALE_TEMPLATE,
  DEFAULT_CUSTOMER_SALE_TEMPLATE,
  DEFAULT_OTP_TEMPLATE,
} from "@/lib/sms/templates";
import { hashPassword } from "./auth-helpers";
import {
  bumpStock,
  createUnitsInWarehouse,
  genDocumentNumber,
  getCentralWarehouse,
  moveUnitsBetweenWarehouses,
  writeAudit,
  writeLedger,
} from "./inventory";
import { getStore, nextId, resetStore, type MockStore } from "./store";
import type { ProductUnit, SessionUser } from "./types";

type WhMap = Record<string, { id: number; name: string; code: string }>;

type CreatedVar = {
  productId: number;
  variationId: number;
  name: string;
  color: string;
  size: string;
  price: number;
  barcodes: string[];
};

const SEED_CUSTOMERS = [
  { name: "مینا احمدی", phone: "09121110001", address: "تهران، سعادت‌آباد، پلاک ۱۲", birthDate: "1375/03/15" },
  { name: "رضا کریمی", phone: "09121110002", address: "مشهد، هاشمیه، کوچه ۵", birthDate: "1368/07/22" },
  { name: "الهام نوری", phone: "09121110003", address: "اصفهان، چهارباغ، واحد ۳", birthDate: "1379/11/08" },
  { name: "نگار موسوی", phone: "09123330001", address: "بجنورد، خیابان امام، پلاک ۴۵", birthDate: "1372/01/30" },
  { name: "پارسا جعفری", phone: "09124440001", address: "تهران، ولنجک، برج آسمان", birthDate: "1380/05/12" },
  { name: "سارا رضایی", phone: "09125550002", address: "شیراز، معالی‌آباد، کوچه ۸", birthDate: "1377/09/04" },
  { name: "امیرحسین محمدی", phone: "09126660003", address: "تبریز، ولیعصر، پلاک ۲۱", birthDate: "1365/12/18" },
  { name: "فاطمه حسینی", phone: "09127770004", address: "کرج، گوهردشت، فاز ۲", birthDate: "1382/02/25" },
];

function whByCode(store: MockStore): WhMap {
  const map: WhMap = {};
  for (const w of store.warehouses) {
    map[w.code] = { id: w.id, name: w.name, code: w.code };
  }
  return map;
}

function toSessionUser(u: { id: number; name: string; username: string; role: string; permissions: string[] }): SessionUser {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    role: u.role as "manager" | "user",
    permissions: u.permissions,
  };
}

function seedWarehouses(store: MockStore) {
  const now = new Date();
  const groupId = nextId(store, "warehouseGroups");
  store.warehouseGroups.push({
    id: groupId,
    name: "گروه اصلی انبارها",
    isActive: true,
    isPlaceholder: false,
    sortOrder: 1,
    createdAt: now,
  });

  const defs = [
    { name: "انبار مرکزی", code: "main", sortOrder: 1 },
    { name: "انبار سجاد", code: "sajjad", sortOrder: 2 },
    { name: "انبار هاشمیه", code: "hashemieh", sortOrder: 3 },
    { name: "انبار بجنورد", code: "bojnord", sortOrder: 4 },
    { name: "انبار وب‌سایت", code: "website", sortOrder: 5 },
    { name: "انبار دیجی‌کالا", code: "digikala", sortOrder: 6 },
  ];

  for (const d of defs) {
    store.warehouses.push({
      id: nextId(store, "warehouses"),
      groupId,
      name: d.name,
      code: d.code,
      isActive: true,
      sortOrder: d.sortOrder,
      createdAt: now,
    });
  }
}

function seedUsers(store: MockStore) {
  const now = new Date();
  const manager = {
    id: nextId(store, "users"),
    name: "بردیا سیادتی",
    username: "mehrnegaradmin",
    passwordHash: hashPassword("Admin@1234"),
    phone: "09120000001",
    gender: "male" as string | null,
    role: "manager",
    isActive: true,
    mustChangePass: false,
    bypassOtp: false,
    isBootstrap: false,
    permissions: ["all"],
    createdAt: now,
    updatedAt: now,
  };

  const seller = {
    id: nextId(store, "users"),
    name: "سید سلطان سیادتی",
    username: "mehrnegaruser",
    passwordHash: hashPassword("User@1234"),
    phone: "09120000002",
    gender: "male" as string | null,
    role: "user",
    isActive: true,
    mustChangePass: true,
    bypassOtp: false,
    isBootstrap: false,
    permissions: ["sell", "return", "create_product", "view_own"],
    createdAt: now,
    updatedAt: now,
  };

  const setup = {
    id: nextId(store, "users"),
    name: "کاربر راه‌اندازی",
    username: "setup",
    passwordHash: hashPassword("Setup@1234"),
    phone: null,
    gender: null,
    role: "manager",
    isActive: true,
    mustChangePass: true,
    bypassOtp: true,
    isBootstrap: true,
    permissions: ["all"],
    createdAt: now,
    updatedAt: now,
  };

  store.users.push(manager, seller, setup);

  const allMethods = ["normal", "snappay"];
  for (const wh of store.warehouses) {
    store.userSalesPermissions.push({
      id: nextId(store, "userSalesPermissions"),
      userId: manager.id,
      warehouseId: wh.id,
      enabled: true,
      salesMethods: allMethods,
      createdAt: now,
    });
    const sellerMethods =
      wh.code === "sajjad" ? ["normal", "snappay"]
      : wh.code === "bojnord" ? ["normal"]
      : ["normal"];
    store.userSalesPermissions.push({
      id: nextId(store, "userSalesPermissions"),
      userId: seller.id,
      warehouseId: wh.id,
      enabled: true,
      salesMethods: sellerMethods,
      createdAt: now,
    });
  }

  return { manager, seller, setup };
}

function seedSettings(store: MockStore) {
  const now = new Date();
  store.invoiceSettings.push({
    id: nextId(store, "invoiceSettings"),
    businessName: "فروشگاه پوشاک کامفی فیتس",
    businessLogo: null,
    address: "تهران، ولنجک، خیابان فرشته",
    phone: "021-88234567",
    website: "comfyfits.ir",
    socialNetwork: "instagram",
    socialUrl: "https://instagram.com/comfyfits",
    taxId: "12345678901",
    invoiceTitle: "فاکتور فروش",
    invoicePrefix: "CF",
    footerText: "از خرید شما متشکریم — کامفی فیتس",
    returnPolicy: "کالا تا ۷ روز با فاکتور و برچسب سالم قابل مرجوع است",
    customNotes: "ارسال رایگان برای خریدهای بالای ۲ میلیون تومان",
    updatedAt: now,
  });

  store.appSettings.push({
    id: nextId(store, "appSettings"),
    appName: "مهرنگار",
    appLogo: null,
    developerUrl: "https://kishlandweb.ir",
    setupLoginToken: `mock-${Date.now().toString(36)}`,
    updatedAt: now,
  });

  store.smsSettings.push({
    id: nextId(store, "smsSettings"),
    provider: "melipayamak",
    melipayamakUsername: "demo_user",
    melipayamakPassword: null,
    melipayamakFrom: "5000xxx",
    melipayamakOtpBodyId: 100001,
    melipayamakCustomerSaleBodyId: 100002,
    melipayamakAdminSaleBodyId: 100003,
    otpTemplate: DEFAULT_OTP_TEMPLATE,
    customerSaleTemplate: DEFAULT_CUSTOMER_SALE_TEMPLATE,
    adminSaleTemplate: DEFAULT_ADMIN_SALE_TEMPLATE,
    otpMapping: ["seller_name", "code"],
    customerSaleMapping: ["customer_name", "store_name", "invoice_number", "total"],
    adminSaleMapping: [
      "customer_name", "customer_phone", "items_summary", "total",
      "payment_method", "seller_name", "invoice_number",
    ],
    adminPhones: "09120000001",
    notifyCustomerOnSaleFinalized: true,
    notifyAdminOnSaleFinalized: false,
    otpLength: 5,
    otpExpireSeconds: 120,
    otpCooldownSeconds: 60,
    otpHourlyLimit: 5,
    otpMaxAttempts: 5,
    otpLockSeconds: 3600,
    otpIpHourlyLimit: 20,
    varMaxLength: 200,
    enabled: true,
    updatedAt: now,
  });
}

function seedLegacyProducts(
  store: MockStore,
  operator: SessionUser,
  centralId: number,
): CreatedVar[] {
  const created: CreatedVar[] = [];
  const now = new Date();

  for (let i = 0; i < SEED_PRODUCTS.length; i++) {
    const p = SEED_PRODUCTS[i];
    const price = p.sellingPrice;
    const totalQty = (SEED_STOCK[i] ?? []).reduce((a, b) => a + b, 0);

    const productId = nextId(store, "products");
    store.products.push({
      id: productId,
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      category: p.category,
      brand: p.brand,
      supplier: p.supplier,
      description: null,
      color: p.color,
      size: p.size,
      purchasePrice: 0,
      sellingPrice: price,
      price,
      tax: p.tax,
      status: "active",
      createdBy: operator.id,
      createdAt: now,
      updatedAt: now,
    });

    const variationId = nextId(store, "productVariations");
    store.productVariations.push({
      id: variationId,
      productId,
      sku: p.sku,
      color: p.color,
      size: p.size,
      price,
      status: "active",
      createdAt: now,
    });

    if (totalQty > 0) {
      const barcodes = createUnitsInWarehouse(store, {
        productId,
        variationId,
        warehouseId: centralId,
        quantity: totalQty,
        productName: p.name,
        color: p.color,
        size: p.size,
        operator,
        transactionType: "receipt",
        documentNumber: genDocumentNumber("RCV"),
        reference: `seed-legacy-${i}`,
      });
      created.push({ productId, variationId, name: p.name, color: p.color, size: p.size, price, barcodes });
    }
  }

  return created;
}

function seedTestCatalog(
  store: MockStore,
  operator: SessionUser,
  centralId: number,
): CreatedVar[] {
  const created: CreatedVar[] = [];
  const now = new Date();

  for (const p of TEST_PRODUCTS) {
    const basePrice = p.variations[0]?.price ?? 0;
    const productId = nextId(store, "products");
    store.products.push({
      id: productId,
      name: p.name,
      sku: p.sku,
      barcode: `P${Date.now()}${Math.floor(Math.random() * 999)}`,
      category: p.category,
      brand: p.brand,
      supplier: p.brand,
      description: null,
      color: p.variations[0]?.color ?? null,
      size: p.variations[0]?.size ?? null,
      purchasePrice: 0,
      sellingPrice: basePrice,
      price: basePrice,
      tax: 9,
      status: "active",
      createdBy: operator.id,
      createdAt: now,
      updatedAt: now,
    });

    for (let i = 0; i < p.variations.length; i++) {
      const v = p.variations[i];
      const variationId = nextId(store, "productVariations");
      store.productVariations.push({
        id: variationId,
        productId,
        sku: `${p.sku}-${i + 1}`,
        color: v.color,
        size: v.size,
        price: v.price,
        status: "active",
        createdAt: now,
      });

      const barcodes = createUnitsInWarehouse(store, {
        productId,
        variationId,
        warehouseId: centralId,
        quantity: v.quantity,
        productName: p.name,
        color: v.color,
        size: v.size,
        operator,
        transactionType: "receipt",
        documentNumber: genDocumentNumber("RCV"),
        reference: "test-receipt-central",
      });

      created.push({
        productId,
        variationId,
        name: p.name,
        color: v.color,
        size: v.size,
        price: v.price,
        barcodes,
      });
    }

    writeAudit(store, operator, "دریافت تست به مرکزی", "product", productId,
      `محصول تست «${p.name}» با ${p.variations.length} ورییشن دریافت شد`,
      { warehouseId: centralId, kind: "success" },
    );
  }

  return created;
}

function createStockDoc(
  store: MockStore,
  operator: SessionUser,
  type: "distribution" | "transfer",
  sourceId: number,
  destId: number,
  items: { variationId: number; productId: number; productName: string; color: string; size: string; quantity: number }[],
  notes: string,
) {
  const documentNumber = genDocumentNumber(type === "distribution" ? "DIST" : "TRF");
  let totalQty = 0;
  const itemResults: {
    productId: number;
    variationId: number;
    productName: string;
    color: string;
    size: string;
    quantity: number;
    barcodeStart: string;
    barcodeEnd: string;
    unitIds: { id: number; barcode: string }[];
  }[] = [];

  for (const it of items) {
    const moved = moveUnitsBetweenWarehouses(store, {
      productId: it.productId,
      variationId: it.variationId,
      sourceWarehouseId: sourceId,
      destWarehouseId: destId,
      quantity: it.quantity,
      productName: it.productName,
      color: it.color,
      size: it.size,
      operator,
      documentNumber,
      transactionType: type,
      reference: type,
    });
    const barcodes = moved.map((u) => u.barcode).sort();
    itemResults.push({
      ...it,
      barcodeStart: barcodes[0],
      barcodeEnd: barcodes[barcodes.length - 1],
      unitIds: moved.map((u) => ({ id: u.id, barcode: u.barcode })),
    });
    totalQty += it.quantity;
  }

  const now = new Date();
  const docId = nextId(store, "stockDocuments");
  store.stockDocuments.push({
    id: docId,
    documentNumber,
    type,
    sourceWarehouseId: sourceId,
    destWarehouseId: destId,
    operatorId: operator.id,
    operatorName: operator.name,
    notes,
    status: "completed",
    totalItems: itemResults.length,
    totalQuantity: totalQty,
    createdAt: now,
  });

  for (const it of itemResults) {
    const itemId = nextId(store, "stockDocumentItems");
    store.stockDocumentItems.push({
      id: itemId,
      documentId: docId,
      productId: it.productId,
      variationId: it.variationId,
      productName: it.productName,
      color: it.color,
      size: it.size,
      quantity: it.quantity,
      barcodeStart: it.barcodeStart,
      barcodeEnd: it.barcodeEnd,
    });

    for (const u of it.unitIds) {
      store.stockDocumentUnits.push({
        id: nextId(store, "stockDocumentUnits"),
        documentId: docId,
        itemId,
        unitId: u.id,
        barcode: u.barcode,
      });
    }
  }

  writeAudit(store, operator,
    type === "distribution" ? "توزیع موجودی" : "انتقال موجودی",
    "stock_document", docId,
    `سند ${documentNumber} — ${totalQty} واحد`,
    { warehouseId: destId, kind: "success" },
  );

  return { documentNumber, totalQty, itemCount: itemResults.length };
}

function takeInStock(store: MockStore, warehouseId: number, variationId: number, count: number): ProductUnit[] {
  return store.productUnits
    .filter((u) => u.warehouseId === warehouseId && u.variationId === variationId && u.status === "in_stock")
    .slice(0, count);
}

function distributeStock(
  store: MockStore,
  operator: SessionUser,
  created: CreatedVar[],
  whs: WhMap,
  centralId: number,
) {
  const pickQty = (v: CreatedVar, n: number) => Math.min(n, Math.floor(v.barcodes.length * 0.25) || 0);
  const docs = [];

  const branches = [
    { code: "sajjad", note: "توزیع اولیه به انبار سجاد", take: 3 },
    { code: "hashemieh", note: "توزیع اولیه به انبار هاشمیه", take: 2 },
    { code: "bojnord", note: "توزیع اولیه به انبار بجنورد", take: 2 },
    { code: "website", note: "توزیع به انبار وب‌سایت", take: 2 },
    { code: "digikala", note: "توزیع به انبار دیجی‌کالا", take: 2 },
  ];

  for (const b of branches) {
    const dest = whs[b.code];
    if (!dest) continue;

    const items = created
      .map((v) => {
        const quantity = pickQty(v, b.take);
        if (quantity < 1) return null;
        return {
          variationId: v.variationId,
          productId: v.productId,
          productName: v.name,
          color: v.color,
          size: v.size,
          quantity,
        };
      })
      .filter(Boolean) as {
        variationId: number; productId: number; productName: string;
        color: string; size: string; quantity: number;
      }[];

    const slice = items.slice(0, 15);
    if (!slice.length) continue;
    docs.push({ branch: b.code, ...createStockDoc(store, operator, "distribution", centralId, dest.id, slice, b.note) });
  }

  // Transfer: Sajjad → Hashemieh
  {
    const items = [];
    for (const v of created.slice(0, 6)) {
      const available = takeInStock(store, whs.sajjad.id, v.variationId, 2);
      if (available.length >= 1) {
        items.push({
          variationId: v.variationId,
          productId: v.productId,
          productName: v.name,
          color: v.color,
          size: v.size,
          quantity: Math.min(2, available.length),
        });
      }
    }
    if (items.length) {
      docs.push(createStockDoc(store, operator, "transfer", whs.sajjad.id, whs.hashemieh.id, items,
        "انتقال بین شعب — سجاد به هاشمیه"));
    }
  }

  // Transfer: Hashemieh → Bojnord
  {
    const items = [];
    for (const v of created.slice(2, 10)) {
      const available = takeInStock(store, whs.hashemieh.id, v.variationId, 1);
      if (available.length >= 1) {
        items.push({
          variationId: v.variationId,
          productId: v.productId,
          productName: v.name,
          color: v.color,
          size: v.size,
          quantity: 1,
        });
      }
    }
    if (items.length) {
      docs.push(createStockDoc(store, operator, "transfer", whs.hashemieh.id, whs.bojnord.id, items,
        "انتقال بین شعب — هاشمیه به بجنورد"));
    }
  }

  return docs;
}

function seedCustomers(store: MockStore, createdBy: number) {
  const now = new Date();
  for (const c of SEED_CUSTOMERS) {
    store.customers.push({
      id: nextId(store, "customers"),
      name: c.name,
      phone: c.phone,
      address: c.address,
      birthDate: c.birthDate,
      createdBy,
      createdAt: now,
      updatedAt: now,
    });
  }
}

function sellUnits(
  store: MockStore,
  opts: {
    operator: SessionUser;
    warehouseId: number;
    salesMethod: string;
    customerName: string;
    customerPhone: string;
    customerAddress?: string;
    customerBirthDate?: string;
    units: { barcode: string; productId: number; variationId: number; productName: string; color: string; size: string; price: number }[];
    notes?: string;
  },
) {
  if (!opts.units.length) return null;

  const settings = store.invoiceSettings[0];
  const invoiceNumber = genDocumentNumber(settings?.invoicePrefix ?? "CF");
  const subtotal = opts.units.reduce((a, u) => a + u.price, 0);
  const now = new Date();

  const invoiceId = nextId(store, "invoices");
  store.invoices.push({
    id: invoiceId,
    invoiceNumber,
    status: "completed",
    soldBy: opts.operator.id,
    warehouseId: opts.warehouseId,
    salesMethod: opts.salesMethod,
    customerName: opts.customerName,
    customerPhone: opts.customerPhone,
    customerAddress: opts.customerAddress ?? null,
    customerBirthDate: opts.customerBirthDate ?? null,
    notes: opts.notes ?? null,
    subtotal,
    totalDiscount: 0,
    totalTax: 0,
    grandTotal: subtotal,
    businessSnapshot: { businessName: settings?.businessName ?? "کامفی فیتس" },
    customerSmsSentAt: now,
    adminSmsSentAt: null,
    lastSmsError: null,
    createdAt: now,
  });

  for (const u of opts.units) {
    const unit = store.productUnits.find((x) => x.barcode === u.barcode);
    if (!unit || unit.status !== "in_stock" || unit.warehouseId !== opts.warehouseId) {
      throw new Error(`بارکد قابل فروش نیست: ${u.barcode}`);
    }

    store.invoiceItems.push({
      id: nextId(store, "invoiceItems"),
      invoiceId,
      productId: u.productId,
      variationId: u.variationId,
      barcode: u.barcode,
      productName: `${u.productName} — ${u.color} / ${u.size}`,
      color: u.color,
      size: u.size,
      quantity: 1,
      unitPrice: u.price,
      discount: 0,
      lineTotal: u.price,
      unitBarcodes: [u.barcode],
    });

    unit.status = "sold";
    unit.soldInvoiceId = invoiceId;
    unit.soldAt = now;
    unit.warehouseId = null;
    unit.updatedAt = now;

    bumpStock(store, u.productId, u.variationId, opts.warehouseId, -1);
    writeLedger(store, [{
      productId: u.productId,
      variationId: u.variationId,
      unitId: unit.id,
      barcode: u.barcode,
      productName: u.productName,
      color: u.color,
      size: u.size,
      quantity: -1,
      sourceWarehouseId: opts.warehouseId,
      destWarehouseId: null,
      transactionType: "sale",
      operatorId: opts.operator.id,
      operatorName: opts.operator.name,
      documentNumber: invoiceNumber,
      reference: invoiceNumber,
    }]);
  }

  store.smsMessages.push({
    id: nextId(store, "smsMessages"),
    type: "sale",
    campaignName: null,
    phone: opts.customerPhone,
    customerName: opts.customerName,
    message: `فاکتور ${invoiceNumber} — ${subtotal.toLocaleString("fa-IR")} تومان`,
    status: "sent",
    invoiceId,
    sentBy: opts.operator.id,
    providerRef: `mock-${invoiceId}`,
    errorDetail: null,
    createdAt: now,
  });

  writeAudit(store, opts.operator, "فروش", "invoice", invoiceId,
    `فاکتور ${invoiceNumber} — ${opts.units.length} قلم`,
    { relatedInvoice: invoiceNumber, warehouseId: opts.warehouseId, kind: "success" },
  );

  return store.invoices.find((i) => i.id === invoiceId)!;
}

function collectUnitsForSale(
  store: MockStore,
  warehouseId: number,
  count: number,
) {
  const units = store.productUnits
    .filter((u) => u.warehouseId === warehouseId && u.status === "in_stock")
    .slice(0, count);

  const lines = [];
  for (const u of units) {
    const v = store.productVariations.find((x) => x.id === u.variationId);
    const p = store.products.find((x) => x.id === u.productId);
    if (!v || !p) continue;
    lines.push({
      barcode: u.barcode,
      productId: p.id,
      variationId: v.id,
      productName: p.name,
      color: v.color,
      size: v.size,
      price: Number(v.price ?? p.price ?? 0),
    });
  }
  return lines;
}

function seedInvoices(
  store: MockStore,
  manager: SessionUser,
  seller: SessionUser,
  whs: WhMap,
) {
  const invoices = [];

  const scenarios = [
    { wh: "sajjad", seller, method: "snappay", customer: SEED_CUSTOMERS[0], count: 3 },
    { wh: "sajjad", seller, method: "normal", customer: SEED_CUSTOMERS[1], count: 2 },
    { wh: "sajjad", seller, method: "normal", customer: SEED_CUSTOMERS[2], count: 2 },
    { wh: "bojnord", seller, method: "normal", customer: SEED_CUSTOMERS[3], count: 3 },
    { wh: "hashemieh", seller: manager, method: "normal", customer: SEED_CUSTOMERS[4], count: 2 },
    { wh: "main", seller: manager, method: "normal", customer: SEED_CUSTOMERS[5], count: 2 },
    { wh: "website", seller: manager, method: "normal", customer: SEED_CUSTOMERS[6], count: 2 },
    { wh: "digikala", seller: manager, method: "normal", customer: SEED_CUSTOMERS[7], count: 2 },
  ];

  for (const s of scenarios) {
    const wh = whs[s.wh];
    if (!wh) continue;
    const units = collectUnitsForSale(store, wh.id, s.count);
    if (!units.length) continue;
    const inv = sellUnits(store, {
      operator: toSessionUser(s.seller),
      warehouseId: wh.id,
      salesMethod: s.method,
      customerName: s.customer.name,
      customerPhone: s.customer.phone,
      customerAddress: s.customer.address,
      customerBirthDate: s.customer.birthDate,
      units,
      notes: s.method === "snappay" ? "پرداخت با اسنپ‌پی" : undefined,
    });
    if (inv) invoices.push(inv);
  }

  return invoices;
}

function seedReturns(
  store: MockStore,
  operator: SessionUser,
  centralId: number,
  soldBarcodes: string[],
) {
  const returns = [];
  for (const barcode of soldBarcodes.slice(0, 4)) {
    const unit = store.productUnits.find((u) => u.barcode === barcode);
    if (!unit || unit.status !== "sold") continue;

    const p = store.products.find((x) => x.id === unit.productId);
    const v = store.productVariations.find((x) => x.id === unit.variationId);
    const inv = unit.soldInvoiceId ? store.invoices.find((i) => i.id === unit.soldInvoiceId) : null;
    const item = store.invoiceItems.find((i) => i.barcode === barcode);
    const returnId = `RTN-${Date.now().toString(36).toUpperCase()}-${returns.length + 1}`;
    const now = new Date();
    const unitPrice = item?.unitPrice ?? v?.price ?? 0;

    unit.status = "in_stock";
    unit.warehouseId = centralId;
    unit.soldInvoiceId = null;
    unit.soldAt = null;
    unit.updatedAt = now;

    bumpStock(store, unit.productId, unit.variationId, centralId, 1);

    const retId = nextId(store, "returns");
    store.returns.push({
      id: retId,
      returnId,
      invoiceId: inv?.id ?? null,
      invoiceItemId: item?.id ?? null,
      productId: unit.productId,
      variationId: unit.variationId,
      unitId: unit.id,
      barcode,
      productName: p?.name ?? "محصول",
      quantity: 1,
      unitPrice,
      amount: unitPrice,
      affectsSales: true,
      originalWarehouseId: inv?.warehouseId ?? null,
      returnWarehouseId: centralId,
      originalSoldBy: inv?.soldBy ?? null,
      returnedBy: operator.id,
      reason: "مرجوعی دمو — سایز نامناسب",
      notes: "بازگشت به انبار مرکزی",
      status: "returned",
      createdAt: now,
    });

    writeLedger(store, [{
      productId: unit.productId,
      variationId: unit.variationId,
      unitId: unit.id,
      barcode,
      productName: p?.name,
      color: v?.color,
      size: v?.size,
      quantity: 1,
      sourceWarehouseId: inv?.warehouseId ?? null,
      destWarehouseId: centralId,
      transactionType: "return",
      operatorId: operator.id,
      operatorName: operator.name,
      documentNumber: returnId,
      reference: returnId,
    }]);

    writeAudit(store, operator, "مرجوعی", "return", retId,
      `مرجوعی ${returnId} — ${barcode}`,
      { warehouseId: centralId, relatedInvoice: inv?.invoiceNumber ?? undefined, kind: "warning" },
    );

    returns.push(store.returns.find((r) => r.id === retId)!);
  }
  return returns;
}

function seedLogs(store: MockStore, manager: SessionUser, seller: SessionUser) {
  const now = new Date();
  const dayAgo = new Date(now.getTime() - 86400000);
  const twoDaysAgo = new Date(now.getTime() - 172800000);

  store.auditLogs.unshift({
    id: nextId(store, "auditLogs"),
    userId: manager.id,
    userName: "سیستم",
    action: "راه‌اندازی اولیه سامانه",
    entity: "system",
    entityId: null,
    detail: "پایگاه داده mock، انبارهای چندگانه و واحدهای بارکدی ایجاد شدند",
    prevValue: null,
    newValue: null,
    warehouseId: null,
    relatedInvoice: null,
    kind: "success",
    createdAt: twoDaysAgo,
  });

  store.auditLogs.push(
    {
      id: nextId(store, "auditLogs"),
      userId: manager.id,
      userName: manager.name,
      action: "ویرایش تنظیمات فاکتور",
      entity: "invoice_settings",
      entityId: 1,
      detail: "به‌روزرسانی اطلاعات فروشگاه",
      prevValue: null,
      newValue: null,
      warehouseId: null,
      relatedInvoice: null,
      kind: "info",
      createdAt: dayAgo,
    },
    {
      id: nextId(store, "auditLogs"),
      userId: seller.id,
      userName: seller.name,
      action: "ورود به سیستم",
      entity: "user",
      entityId: seller.id,
      detail: "ورود موفق فروشنده",
      prevValue: null,
      newValue: null,
      warehouseId: null,
      relatedInvoice: null,
      kind: "info",
      createdAt: now,
    },
  );

  store.activityLogs.push(
    {
      id: nextId(store, "activityLogs"),
      user: manager.name,
      action: "راه‌اندازی دمو",
      detail: "داده‌های نمونه mock بارگذاری شد",
      kind: "success",
      createdAt: twoDaysAgo,
    },
    {
      id: nextId(store, "activityLogs"),
      user: seller.name,
      action: "فروش جدید",
      detail: "ثبت فاکتور در انبار سجاد",
      kind: "info",
      createdAt: dayAgo,
    },
    {
      id: nextId(store, "activityLogs"),
      user: manager.name,
      action: "توزیع موجودی",
      detail: "ارسال کالا از مرکزی به شعب",
      kind: "info",
      createdAt: dayAgo,
    },
    {
      id: nextId(store, "activityLogs"),
      user: manager.name,
      action: "مرجوعی",
      detail: "ثبت ۴ مرجوعی به انبار مرکزی",
      kind: "warning",
      createdAt: now,
    },
  );
}

export type SeedResult = {
  ok: true;
  warehouses: number;
  users: number;
  products: number;
  variations: number;
  units: number;
  customers: number;
  invoices: number;
  returns: number;
  stockDocuments: number;
  distributionDocs: number;
  transferDocs: number;
};

/** Populate mock store with comprehensive demo data */
export function seedMockData(opts?: { force?: boolean }): SeedResult {
  const store = getStore();

  if (store.seeded && !opts?.force) {
    return {
      ok: true,
      warehouses: store.warehouses.length,
      users: store.users.length,
      products: store.products.length,
      variations: store.productVariations.length,
      units: store.productUnits.length,
      customers: store.customers.length,
      invoices: store.invoices.length,
      returns: store.returns.length,
      stockDocuments: store.stockDocuments.length,
      distributionDocs: store.stockDocuments.filter((d) => d.type === "distribution").length,
      transferDocs: store.stockDocuments.filter((d) => d.type === "transfer").length,
    };
  }

  if (opts?.force) resetStore();
  const s = getStore();

  seedWarehouses(s);
  const { manager, seller } = seedUsers(s);
  seedSettings(s);
  seedCustomers(s, manager.id);

  const operator = toSessionUser(manager);
  const central = getCentralWarehouse(s)!;

  const legacyCreated = seedLegacyProducts(s, operator, central.id);
  const testCreated = seedTestCatalog(s, operator, central.id);
  const allCreated = [...legacyCreated, ...testCreated];

  const whs = whByCode(s);
  distributeStock(s, operator, allCreated, whs, central.id);

  const invoices = seedInvoices(s, operator, toSessionUser(seller), whs);
  const soldBarcodes = s.productUnits.filter((u) => u.status === "sold").map((u) => u.barcode);
  seedReturns(s, operator, central.id, soldBarcodes);

  seedLogs(s, toSessionUser(manager), toSessionUser(seller));

  s.seeded = true;

  return {
    ok: true,
    warehouses: s.warehouses.length,
    users: s.users.length,
    products: s.products.length,
    variations: s.productVariations.length,
    units: s.productUnits.length,
    customers: s.customers.length,
    invoices: invoices.length,
    returns: s.returns.filter((r) => r.status === "returned").length,
    stockDocuments: s.stockDocuments.length,
    distributionDocs: s.stockDocuments.filter((d) => d.type === "distribution").length,
    transferDocs: s.stockDocuments.filter((d) => d.type === "transfer").length,
  };
}

/** Reset and re-seed from scratch */
export function resetAndSeed(): SeedResult {
  resetStore();
  return seedMockData({ force: true });
}
