import { getStore, nextId } from "@/mock/store";
import type { SmsSettings } from "@/mock/types";
import {
  DEFAULT_ADMIN_SALE_TEMPLATE,
  DEFAULT_CUSTOMER_SALE_TEMPLATE,
  DEFAULT_OTP_TEMPLATE,
} from "./templates";

export type SmsSettingsInput = Partial<{
  provider: string;
  melipayamakUsername: string | null;
  melipayamakPassword: string | null;
  melipayamakFrom: string | null;
  melipayamakOtpBodyId: number | null;
  melipayamakCustomerSaleBodyId: number | null;
  melipayamakAdminSaleBodyId: number | null;
  otpTemplate: string | null;
  customerSaleTemplate: string | null;
  adminSaleTemplate: string | null;
  otpMapping: string[];
  customerSaleMapping: string[];
  adminSaleMapping: string[];
  adminPhones: string | null;
  notifyCustomerOnSaleFinalized: boolean;
  notifyAdminOnSaleFinalized: boolean;
  otpLength: number;
  otpExpireSeconds: number;
  otpCooldownSeconds: number;
  otpHourlyLimit: number;
  otpMaxAttempts: number;
  otpLockSeconds: number;
  otpIpHourlyLimit: number;
  varMaxLength: number;
  enabled: boolean;
}>;

const DEFAULTS = {
  provider: "demo",
  otpTemplate: DEFAULT_OTP_TEMPLATE,
  customerSaleTemplate: DEFAULT_CUSTOMER_SALE_TEMPLATE,
  adminSaleTemplate: DEFAULT_ADMIN_SALE_TEMPLATE,
  otpMapping: ["seller_name", "code"] as string[],
  customerSaleMapping: ["customer_name", "store_name", "invoice_number", "total"] as string[],
  adminSaleMapping: [
    "customer_name", "customer_phone", "items_summary", "total",
    "payment_method", "seller_name", "invoice_number",
  ] as string[],
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
};

export function invalidateSmsSettingsCache() { /* no-op */ }

export async function ensureSmsSettingsRow(): Promise<SmsSettings> {
  const store = getStore();
  if (store.smsSettings[0]) return store.smsSettings[0];
  const row: SmsSettings = {
    id: nextId(store, "smsSettings"),
    ...DEFAULTS,
    melipayamakUsername: null,
    melipayamakPassword: null,
    melipayamakFrom: null,
    melipayamakOtpBodyId: null,
    melipayamakCustomerSaleBodyId: null,
    melipayamakAdminSaleBodyId: null,
    adminPhones: null,
    updatedAt: new Date(),
  };
  store.smsSettings.push(row);
  return row;
}

export async function getSmsSettings(): Promise<SmsSettings> {
  return ensureSmsSettingsRow();
}

export async function updateSmsSettings(input: SmsSettingsInput): Promise<SmsSettings> {
  const row = await ensureSmsSettingsRow();
  Object.assign(row, input, { updatedAt: new Date() });
  return row;
}

export function hasMelipayamakCredentials(_row: SmsSettings): boolean {
  return false;
}

export function publicSmsSettings(row: SmsSettings) {
  return {
    provider: row.provider,
    melipayamakFrom: row.melipayamakFrom,
    melipayamakOtpBodyId: row.melipayamakOtpBodyId,
    melipayamakCustomerSaleBodyId: row.melipayamakCustomerSaleBodyId,
    melipayamakAdminSaleBodyId: row.melipayamakAdminSaleBodyId,
    otpTemplate: row.otpTemplate,
    customerSaleTemplate: row.customerSaleTemplate,
    adminSaleTemplate: row.adminSaleTemplate,
    otpMapping: row.otpMapping,
    customerSaleMapping: row.customerSaleMapping,
    adminSaleMapping: row.adminSaleMapping,
    adminPhones: row.adminPhones,
    notifyCustomerOnSaleFinalized: row.notifyCustomerOnSaleFinalized,
    notifyAdminOnSaleFinalized: row.notifyAdminOnSaleFinalized,
    otpLength: row.otpLength,
    otpExpireSeconds: row.otpExpireSeconds,
    otpCooldownSeconds: row.otpCooldownSeconds,
    otpHourlyLimit: row.otpHourlyLimit,
    otpMaxAttempts: row.otpMaxAttempts,
    otpLockSeconds: row.otpLockSeconds,
    otpIpHourlyLimit: row.otpIpHourlyLimit,
    varMaxLength: row.varMaxLength,
    enabled: row.enabled,
    hasCredentials: false,
    demoMode: true,
  };
}
