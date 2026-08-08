/** Section access keys stored in users.permissions */

export const APP_PERMISSIONS = [
  { id: "create_product", label: "ثبت محصول", page: "create" },
  { id: "view_product", label: "دیدن محصول (بدون تغییر موجودی)", page: "products" },
  { id: "edit_product", label: "ویرایش محصول و موجودی (+/−)", page: "products" },
  { id: "delete_product", label: "حذف محصول", page: "products" },
  { id: "sell", label: "فروش محصول", page: "sell" },
  { id: "edit_order", label: "ویرایش فاکتور", page: "edit-order" },
  { id: "return", label: "مرجوعی", page: "return" },
  { id: "barcode_tracking", label: "رهگیری بارکد", page: "barcode-tracking" },
  { id: "warehouses", label: "انبارها", page: "warehouses" },
  { id: "stocktake", label: "انبارگردانی", page: "stocktake" },
  { id: "reprint_invoice", label: "چاپ مجدد فاکتور", page: "reprint" },
  { id: "customers", label: "مشتریان", page: "customers" },
  { id: "report_financial", label: "گزارش مالی", page: "reports" },
  { id: "report_sales", label: "گزارش فروش (همه)", page: "reports" },
  { id: "report_returns", label: "گزارش مرجوعی", page: "reports" },
  { id: "report_ledger", label: "دفتر موجودی", page: "reports" },
  { id: "report_stock", label: "موجودی فعلی", page: "reports" },
  { id: "report_transfers", label: "تاریخچه توزیع", page: "reports" },
  { id: "report_my_sales", label: "گزارش فروش شخصی", page: "reports" },
  { id: "report_advanced", label: "گزارش‌گیری پیشرفته", page: "reports" },
  { id: "report_audit", label: "لاگ سیستم", page: "reports" },
  { id: "my_activity", label: "فعالیت‌های من", page: "my-activity" },
  { id: "sms", label: "پیامک", page: "sms" },
  { id: "users", label: "مدیریت کاربران", page: "users" },
  { id: "settings", label: "تنظیمات", page: "settings" },
] as const;

export type AppPermissionId = (typeof APP_PERMISSIONS)[number]["id"];

export const REPORT_PERMISSIONS: AppPermissionId[] = [
  "report_financial",
  "report_sales",
  "report_returns",
  "report_ledger",
  "report_stock",
  "report_transfers",
  "report_my_sales",
  "report_advanced",
  "report_audit",
];

export const PRODUCT_PAGE_PERMISSIONS: AppPermissionId[] = [
  "view_product",
  "edit_product",
  "delete_product",
];

/** Legacy keys expanded when loading older user records */
const LEGACY_EXPAND: Record<string, AppPermissionId[]> = {
  reports: ["report_sales", "report_returns", "report_ledger", "report_stock", "report_transfers"],
  financial_reports: ["report_financial"],
  view_own: ["report_my_sales"],
  // older "محصولات" tab access meant edit; also grant view
  products: ["view_product", "edit_product"],
};

export const DEFAULT_USER_PERMISSIONS: AppPermissionId[] = [
  "create_product",
  "view_product",
  "edit_product",
  "sell",
  "edit_order",
  "return",
  "report_my_sales",
  "my_activity",
];

export const ALL_PERMISSION_IDS: AppPermissionId[] = APP_PERMISSIONS.map((p) => p.id);

const VALID = new Set<string>(ALL_PERMISSION_IDS);

export function isValidPermission(id: string): id is AppPermissionId {
  return VALID.has(id);
}

export function sanitizePermissions(list: unknown): AppPermissionId[] {
  if (!Array.isArray(list)) return [];
  const out = new Set<AppPermissionId>();
  for (const raw of list.map(String)) {
    if (isValidPermission(raw)) out.add(raw);
    else if (LEGACY_EXPAND[raw]) LEGACY_EXPAND[raw].forEach((p) => out.add(p));
  }
  // Anyone with edit/delete historically could open the products list
  if (out.has("edit_product") || out.has("delete_product")) out.add("view_product");
  return [...out];
}

export function hasPermission(
  user: { role?: string; permissions?: string[] | null } | null | undefined,
  perm: AppPermissionId | string,
): boolean {
  if (!user) return false;
  if (user.role === "manager") return true;
  const perms = user.permissions ?? [];
  if (perms.includes("all")) return true;
  // Expand legacy keys so stored ["products"] still maps correctly
  const expanded = new Set(sanitizePermissions(perms));
  if (expanded.has(perm as AppPermissionId)) return true;
  if (perms.includes(perm)) return true;
  // view is implied by edit/delete (also handled in sanitize, kept for raw arrays)
  if (perm === "view_product" && (perms.includes("edit_product") || perms.includes("delete_product"))) {
    return true;
  }
  // legacy aliases still stored on some sessions
  if (perm === "report_financial" && perms.includes("financial_reports")) return true;
  if (
    REPORT_PERMISSIONS.includes(perm as AppPermissionId) &&
    perm !== "report_financial" &&
    perm !== "report_my_sales" &&
    perm !== "report_advanced" &&
    perm !== "report_audit" &&
    perms.includes("reports")
  ) {
    return true;
  }
  if (perm === "report_my_sales" && (perms.includes("view_own") || perms.includes("reports"))) return true;
  // my_activity was always visible for sellers before it became a permission key
  if (perm === "my_activity") {
    const hasNewKeys = perms.some((p) =>
      p === "my_activity" || p === "sms" || p === "users" || p === "report_advanced" || p === "report_audit",
    );
    if (!hasNewKeys && (perms.includes("sell") || perms.includes("report_my_sales") || perms.includes("view_own"))) {
      return true;
    }
  }
  return false;
}

export function hasAnyReportPermission(
  user: { role?: string; permissions?: string[] | null } | null | undefined,
): boolean {
  if (!user) return false;
  if (user.role === "manager") return true;
  return REPORT_PERMISSIONS.some((p) => hasPermission(user, p));
}

export function hasAnyProductPagePermission(
  user: { role?: string; permissions?: string[] | null } | null | undefined,
): boolean {
  if (!user) return false;
  if (user.role === "manager") return true;
  return PRODUCT_PAGE_PERMISSIONS.some((p) => hasPermission(user, p));
}

/** Map Shell page id → required permission (undefined = always allowed) */
export const PAGE_PERMISSION: Record<string, AppPermissionId | undefined> = {
  overview: undefined,
  "my-activity": "my_activity",
  create: "create_product",
  products: "view_product", // also allow edit/delete via hasPermission(view) implication + Shell check
  sell: "sell",
  "edit-order": "edit_order",
  return: "return",
  "barcode-tracking": "barcode_tracking",
  warehouses: "warehouses",
  stocktake: "stocktake",
  reprint: "reprint_invoice",
  customers: "customers",
  reports: undefined, // gated via hasAnyReportPermission in Shell
  settings: "settings",
  users: "users",
  sms: "sms",
};
