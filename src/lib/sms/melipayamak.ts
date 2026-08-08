import { isMelipayamakSuccess, melipayamakErrorMessage } from "./errors";
import { registerSmsProvider, type SmsProvider, type SmsSendResult } from "./provider";

const SOAP_URL = "https://api.payamak-panel.com/post/Send.asmx";
const FORM_BASE_URL = "https://api.payamak-panel.com/post/Send.asmx/SendByBaseNumber2";
const REST_OTP_URL = "https://rest.payamak-panel.com/api/SendSMS/SendOtp";
const REST_SMS_URL = "https://rest.payamak-panel.com/api/SendSMS/SendSMS";
const FETCH_TIMEOUT_MS = 15_000;

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractSoapResult(xml: string, tags: string[]): string | null {
  for (const tag of tags) {
    const re = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i");
    const m = xml.match(re);
    if (m) return m[1].trim();
  }
  return null;
}

function parseProviderPayload(rawText: string): { value: unknown; strStatus?: string } {
  const trimmed = rawText.trim();
  try {
    const json = JSON.parse(trimmed) as {
      Value?: unknown;
      RetStatus?: unknown;
      StrRetStatus?: string;
    };
    return {
      value: json.Value ?? json.RetStatus ?? trimmed,
      strStatus: json.StrRetStatus,
    };
  } catch {
    // form / SOAP often returns plain number or tiny XML
    const soap = extractSoapResult(trimmed, [
      "SendByBaseNumber2Result",
      "SendByBaseNumberResult",
      "string",
    ]);
    return { value: soap ?? trimmed };
  }
}

function toResult(value: unknown, raw: unknown, fallbackLabel: string): SmsSendResult {
  if (isMelipayamakSuccess(value)) {
    return { ok: true, providerRef: String(value), raw };
  }
  const code = Number(value);
  return {
    ok: false,
    error: Number.isFinite(code) ? melipayamakErrorMessage(code) : `${fallbackLabel}: ${String(value).slice(0, 200)}`,
    providerRef: value != null ? String(value) : undefined,
    raw,
  };
}

/** Preferred path: simple HTTPS form POST (more reliable than SOAP XML in Node fetch). */
async function sendByBaseNumberForm(opts: {
  username: string;
  password: string;
  text: string[];
  to: string;
  bodyId: number;
}): Promise<SmsSendResult> {
  try {
    const body = new URLSearchParams({
      username: opts.username,
      password: opts.password,
      text: opts.text.join(";"),
      to: opts.to,
      bodyId: String(opts.bodyId),
    });
    const res = await fetch(FORM_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" },
      body,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const rawText = await res.text();
    const parsed = parseProviderPayload(rawText);
    if (!isMelipayamakSuccess(parsed.value) && parsed.strStatus) {
      return { ok: false, error: parsed.strStatus, raw: rawText };
    }
    return toResult(parsed.value, rawText, "خطای SendByBaseNumber2");
  } catch (e) {
    return { ok: false, error: `خطا در اتصال SendByBaseNumber2: ${String(e)}` };
  }
}

async function sendByBaseNumberSoap(opts: {
  username: string;
  password: string;
  text: string[];
  to: string;
  bodyId: number;
}): Promise<SmsSendResult> {
  const textItems = opts.text.map((t) => `<string>${xmlEscape(t)}</string>`).join("");
  const body = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <SendByBaseNumber xmlns="http://tempuri.org/">
      <username>${xmlEscape(opts.username)}</username>
      <password>${xmlEscape(opts.password)}</password>
      <text>${textItems}</text>
      <to>${xmlEscape(opts.to)}</to>
      <bodyId>${opts.bodyId}</bodyId>
    </SendByBaseNumber>
  </soap:Body>
</soap:Envelope>`;

  try {
    const res = await fetch(SOAP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: "http://tempuri.org/SendByBaseNumber",
      },
      body,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const xml = await res.text();
    const value = extractSoapResult(xml, ["SendByBaseNumberResult", "SendByBaseNumber2Result"]);
    if (value == null) {
      return { ok: false, error: "پاسخ SOAP ملی‌پیامک قابل خواندن نیست", raw: xml.slice(0, 500) };
    }
    return toResult(value, value, "خطای SOAP");
  } catch (e) {
    return { ok: false, error: `خطا در اتصال SOAP ملی‌پیامک: ${String(e)}` };
  }
}

async function sendByBaseNumber(opts: {
  username: string;
  password: string;
  text: string[];
  to: string;
  bodyId: number;
}): Promise<SmsSendResult> {
  const primary = await sendByBaseNumberForm(opts);
  if (primary.ok) return primary;
  // Fallback to classic SOAP if form endpoint is blocked / changed
  const secondary = await sendByBaseNumberSoap(opts);
  if (secondary.ok) return secondary;
  return {
    ok: false,
    error: primary.error || secondary.error || "ارسال الگویی ناموفق بود",
    raw: { form: primary.raw, soap: secondary.raw },
  };
}

async function sendOtpRest(opts: {
  username: string;
  password: string;
  to: string;
  from: string;
  code: string;
}): Promise<SmsSendResult> {
  try {
    const body = new URLSearchParams({
      username: opts.username,
      password: opts.password,
      to: opts.to,
      from: opts.from,
      code: opts.code,
    });
    const res = await fetch(REST_OTP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const text = await res.text();
    const parsed = parseProviderPayload(text);
    if (!isMelipayamakSuccess(parsed.value) && parsed.strStatus) {
      return { ok: false, error: parsed.strStatus, raw: text };
    }
    return toResult(parsed.value, parsed.value, "خطای SendOtp");
  } catch (e) {
    return { ok: false, error: `خطا در اتصال SendOtp: ${String(e)}` };
  }
}

async function sendSmsRest(opts: {
  username: string;
  password: string;
  to: string;
  from: string;
  text: string;
  isFlash?: boolean;
}): Promise<SmsSendResult> {
  try {
    const res = await fetch(REST_SMS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: opts.username,
        password: opts.password,
        to: opts.to,
        from: opts.from,
        text: opts.text,
        isFlash: opts.isFlash ?? false,
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const rawText = await res.text();
    const parsed = parseProviderPayload(rawText);
    if (!isMelipayamakSuccess(parsed.value) && parsed.strStatus) {
      return { ok: false, error: parsed.strStatus, raw: rawText };
    }
    return toResult(parsed.value, parsed.value, "خطای SendSMS");
  } catch (e) {
    return { ok: false, error: `خطا در اتصال SendSMS: ${String(e)}` };
  }
}

export const MelipayamakClient: SmsProvider = {
  id: "melipayamak",
  sendByBaseNumber,
  sendOtp: sendOtpRest,
  sendSms: sendSmsRest,
};

registerSmsProvider(MelipayamakClient);

export { sendByBaseNumber, sendOtpRest as sendOtp, sendSmsRest as sendSms };
