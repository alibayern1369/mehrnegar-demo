import { getCurrentUser } from "@/mock/auth-helpers";
import { ensureSeeded, getStore } from "@/mock";
import { publicSmsSettings, type SmsSettingsInput } from "@/lib/sms/settings";
import { VARIABLE_HELP, DEFAULT_OTP_TEMPLATE, buildOtpVars } from "@/lib/sms/templates";
import { isValidIranMobile, normalizePhone } from "@/lib/phone";
import { hasPermission } from "@/lib/permissions";
import { MelipayamakClient } from "@/lib/sms/melipayamak";
import { nextId } from "@/mock/store";

export const dynamic = "force-dynamic";

function canSms(me: { role?: string; permissions?: string[] | null }) {
  return hasPermission(me, "sms") || me.role === "manager";
}

function getSmsSettingsRow(store: ReturnType<typeof getStore>) {
  if (!store.smsSettings[0]) {
    throw new Error("تنظیمات پیامک یافت نشد");
  }
  return store.smsSettings[0];
}

export async function GET(req: Request) {
  try {
    ensureSeeded();
    const me = getCurrentUser(req);
    if (!me || !canSms(me)) {
      return Response.json({ ok: false, error: "دسترسی مجاز نیست" }, { status: 403 });
    }

    const settings = getSmsSettingsRow(getStore());
    return Response.json({
      ok: true,
      settings: publicSmsSettings(settings),
      variables: VARIABLE_HELP,
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    ensureSeeded();
    const me = getCurrentUser(req);
    if (!me || !canSms(me)) {
      return Response.json({ ok: false, error: "دسترسی مجاز نیست" }, { status: 403 });
    }

    const store = getStore();
    const current = getSmsSettingsRow(store);
    const body = await req.json() as SmsSettingsInput & { melipayamakPassword?: string | null };
    const patch: SmsSettingsInput = { ...body };

    if (patch.melipayamakPassword === "********" || patch.melipayamakPassword === "") {
      delete patch.melipayamakPassword;
    }

    const numKeys = [
      "melipayamakOtpBodyId",
      "melipayamakCustomerSaleBodyId",
      "melipayamakAdminSaleBodyId",
      "otpLength",
      "otpExpireSeconds",
      "otpCooldownSeconds",
      "otpHourlyLimit",
      "otpMaxAttempts",
      "otpLockSeconds",
      "otpIpHourlyLimit",
      "varMaxLength",
    ] as const;
    for (const k of numKeys) {
      if (patch[k] !== undefined && patch[k] !== null && patch[k] !== ("" as unknown)) {
        const n = Number(patch[k]);
        (patch as Record<string, unknown>)[k] = Number.isFinite(n) ? n : null;
      }
    }

    Object.assign(current, patch, { updatedAt: new Date() });
    return Response.json({ ok: true, settings: publicSmsSettings(current) });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    ensureSeeded();
    const me = getCurrentUser(req);
    if (!me || !canSms(me)) {
      return Response.json({ ok: false, error: "دسترسی مجاز نیست" }, { status: 403 });
    }

    const store = getStore();
    const settings = getSmsSettingsRow(store);
    const body = await req.json();
    const phone = normalizePhone(String(body.phone ?? ""));
    if (!isValidIranMobile(phone)) {
      return Response.json({ ok: false, error: "شماره موبایل نامعتبر است" }, { status: 400 });
    }

    const mode = String(body.mode ?? "auto");
    let messagePreview = String(body.message ?? "پیامک تست مهرنگار — اتصال mock موفق بود.");
    if (mode === "otp" || (mode === "auto" && Number(settings.melipayamakOtpBodyId ?? 0) > 0)) {
      const vars = buildOtpVars({ sellerName: "تست", code: "12345", phone, expireSeconds: 120 });
      messagePreview = (settings.otpTemplate || DEFAULT_OTP_TEMPLATE)
        .replace("{seller_name}", vars.seller_name ?? "تست")
        .replace("{code}", vars.code ?? "12345");
    }

    const msgId = nextId(store, "smsMessages");
    store.smsMessages.unshift({
      id: msgId,
      type: "test",
      campaignName: null,
      phone,
      customerName: null,
      message: messagePreview,
      status: "sent",
      invoiceId: null,
      sentBy: me.id,
      providerRef: `mock-test-${msgId}`,
      errorDetail: null,
      createdAt: new Date(),
    });

    return Response.json({
      ok: true,
      channel: "mock",
      providerRef: `mock-test-${msgId}`,
      messagePreview,
      demoCode: mode === "otp" ? "12345" : undefined,
      outboundIp: null,
      provider: MelipayamakClient.id,
      hint: "در نسخه دمو پیامک واقعی ارسال نمی‌شود — پیام در تاریخچه mock ذخیره شد.",
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
