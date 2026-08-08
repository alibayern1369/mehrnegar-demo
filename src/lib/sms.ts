/**
 * SMS facade — demo mode: all messages stored locally, no real dispatch.
 */
import { getStore, nextId } from "@/mock/store";
import { isValidIranMobile, normalizePhone } from "@/lib/phone";
import { DEFAULT_CUSTOMER_SALE_TEMPLATE, renderTemplate } from "./sms/templates";
import { toman } from "@/lib/format";

export type SmsType = "sale" | "campaign" | "promo" | "announcement" | "otp" | "admin_sale";

type SendOpts = {
  phone: string;
  message: string;
  type?: SmsType;
  campaignName?: string;
  customerName?: string | null;
  invoiceId?: number | null;
  sentBy?: number | null;
};

export { isValidIranMobile, normalizePhone } from "@/lib/phone";
export { notifySaleFinalized } from "./sms/sale-sms";
export { getSmsSettings, updateSmsSettings, publicSmsSettings } from "./sms/settings";
export {
  VARIABLE_HELP,
  DEFAULT_OTP_TEMPLATE,
  DEFAULT_CUSTOMER_SALE_TEMPLATE,
  DEFAULT_ADMIN_SALE_TEMPLATE,
  renderTemplate,
  buildSaleVars,
} from "./sms/templates";

export function saleSmsTemplate(opts: {
  customerName?: string | null;
  invoiceNumber: string;
  grandTotal: number;
}): string {
  const name = opts.customerName?.trim() || "مشتری گرامی";
  return renderTemplate(DEFAULT_CUSTOMER_SALE_TEMPLATE, {
    customer_name: name,
    store_name: "مهرنگار",
    invoice_number: opts.invoiceNumber,
    total: toman(opts.grandTotal),
  });
}

export async function sendSms(opts: SendOpts) {
  const phone = normalizePhone(opts.phone);
  if (!isValidIranMobile(phone)) {
    throw new Error("شماره موبایل نامعتبر است");
  }

  const store = getStore();
  const row = {
    id: nextId(store, "smsMessages"),
    type: opts.type ?? "campaign",
    campaignName: opts.campaignName ?? null,
    phone,
    customerName: opts.customerName ?? null,
    message: opts.message,
    status: "sent" as const,
    invoiceId: opts.invoiceId ?? null,
    sentBy: opts.sentBy ?? null,
    providerRef: "demo-mock",
    errorDetail: null,
    createdAt: new Date(),
  };
  store.smsMessages.push(row);
  return { ok: true, id: row.id, providerRef: "demo-mock" };
}
