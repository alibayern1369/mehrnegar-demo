import { faDate, faTime, toman } from "@/lib/format";

export const APP_NAME = "مهرنگار";

export const DEFAULT_OTP_TEMPLATE =
  `{seller_name} عزیز خوش اومدی
کد ورود به مهرنگار: {code}`;

export const DEFAULT_CUSTOMER_SALE_TEMPLATE =
  `{customer_name} عزیز، خرید شما در {store_name} ثبت شد.
شماره فاکتور: {invoice_number}
مبلغ: {total}
از اعتماد شما سپاسگزاریم — مهرنگار`;

export const DEFAULT_ADMIN_SALE_TEMPLATE =
  `فروش جدید در {store_name}
مشتری: {customer_name} ({customer_phone})
فاکتور: {invoice_number}
مبلغ: {total}
روش: {payment_method}
فروشنده: {seller_name}
اقلام: {items_summary}`;

/** All template / pattern variables exposed in settings UI */
export const SMS_VARIABLE_KEYS = [
  "invoice_id", "invoice_number", "invoice_date", "invoice_time",
  "total", "subtotal", "discount", "tax", "paid", "remain",
  "payment_method", "sale_status",
  "items_summary", "items_count", "currency",
  "customer_name", "customer_phone", "customer_address", "customer_code",
  "seller_name", "seller_phone", "store_name", "branch_name",
  "now", "app_name",
  "code", "phone", "expire",
] as const;

export type SmsVarMap = Record<string, string>;

export function sanitizeSmsVar(value: unknown, maxLen = 200): string {
  let s = String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (maxLen > 0 && s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

export function renderTemplate(template: string, vars: SmsVarMap, maxLen = 200): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    return sanitizeSmsVar(vars[key] ?? "", maxLen);
  });
}

export function mapVarsToTextArray(
  mapping: string[] | null | undefined,
  vars: SmsVarMap,
  maxLen = 200,
): string[] {
  const keys = mapping?.length ? mapping : [];
  return keys.map((k) => sanitizeSmsVar(vars[k] ?? "", maxLen));
}

export type SaleSmsContext = {
  invoiceId: number;
  invoiceNumber: string;
  invoiceDate?: Date | null;
  status?: string | null;
  subtotal?: number | null;
  discount?: number | null;
  tax?: number | null;
  grandTotal?: number | null;
  paid?: number | null;
  paymentMethod?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  customerCode?: string | null;
  sellerName?: string | null;
  sellerPhone?: string | null;
  storeName?: string | null;
  branchName?: string | null;
  items?: { productName: string; quantity: number; color?: string | null; size?: string | null }[];
};

export function buildSaleVars(ctx: SaleSmsContext, maxLen = 200): SmsVarMap {
  const now = new Date();
  const created = ctx.invoiceDate ?? now;
  const total = ctx.grandTotal ?? 0;
  const paid = ctx.paid ?? total;
  const items = ctx.items ?? [];
  const itemsSummary = items
    .map((it) => {
      const meta = [it.color, it.size].filter(Boolean).join("/");
      return `${it.productName}${meta ? `(${meta})` : ""}×${it.quantity}`;
    })
    .join("، ");

  const raw: SmsVarMap = {
    invoice_id: String(ctx.invoiceId),
    invoice_number: ctx.invoiceNumber,
    invoice_date: faDate(created),
    invoice_time: faTime(created),
    total: toman(total),
    subtotal: toman(ctx.subtotal ?? 0),
    discount: toman(ctx.discount ?? 0),
    tax: toman(ctx.tax ?? 0),
    paid: toman(paid),
    remain: toman(Math.max(0, total - paid)),
    payment_method: ctx.paymentMethod ?? "عادی",
    sale_status: ctx.status ?? "completed",
    items_summary: itemsSummary,
    items_count: String(items.reduce((a, b) => a + (b.quantity || 0), 0)),
    currency: "تومان",
    customer_name: ctx.customerName?.trim() || "مشتری گرامی",
    customer_phone: ctx.customerPhone ?? "",
    customer_address: ctx.customerAddress ?? "",
    customer_code: ctx.customerCode ?? "",
    seller_name: ctx.sellerName ?? "",
    seller_phone: ctx.sellerPhone ?? "",
    store_name: ctx.storeName ?? APP_NAME,
    branch_name: ctx.branchName ?? "",
    now: `${faDate(now)} ${faTime(now)}`,
    app_name: APP_NAME,
  };

  const out: SmsVarMap = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = sanitizeSmsVar(v, maxLen);
  }
  return out;
}

export function buildOtpVars(opts: {
  sellerName: string;
  code: string;
  phone: string;
  expireSeconds: number;
}, maxLen = 200): SmsVarMap {
  return {
    seller_name: sanitizeSmsVar(opts.sellerName, maxLen),
    code: sanitizeSmsVar(opts.code, maxLen),
    phone: sanitizeSmsVar(opts.phone, maxLen),
    expire: sanitizeSmsVar(String(opts.expireSeconds), maxLen),
    app_name: APP_NAME,
  };
}

export const VARIABLE_HELP: { key: string; label: string; group: string }[] = [
  { key: "invoice_id", label: "شناسه فاکتور", group: "فاکتور" },
  { key: "invoice_number", label: "شماره فاکتور", group: "فاکتور" },
  { key: "invoice_date", label: "تاریخ فاکتور", group: "فاکتور" },
  { key: "invoice_time", label: "ساعت فاکتور", group: "فاکتور" },
  { key: "total", label: "مبلغ کل", group: "فاکتور" },
  { key: "subtotal", label: "جمع جزء", group: "فاکتور" },
  { key: "discount", label: "تخفیف", group: "فاکتور" },
  { key: "tax", label: "مالیات", group: "فاکتور" },
  { key: "paid", label: "پرداخت‌شده", group: "فاکتور" },
  { key: "remain", label: "باقیمانده", group: "فاکتور" },
  { key: "payment_method", label: "روش پرداخت", group: "فاکتور" },
  { key: "sale_status", label: "وضعیت فروش", group: "فاکتور" },
  { key: "items_summary", label: "خلاصه اقلام", group: "فاکتور" },
  { key: "items_count", label: "تعداد اقلام", group: "فاکتور" },
  { key: "currency", label: "واحد پول", group: "فاکتور" },
  { key: "customer_name", label: "نام مشتری", group: "مشتری" },
  { key: "customer_phone", label: "موبایل مشتری", group: "مشتری" },
  { key: "customer_address", label: "آدرس مشتری", group: "مشتری" },
  { key: "customer_code", label: "کد مشتری", group: "مشتری" },
  { key: "seller_name", label: "نام فروشنده", group: "فروشگاه" },
  { key: "seller_phone", label: "موبایل فروشنده", group: "فروشگاه" },
  { key: "store_name", label: "نام فروشگاه", group: "فروشگاه" },
  { key: "branch_name", label: "نام شعبه", group: "فروشگاه" },
  { key: "now", label: "زمان فعلی", group: "عمومی" },
  { key: "app_name", label: "نام نرم‌افزار", group: "عمومی" },
  { key: "code", label: "کد OTP", group: "OTP" },
  { key: "phone", label: "شماره گیرنده", group: "OTP" },
  { key: "expire", label: "انقضای OTP (ثانیه)", group: "OTP" },
];
