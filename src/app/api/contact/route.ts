import { NextRequest, NextResponse } from "next/server";
import { verifyRecaptcha } from "@/lib/marketing/recaptcha";
import { getMarketingContent } from "@/lib/marketing/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    phone?: string;
    email?: string;
    message?: string;
    recaptchaToken?: string;
  };

  const name = (body.name || "").trim();
  const message = (body.message || "").trim();
  const phone = (body.phone || "").trim();
  const email = (body.email || "").trim();

  if (!name || !message) {
    return NextResponse.json(
      { ok: false, error: "نام و پیام الزامی است." },
      { status: 400 },
    );
  }

  const content = await getMarketingContent();
  const captchaOk = await verifyRecaptcha(
    body.recaptchaToken,
    content.recaptchaSecretKey,
  );
  if (!captchaOk) {
    return NextResponse.json(
      { ok: false, error: "تأیید امنیتی ناموفق بود. دوباره تلاش کنید." },
      { status: 400 },
    );
  }

  // Demo/marketing layer: accept and acknowledge. Wire to email/CRM later via env.
  console.info("[marketing-contact]", {
    name,
    phone,
    email,
    message: message.slice(0, 500),
    at: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    message: "درخواست شما ثبت شد. به‌زودی با شما تماس می‌گیریم.",
  });
}
