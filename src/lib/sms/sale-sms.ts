import { getStore, nextId } from "@/mock/store";
import { isValidIranMobile, normalizePhone, parsePhoneList } from "@/lib/phone";
import { SALES_METHODS } from "@/lib/sales-methods";
import { getSmsSettings } from "./settings";
import {
  buildSaleVars,
  DEFAULT_ADMIN_SALE_TEMPLATE,
  DEFAULT_CUSTOMER_SALE_TEMPLATE,
  renderTemplate,
} from "./templates";

function methodLabel(id: string | null | undefined): string {
  const m = SALES_METHODS.find((x) => x.id === id);
  return m?.label ?? id ?? "عادی";
}

export type SaleSmsResult = {
  customerSent: boolean;
  adminSent: boolean;
  skippedReason?: string;
  errors: string[];
};

export async function notifySaleFinalized(opts: {
  invoiceId: number;
  sentBy?: number | null;
}): Promise<SaleSmsResult> {
  const settings = await getSmsSettings();
  const errors: string[] = [];
  let customerSent = false;
  let adminSent = false;

  if (!settings.enabled) {
    return {
      customerSent: false,
      adminSent: false,
      skippedReason: "سامانه پیامک غیرفعال است",
      errors: ["سامانه پیامک غیرفعال است"],
    };
  }

  const store = getStore();
  const invoice = store.invoices.find((i) => i.id === opts.invoiceId);
  if (!invoice) {
    return { customerSent: false, adminSent: false, skippedReason: "فاکتور یافت نشد", errors };
  }

  const items = store.invoiceItems.filter((it) => it.invoiceId === invoice.id);
  const seller = invoice.soldBy ? store.users.find((u) => u.id === invoice.soldBy) : null;
  const wh = invoice.warehouseId ? store.warehouses.find((w) => w.id === invoice.warehouseId) : null;
  const biz = store.invoiceSettings[0];

  const storeName =
    (invoice.businessSnapshot as Record<string, string> | null)?.businessName
    || biz?.businessName
    || "مهرنگار";

  const vars = buildSaleVars({
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.createdAt,
    status: invoice.status,
    subtotal: invoice.subtotal,
    discount: invoice.totalDiscount,
    tax: invoice.totalTax,
    grandTotal: invoice.grandTotal,
    paid: invoice.grandTotal,
    paymentMethod: methodLabel(invoice.salesMethod),
    customerName: invoice.customerName,
    customerPhone: invoice.customerPhone,
    sellerName: seller?.name,
    sellerPhone: seller?.phone,
    storeName,
    branchName: wh?.name,
    items: items.map((it) => ({
      productName: it.productName,
      quantity: it.quantity ?? 1,
      color: it.color,
      size: it.size,
    })),
  }, settings.varMaxLength ?? 200);

  const template = settings.customerSaleTemplate?.trim() || DEFAULT_CUSTOMER_SALE_TEMPLATE;
  const messagePreview = renderTemplate(template, vars);

  if (settings.notifyCustomerOnSaleFinalized && !invoice.customerSmsSentAt) {
    const phone = invoice.customerPhone ? normalizePhone(invoice.customerPhone) : "";
    if (isValidIranMobile(phone)) {
      store.smsMessages.push({
        id: nextId(store, "smsMessages"),
        type: "sale",
        campaignName: null,
        phone,
        customerName: invoice.customerName,
        message: messagePreview,
        status: "sent",
        invoiceId: invoice.id,
        sentBy: opts.sentBy ?? invoice.soldBy,
        providerRef: "demo-mock",
        errorDetail: null,
        createdAt: new Date(),
      });
      invoice.customerSmsSentAt = new Date();
      invoice.lastSmsError = null;
      customerSent = true;
    } else {
      errors.push("موبایل مشتری خالی یا نامعتبر است");
      invoice.lastSmsError = errors[0];
    }
  }

  if (settings.notifyAdminOnSaleFinalized && !invoice.adminSmsSentAt) {
    const phones = parsePhoneList(settings.adminPhones);
    for (const adminPhone of phones) {
      const adminMsg = renderTemplate(
        settings.adminSaleTemplate?.trim() || DEFAULT_ADMIN_SALE_TEMPLATE,
        vars,
      );
      store.smsMessages.push({
        id: nextId(store, "smsMessages"),
        type: "admin_sale",
        campaignName: null,
        phone: adminPhone,
        customerName: invoice.customerName,
        message: adminMsg,
        status: "sent",
        invoiceId: invoice.id,
        sentBy: opts.sentBy ?? invoice.soldBy,
        providerRef: "demo-mock",
        errorDetail: null,
        createdAt: new Date(),
      });
    }
    if (phones.length) {
      invoice.adminSmsSentAt = new Date();
      adminSent = true;
    }
  }

  return { customerSent, adminSent, errors };
}
