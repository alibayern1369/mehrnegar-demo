import { encodeToken, verifyPassword, type SessionUser } from "@/mock/auth-helpers";
import { ensureSeeded, getStore } from "@/mock";
import { findDemoAccount } from "@/lib/demo";

export const dynamic = "force-dynamic";

/** Password-only login for published demo accounts. */
export async function POST(req: Request) {
  try {
    ensureSeeded();
    const body = await req.json().catch(() => ({}));
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    const account = findDemoAccount(username);
    if (!account || password !== account.password) {
      return Response.json({ ok: false, error: "نام کاربری یا رمز عبور نادرست است" }, { status: 401 });
    }

    const user = getStore().users.find((u) => u.username === username);
    if (!user || !user.isActive) {
      return Response.json({
        ok: false,
        error: "حساب کاربری یافت نشد. لطفاً با پشتیبانی تماس بگیرید.",
      }, { status: 404 });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return Response.json({
        ok: false,
        error: "رمز عبور نامعتبر است",
      }, { status: 401 });
    }

    const session: SessionUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role as "manager" | "user",
      permissions: user.permissions ?? [],
      gender: user.gender ?? null,
      isBootstrap: Boolean(user.isBootstrap),
    };

    return Response.json({
      ok: true,
      token: encodeToken(session),
      user: session,
      mustChangePass: false,
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
