import { ensureSeeded } from "@/mock/ensure-seeded";
import { getStore, nextId } from "@/mock/store";
import { getCurrentUser } from "@/mock/auth-helpers";
import { hasPermission } from "@/lib/permissions";
import { isValidIranMobile, normalizePhone } from "@/lib/phone";
import { isValidJalaliDate, parseJalali, formatJalali } from "@/lib/jalali";

export const dynamic = "force-dynamic";

function requireCustomersAccess(user: { role?: string; permissions?: string[] | null }) {
  return hasPermission(user, "customers");
}

export async function GET(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!requireCustomersAccess(user)) {
      return Response.json({ ok: false, error: "دسترسی به بخش مشتریان ندارید" }, { status: 403 });
    }

    const url = new URL(req.url);
    const q = String(url.searchParams.get("q") ?? "").trim();
    const store = getStore();

    let rows;
    if (q) {
      const qLower = q.toLowerCase();
      rows = store.customers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(qLower) ||
            c.phone.includes(q) ||
            c.address.toLowerCase().includes(qLower),
        )
        .sort((a, b) => b.id - a.id)
        .slice(0, 200);
    } else {
      rows = [...store.customers].sort((a, b) => b.id - a.id).slice(0, 200);
    }

    return Response.json({ ok: true, customers: rows });
  } catch (e) {
    return Response.json({ ok: false, customers: [], error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!requireCustomersAccess(user)) {
      return Response.json({ ok: false, error: "دسترسی به بخش مشتریان ندارید" }, { status: 403 });
    }

    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const phoneRaw = String(body.phone ?? "").trim();
    const address = String(body.address ?? "").trim();
    const birthRaw = String(body.birthDate ?? "").trim();

    if (!name) return Response.json({ ok: false, error: "نام مشتری الزامی است" }, { status: 400 });
    const phone = normalizePhone(phoneRaw);
    if (!isValidIranMobile(phone)) {
      return Response.json({ ok: false, error: "شماره تلفن معتبر الزامی است (09xxxxxxxxx)" }, { status: 400 });
    }
    if (!address) return Response.json({ ok: false, error: "آدرس کامل الزامی است" }, { status: 400 });

    const parsed = parseJalali(birthRaw);
    if (!parsed || !isValidJalaliDate(parsed.jy, parsed.jm, parsed.jd)) {
      return Response.json({ ok: false, error: "تاریخ تولد شمسی معتبر الزامی است" }, { status: 400 });
    }
    const birthDate = formatJalali(parsed.jy, parsed.jm, parsed.jd);

    const store = getStore();
    const now = new Date();
    const row = {
      id: nextId(store, "customers"),
      name,
      phone,
      address,
      birthDate,
      createdBy: user.id,
      createdAt: now,
      updatedAt: now,
    };
    store.customers.push(row);

    return Response.json({ ok: true, customer: row });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!requireCustomersAccess(user)) {
      return Response.json({ ok: false, error: "دسترسی به بخش مشتریان ندارید" }, { status: 403 });
    }

    const body = await req.json();
    const id = Number(body.id);
    if (!id) return Response.json({ ok: false, error: "شناسه نامعتبر" }, { status: 400 });

    const name = String(body.name ?? "").trim();
    const phoneRaw = String(body.phone ?? "").trim();
    const address = String(body.address ?? "").trim();
    const birthRaw = String(body.birthDate ?? "").trim();

    if (!name) return Response.json({ ok: false, error: "نام مشتری الزامی است" }, { status: 400 });
    const phone = normalizePhone(phoneRaw);
    if (!isValidIranMobile(phone)) {
      return Response.json({ ok: false, error: "شماره تلفن معتبر الزامی است (09xxxxxxxxx)" }, { status: 400 });
    }
    if (!address) return Response.json({ ok: false, error: "آدرس کامل الزامی است" }, { status: 400 });

    const parsed = parseJalali(birthRaw);
    if (!parsed || !isValidJalaliDate(parsed.jy, parsed.jm, parsed.jd)) {
      return Response.json({ ok: false, error: "تاریخ تولد شمسی معتبر الزامی است" }, { status: 400 });
    }
    const birthDate = formatJalali(parsed.jy, parsed.jm, parsed.jd);

    const store = getStore();
    const row = store.customers.find((c) => c.id === id);
    if (!row) return Response.json({ ok: false, error: "مشتری یافت نشد" }, { status: 404 });

    row.name = name;
    row.phone = phone;
    row.address = address;
    row.birthDate = birthDate;
    row.updatedAt = new Date();

    return Response.json({ ok: true, customer: row });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!requireCustomersAccess(user)) {
      return Response.json({ ok: false, error: "دسترسی به بخش مشتریان ندارید" }, { status: 403 });
    }

    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id") || 0);
    if (!id) return Response.json({ ok: false, error: "شناسه نامعتبر" }, { status: 400 });

    const store = getStore();
    const idx = store.customers.findIndex((c) => c.id === id);
    if (idx === -1) return Response.json({ ok: false, error: "مشتری یافت نشد" }, { status: 404 });
    store.customers.splice(idx, 1);

    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
