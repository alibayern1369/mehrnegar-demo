import { hashPassword, verifyPassword } from "@/mock/auth-helpers";
import { ensureSeeded, getStore, nextId } from "@/mock";
import { isValidIranMobile, normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

const DEMO_CODE = "12345";

function findUserByIdentifier(identifier: string) {
  const raw = identifier.trim();
  const asPhone = normalizePhone(raw);
  const store = getStore();

  if (isValidIranMobile(asPhone)) {
    const byPhone = store.users.find((u) => u.phone && normalizePhone(u.phone) === asPhone);
    if (byPhone) return byPhone;
  }

  return store.users.find((u) => u.username === raw.toLowerCase()) ?? null;
}

export async function POST(req: Request) {
  try {
    ensureSeeded();
    const body = await req.json();
    const identifier = String(body.identifier ?? body.phone ?? body.username ?? "").trim();
    const password = String(body.password ?? "");
    if (!identifier) {
      return Response.json({ ok: false, error: "موبایل یا نام کاربری الزامی است" }, { status: 400 });
    }
    if (!password) {
      return Response.json({ ok: false, error: "رمز عبور الزامی است" }, { status: 400 });
    }

    const user = findUserByIdentifier(identifier);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return Response.json({ ok: false, error: "نام کاربری یا رمز عبور اشتباه است" }, { status: 401 });
    }
    if (!user.isActive) {
      return Response.json({ ok: false, error: "حساب کاربری غیرفعال است" }, { status: 403 });
    }
    if (user.bypassOtp) {
      return Response.json(
        { ok: false, error: "این کاربر بدون OTP وارد می‌شود؛ از لینک راه‌اندازی استفاده کنید" },
        { status: 400 },
      );
    }

    const phone = user.phone ? normalizePhone(user.phone) : "";
    if (!isValidIranMobile(phone)) {
      return Response.json({ ok: false, error: "برای این کاربر شماره موبایل معتبر ثبت نشده است" }, { status: 400 });
    }

    const store = getStore();
    const now = new Date();
    const expireSec = 120;
    const maskedPhone = phone.replace(/^(\d{4})\d+(\d{2})$/, "$1***$2");

    store.otpCodes.push({
      id: nextId(store, "otpCodes"),
      phone,
      userId: user.id,
      codeHash: hashPassword(`otp:${DEMO_CODE}`),
      attempts: 0,
      verified: false,
      lockedUntil: null,
      expiresAt: new Date(now.getTime() + expireSec * 1000),
      ip: null,
      createdAt: now,
    });

    return Response.json({
      ok: true,
      phone: maskedPhone,
      expiresIn: expireSec,
      cooldown: 5,
      channel: "demo",
      otpLength: 5,
      demoCode: DEMO_CODE,
    });
  } catch (e) {
    console.error("OTP request error:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
