import { encodeToken, type SessionUser } from "@/mock/auth-helpers";
import { ensureSeeded, getStore, nextId } from "@/mock";
import { isValidIranMobile, normalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

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

function toSession(user: {
  id: number;
  name: string;
  username: string;
  role: string;
  permissions: string[];
  gender: string | null;
  isBootstrap: boolean | null;
  mustChangePass: boolean | null;
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

export async function POST(req: Request) {
  try {
    ensureSeeded();
    const body = await req.json();
    const identifier = String(body.identifier ?? body.phone ?? body.username ?? "").trim();
    const code = String(body.code ?? "").trim();

    if (!identifier || !code) {
      return Response.json({ ok: false, error: "شناسه و کد OTP الزامی است" }, { status: 400 });
    }

    const user = findUserByIdentifier(identifier);
    if (!user) {
      return Response.json({ ok: false, error: "کاربر یافت نشد" }, { status: 404 });
    }
    if (!user.isActive) {
      return Response.json({ ok: false, error: "حساب کاربری غیرفعال است" }, { status: 403 });
    }

    const entered = code.replace(/\D/g, "");
    const validDemo = entered === "12345" || /^\d{5}$/.test(entered);
    if (!validDemo) {
      return Response.json({ ok: false, error: "کد نادرست است", status: 401 });
    }

    const store = getStore();
    const phone = user.phone ? normalizePhone(user.phone) : "";
    const otpRow = store.otpCodes
      .filter((o) => o.phone === phone && !o.verified)
      .sort((a, b) => b.id - a.id)[0];
    if (otpRow) otpRow.verified = true;

    const session = toSession(user);

    store.auditLogs.push({
      id: nextId(store, "auditLogs"),
      userId: user.id,
      userName: user.name,
      action: "ورود با OTP",
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
    });
  } catch (e) {
    console.error("OTP verify error:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
