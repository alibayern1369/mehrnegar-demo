import { encodeToken, verifyPassword, type SessionUser } from "@/mock/auth-helpers";
import { ensureSeeded, getStore, nextId } from "@/mock";

export const dynamic = "force-dynamic";

function toSession(user: {
  id: number;
  name: string;
  username: string;
  role: string;
  permissions: string[];
  gender: string | null;
  isBootstrap: boolean | null;
}): SessionUser {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role as "manager" | "user",
    permissions: user.permissions ?? [],
    gender: user.gender ?? null,
    isBootstrap: Boolean(user.isBootstrap),
  };
}

/**
 * Password login — ONLY for users with bypass_otp (bootstrap / setup).
 * Sellers must use /api/auth/otp/request + /api/auth/otp/verify.
 */
export async function POST(req: Request) {
  try {
    ensureSeeded();
    const { username, password } = await req.json();
    if (!username || !password) {
      return Response.json(
        { ok: false, error: "نام کاربری و رمز عبور الزامی است" },
        { status: 400 },
      );
    }

    const store = getStore();
    const user = store.users.find(
      (u) => u.username === String(username).trim().toLowerCase(),
    );

    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      return Response.json(
        { ok: false, error: "نام کاربری یا رمز عبور اشتباه است" },
        { status: 401 },
      );
    }
    if (!user.isActive) {
      return Response.json(
        { ok: false, error: "حساب کاربری غیرفعال است" },
        { status: 403 },
      );
    }
    if (!user.bypassOtp) {
      return Response.json(
        { ok: false, error: "این کاربر فقط با OTP وارد می‌شود" },
        { status: 403 },
      );
    }

    const session = toSession(user);

    store.auditLogs.push({
      id: nextId(store, "auditLogs"),
      userId: user.id,
      userName: user.name,
      action: "ورود راه‌اندازی (بدون OTP)",
      entity: "user",
      entityId: user.id,
      detail: null,
      prevValue: null,
      newValue: null,
      warehouseId: null,
      relatedInvoice: null,
      kind: "info",
      createdAt: new Date(),
    });

    return Response.json({
      ok: true,
      token: encodeToken(session),
      user: session,
      mustChangePass: user.mustChangePass,
      bypassOtp: true,
    });
  } catch (e) {
    console.error("Login error:", e);
    return Response.json(
      { ok: false, error: "خطای سرور — لطفاً دوباره تلاش کنید" },
      { status: 500 },
    );
  }
}
