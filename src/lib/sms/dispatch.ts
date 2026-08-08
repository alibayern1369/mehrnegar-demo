import "@/lib/sms/melipayamak";
import type { SmsSettings } from "@/mock/types";
import { isDemoMode } from "@/lib/demo";
import { getSmsProvider, type SmsSendResult } from "./provider";
import { hasMelipayamakCredentials } from "./settings";
import {
  buildOtpVars,
  DEFAULT_OTP_TEMPLATE,
  mapVarsToTextArray,
  renderTemplate,
  type SmsVarMap,
} from "./templates";

export type DispatchKind = "otp" | "customer_sale" | "admin_sale" | "free";

function providerOrDemo(settings: SmsSettings) {
  if (isDemoMode()) {
    return { provider: null, creds: false };
  }
  const provider = getSmsProvider(settings.provider || "melipayamak");
  const creds = hasMelipayamakCredentials(settings);
  return { provider, creds };
}

/** Demo mode when credentials missing — pretends success so local/dev works */
function demoResult(label: string): SmsSendResult {
  return { ok: true, providerRef: `demo-${label}-${Date.now()}` };
}

export async function dispatchPatternSms(opts: {
  settings: SmsSettings;
  to: string;
  bodyId: number | null | undefined;
  mapping: string[] | null | undefined;
  vars: SmsVarMap;
  fallbackTemplate: string;
}): Promise<SmsSendResult & { channel: string; messagePreview: string }> {
  const maxLen = opts.settings.varMaxLength ?? 200;
  const { provider, creds } = providerOrDemo(opts.settings);
  const preview = renderTemplate(opts.fallbackTemplate, opts.vars, maxLen);

  if (!creds || !provider) {
    return { ...demoResult("pattern"), channel: "demo", messagePreview: preview };
  }

  const bodyId = Number(opts.bodyId ?? 0);
  if (bodyId > 0) {
    const text = mapVarsToTextArray(opts.mapping, opts.vars, maxLen);
    const r = await provider.sendByBaseNumber({
      username: opts.settings.melipayamakUsername!,
      password: opts.settings.melipayamakPassword!,
      text,
      to: opts.to,
      bodyId,
    });
    return { ...r, channel: "SendByBaseNumber", messagePreview: text.join(" | ") };
  }

  const from = opts.settings.melipayamakFrom?.trim();
  if (!from) {
    return {
      ok: false,
      error: "برای ارسال متن آزاد، شماره خط فرستنده (from) را تنظیم کنید یا bodyId الگو را وارد کنید",
      channel: "none",
      messagePreview: preview,
    };
  }

  const r = await provider.sendSms({
    username: opts.settings.melipayamakUsername!,
    password: opts.settings.melipayamakPassword!,
    to: opts.to,
    from,
    text: preview,
  });
  return { ...r, channel: "SendSMS", messagePreview: preview };
}

export async function dispatchOtpSms(opts: {
  settings: SmsSettings;
  to: string;
  sellerName: string;
  code: string;
}): Promise<SmsSendResult & { channel: string; messagePreview: string; demoCode?: string }> {
  const maxLen = opts.settings.varMaxLength ?? 200;
  const vars = buildOtpVars({
    sellerName: opts.sellerName,
    code: opts.code,
    phone: opts.to,
    expireSeconds: opts.settings.otpExpireSeconds ?? 120,
  }, maxLen);
  const template = opts.settings.otpTemplate?.trim() || DEFAULT_OTP_TEMPLATE;
  const preview = renderTemplate(template, vars, maxLen);
  const { provider, creds } = providerOrDemo(opts.settings);

  if (!creds || !provider) {
    return { ...demoResult("otp"), channel: "demo", messagePreview: preview, demoCode: opts.code };
  }

  const bodyId = Number(opts.settings.melipayamakOtpBodyId ?? 0);
  if (bodyId > 0) {
    const mapping = opts.settings.otpMapping?.length
      ? opts.settings.otpMapping
      : ["seller_name", "code"];
    const text = mapVarsToTextArray(mapping, vars, maxLen);
    const r = await provider.sendByBaseNumber({
      username: opts.settings.melipayamakUsername!,
      password: opts.settings.melipayamakPassword!,
      text,
      to: opts.to,
      bodyId,
    });
    return { ...r, channel: "SendByBaseNumber", messagePreview: text.join(" | ") };
  }

  const from = opts.settings.melipayamakFrom?.trim();
  if (from) {
    const r = await provider.sendOtp({
      username: opts.settings.melipayamakUsername!,
      password: opts.settings.melipayamakPassword!,
      to: opts.to,
      from,
      code: opts.code,
    });
    return { ...r, channel: "SendOtp", messagePreview: preview };
  }

  // last resort free text — still needs from
  return {
    ok: false,
    error: "برای OTP یا bodyId الگو را وارد کنید یا شماره خط (from) را برای SendOtp تنظیم کنید",
    channel: "none",
    messagePreview: preview,
  };
}

export async function dispatchFreeSms(opts: {
  settings: SmsSettings;
  to: string;
  text: string;
}): Promise<SmsSendResult & { channel: string }> {
  const { provider, creds } = providerOrDemo(opts.settings);
  if (!creds || !provider) {
    return { ...demoResult("free"), channel: "demo" };
  }
  const from = opts.settings.melipayamakFrom?.trim();
  if (!from) {
    return { ok: false, error: "شماره خط فرستنده (from) تنظیم نشده است", channel: "none" };
  }
  const r = await provider.sendSms({
    username: opts.settings.melipayamakUsername!,
    password: opts.settings.melipayamakPassword!,
    to: opts.to,
    from,
    text: opts.text,
  });
  return { ...r, channel: "SendSMS" };
}
