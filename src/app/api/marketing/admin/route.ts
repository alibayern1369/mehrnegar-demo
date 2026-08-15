import { NextRequest, NextResponse } from "next/server";
import {
  adminCookieHeader,
  clearAdminCookieHeader,
  createAdminToken,
  getAdminCookieName,
  setAdminPassword,
  verifyAdminPassword,
  verifyAdminToken,
} from "@/lib/marketing/auth";
import {
  getMarketingContent,
  publicMarketingContent,
  saveMarketingContent,
} from "@/lib/marketing/store";
import type { MarketingContent } from "@/lib/marketing/types";

export const dynamic = "force-dynamic";

function getToken(req: NextRequest) {
  return req.cookies.get(getAdminCookieName())?.value;
}

export async function GET(req: NextRequest) {
  if (!verifyAdminToken(getToken(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const content = await getMarketingContent();
  return NextResponse.json({
    ok: true,
    content: {
      ...publicMarketingContent(content),
      recaptchaSecretKey: content.recaptchaSecretKey ? "••••••••" : "",
      hasRecaptchaSecret: Boolean(content.recaptchaSecretKey),
    },
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    password?: string;
    currentPassword?: string;
    newPassword?: string;
    content?: Partial<MarketingContent>;
  };

  if (body.action === "login") {
    if (!(await verifyAdminPassword(body.password || ""))) {
      return NextResponse.json({ ok: false, error: "invalid_password" }, { status: 401 });
    }
    const token = createAdminToken();
    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", adminCookieHeader(token));
    return res;
  }

  if (body.action === "logout") {
    const res = NextResponse.json({ ok: true });
    res.headers.set("Set-Cookie", clearAdminCookieHeader());
    return res;
  }

  if (!verifyAdminToken(getToken(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  if (body.action === "change-password") {
    const current = body.currentPassword || "";
    const next = (body.newPassword || "").trim();
    if (!(await verifyAdminPassword(current))) {
      return NextResponse.json({ ok: false, error: "invalid_password" }, { status: 401 });
    }
    if (next.length < 8) {
      return NextResponse.json({ ok: false, error: "weak_password" }, { status: 400 });
    }
    if (next === current) {
      return NextResponse.json({ ok: false, error: "same_password" }, { status: 400 });
    }
    try {
      await setAdminPassword(next);
    } catch {
      return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "save" && body.content) {
    const patch = { ...body.content };
    if (patch.recaptchaSecretKey === "••••••••") {
      delete patch.recaptchaSecretKey;
    }
    const saved = await saveMarketingContent(patch);
    return NextResponse.json({
      ok: true,
      content: {
        ...publicMarketingContent(saved),
        recaptchaSecretKey: saved.recaptchaSecretKey ? "••••••••" : "",
        hasRecaptchaSecret: Boolean(saved.recaptchaSecretKey),
      },
    });
  }

  return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
}
