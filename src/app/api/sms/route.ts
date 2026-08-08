import { getCurrentUser, isManager } from "@/mock/auth-helpers";
import { ensureSeeded, getStore, nextId } from "@/mock";
import { isValidIranMobile, normalizePhone } from "@/lib/phone";
import { hasPermission } from "@/lib/permissions";
import type { SmsMessage } from "@/mock/types";

export const dynamic = "force-dynamic";

type SmsType = "campaign" | "sale" | "otp" | "test";

function mockSendSms(opts: {
  store: ReturnType<typeof getStore>;
  phone: string;
  message: string;
  type: SmsType;
  campaignName?: string | null;
  customerName?: string | null;
  sentBy?: number | null;
  invoiceId?: number | null;
}): SmsMessage {
  const row: SmsMessage = {
    id: nextId(opts.store, "smsMessages"),
    type: opts.type,
    campaignName: opts.campaignName ?? null,
    phone: opts.phone,
    customerName: opts.customerName ?? null,
    message: opts.message,
    status: "sent",
    invoiceId: opts.invoiceId ?? null,
    sentBy: opts.sentBy ?? null,
    providerRef: `mock-${Date.now().toString(36)}`,
    errorDetail: null,
    createdAt: new Date(),
  };
  opts.store.smsMessages.unshift(row);
  return row;
}

export async function GET(req: Request) {
  try {
    ensureSeeded();
    const me = getCurrentUser(req);
    if (!me) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(me, "sms") && !isManager(me)) {
      return Response.json({ ok: false, error: "دسترسی مجاز نیست" }, { status: 403 });
    }

    const store = getStore();
    const url = new URL(req.url);
    if (url.searchParams.get("customers") === "1") {
      const map = new Map<string, { phone: string; name: string | null }>();
      for (const inv of [...store.invoices].sort((a, b) => b.id - a.id).slice(0, 1000)) {
        if (!inv.customerPhone || map.has(inv.customerPhone)) continue;
        map.set(inv.customerPhone, { phone: inv.customerPhone, name: inv.customerName ?? null });
      }
      return Response.json({ ok: true, customers: Array.from(map.values()) });
    }

    const history = [...store.smsMessages].sort((a, b) => b.id - a.id).slice(0, 300);
    return Response.json({ ok: true, messages: history });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    ensureSeeded();
    const me = getCurrentUser(req);
    if (!me) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(me, "sms") && !isManager(me)) {
      return Response.json({ ok: false, error: "دسترسی مجاز نیست" }, { status: 403 });
    }

    const store = getStore();
    const body = await req.json();
    const type = (body.type ?? "campaign") as SmsType;
    const message = String(body.message ?? "").trim();
    const campaignName = String(body.campaignName ?? "").trim() || null;

    if (!message) return Response.json({ ok: false, error: "متن پیام الزامی است" }, { status: 400 });

    if (body.phone) {
      const phone = normalizePhone(String(body.phone));
      if (!isValidIranMobile(phone)) {
        return Response.json({ ok: false, error: "شماره موبایل نامعتبر است" }, { status: 400 });
      }
      const row = mockSendSms({
        store,
        phone,
        message,
        type,
        campaignName,
        customerName: body.customerName,
        sentBy: me.id,
      });
      return Response.json({ ok: true, message: row });
    }

    const recipients = Array.isArray(body.recipients)
      ? body.recipients as { phone: string; customerName?: string }[]
      : [];
    if (!recipients.length) {
      return Response.json({ ok: false, error: "حداقل یک گیرنده لازم است" }, { status: 400 });
    }

    const results = recipients.map((r) => {
      const phone = normalizePhone(String(r.phone));
      if (!isValidIranMobile(phone)) {
        return { ok: false as const, phone: r.phone, error: "شماره نامعتبر" };
      }
      mockSendSms({
        store,
        phone,
        message,
        type,
        campaignName,
        customerName: r.customerName,
        sentBy: me.id,
      });
      return { ok: true as const, phone };
    });

    const sent = results.filter((r) => r.ok).length;
    return Response.json({ ok: true, results, sent, failed: results.length - sent });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 400 });
  }
}
