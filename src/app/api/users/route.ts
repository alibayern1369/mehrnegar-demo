import { getCurrentUser, isManager, hashPassword } from "@/mock/auth-helpers";
import { ensureSeeded, getStore, nextId } from "@/mock";
import { SALES_METHODS, isValidSalesMethod } from "@/lib/sales-methods";
import { isValidIranMobile, normalizePhone } from "@/lib/phone";
import { DEFAULT_USER_PERMISSIONS, sanitizePermissions, hasPermission } from "@/lib/permissions";

export const dynamic = "force-dynamic";

function canManageUsers(me: { role?: string; permissions?: string[] | null }) {
  return hasPermission(me, "users") || me.role === "manager";
}

export async function GET(req: Request) {
  try {
    ensureSeeded();
    const me = getCurrentUser(req);
    if (!me) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const store = getStore();
    const url = new URL(req.url);
    const forSale = url.searchParams.get("forSale") === "1";
    const warehouseId = Number(url.searchParams.get("warehouseId") || 0);

    if (forSale) {
      const activeWarehouses = store.warehouses.filter((w) => w.isActive !== false);
      if (!warehouseId) {
        if (isManager(me)) {
          return Response.json({
            ok: true,
            warehouses: activeWarehouses.map((warehouse) => ({
              ...warehouse,
              salesMethods: SALES_METHODS.map((method) => method.id),
            })),
          });
        }
        const permissions = store.userSalesPermissions.filter((p) => p.userId === me.id);
        return Response.json({
          ok: true,
          warehouses: activeWarehouses
            .map((warehouse) => {
              const permission = permissions.find((row) => row.warehouseId === warehouse.id);
              if (!permission?.enabled) return null;
              return {
                ...warehouse,
                salesMethods: (permission.salesMethods ?? []).filter((method) => isValidSalesMethod(method)),
              };
            })
            .filter(Boolean),
        });
      }
      if (isManager(me)) {
        return Response.json({ ok: true, enabled: true, methods: SALES_METHODS.map((m) => m.id) });
      }
      const perm = store.userSalesPermissions.find(
        (p) => p.userId === me.id && p.warehouseId === warehouseId,
      );
      const methods = perm?.enabled
        ? (perm.salesMethods ?? []).filter((m) => isValidSalesMethod(m))
        : [];
      return Response.json({ ok: true, enabled: perm?.enabled === true, methods });
    }

    if (!canManageUsers(me)) {
      return Response.json({ ok: false, error: "دسترسی مجاز نیست" }, { status: 403 });
    }

    const allUsers = store.users
      .map((u) => ({
        id: u.id,
        name: u.name,
        username: u.username,
        phone: u.phone,
        gender: u.gender,
        role: u.role,
        isActive: u.isActive,
        bypassOtp: u.bypassOtp,
        isBootstrap: u.isBootstrap,
        permissions: u.permissions,
        createdAt: u.createdAt,
      }))
      .sort((a, b) => b.id - a.id);

    const allWh = store.warehouses.filter((w) => w.isActive !== false);
    const perms = store.userSalesPermissions;

    const enriched = allUsers.map((u) => ({
      ...u,
      salesPermissions: allWh.map((wh) => {
        const p = perms.find((x) => x.userId === u.id && x.warehouseId === wh.id);
        return {
          warehouseId: wh.id,
          warehouseName: wh.name,
          warehouseCode: wh.code,
          enabled: p?.enabled ?? true,
          salesMethods: (p?.salesMethods ?? (u.role === "manager" ? SALES_METHODS.map((m) => m.id) : ["normal"]))
            .filter((m) => isValidSalesMethod(m)),
        };
      }),
    }));

    return Response.json({ ok: true, users: enriched, warehouses: allWh, salesMethods: SALES_METHODS });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    ensureSeeded();
    const me = getCurrentUser(req);
    if (!me || !canManageUsers(me)) {
      return Response.json({ ok: false, error: "دسترسی مجاز نیست" }, { status: 403 });
    }

    const store = getStore();
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "").trim();
    const role = body.role === "manager" ? "manager" : "user";
    const gender = body.gender === "female" ? "female" : "male";
    let phone: string | null = body.phone ? normalizePhone(String(body.phone)) : null;
    if (phone && !isValidIranMobile(phone)) {
      return Response.json({ ok: false, error: "شماره موبایل نامعتبر است" }, { status: 400 });
    }

    if (!name || !username || !password) {
      return Response.json({ ok: false, error: "نام، نام کاربری و رمز الزامی است" }, { status: 400 });
    }

    if (store.users.some((u) => u.username === username)) {
      return Response.json({ ok: false, error: "نام کاربری تکراری است" }, { status: 400 });
    }

    const now = new Date();
    const created = {
      id: nextId(store, "users"),
      name,
      username,
      passwordHash: hashPassword(password),
      phone,
      gender,
      role,
      isActive: true,
      mustChangePass: true,
      bypassOtp: false,
      isBootstrap: false,
      permissions: role === "manager" ? ["all"] : [...DEFAULT_USER_PERMISSIONS],
      createdAt: now,
      updatedAt: now,
    };
    store.users.push(created);

    const allWh = store.warehouses.filter((w) => w.isActive !== false);
    const defaultMethods = role === "manager" ? SALES_METHODS.map((m) => m.id) : ["normal"];
    for (const wh of allWh) {
      store.userSalesPermissions.push({
        id: nextId(store, "userSalesPermissions"),
        userId: created.id,
        warehouseId: wh.id,
        enabled: true,
        salesMethods: defaultMethods,
        createdAt: now,
      });
    }

    return Response.json({
      ok: true,
      user: {
        id: created.id,
        name: created.name,
        username: created.username,
        phone: created.phone,
        gender: created.gender,
        role: created.role,
      },
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    ensureSeeded();
    const me = getCurrentUser(req);
    if (!me || !canManageUsers(me)) {
      return Response.json({ ok: false, error: "دسترسی مجاز نیست" }, { status: 403 });
    }

    const store = getStore();
    const body = await req.json();
    const action = String(body.action ?? "permissions");
    const userId = Number(body.userId);

    if (!userId) return Response.json({ ok: false, error: "کاربر الزامی است" }, { status: 400 });

    const target = store.users.find((u) => u.id === userId);
    if (!target) return Response.json({ ok: false, error: "کاربر یافت نشد" }, { status: 404 });

    if (action === "permissions" && Array.isArray(body.permissions)) {
      const rows = body.permissions as { warehouseId: number; enabled?: boolean; salesMethods: string[] }[];
      for (const row of rows) {
        const methods = (row.salesMethods ?? []).filter((m) => isValidSalesMethod(m));
        const enabled = row.enabled !== false;
        const existing = store.userSalesPermissions.find(
          (p) => p.userId === userId && p.warehouseId === row.warehouseId,
        );
        if (existing) {
          existing.enabled = enabled;
          existing.salesMethods = methods;
        } else {
          store.userSalesPermissions.push({
            id: nextId(store, "userSalesPermissions"),
            userId,
            warehouseId: row.warehouseId,
            enabled,
            salesMethods: methods,
            createdAt: new Date(),
          });
        }
      }
      return Response.json({ ok: true });
    }

    if (action === "update") {
      if (body.name !== undefined) target.name = String(body.name).trim();
      if (body.username !== undefined) target.username = String(body.username).trim().toLowerCase();
      if (body.password) {
        target.passwordHash = hashPassword(String(body.password));
        target.mustChangePass = false;
      }
      if (body.phone !== undefined) {
        const p = body.phone ? normalizePhone(String(body.phone)) : null;
        if (p && !isValidIranMobile(p)) {
          return Response.json({ ok: false, error: "شماره موبایل نامعتبر است" }, { status: 400 });
        }
        target.phone = p;
      }
      if (body.gender !== undefined) target.gender = body.gender === "female" ? "female" : "male";
      if (body.isActive !== undefined) target.isActive = Boolean(body.isActive);
      if (body.bypassOtp !== undefined) target.bypassOtp = Boolean(body.bypassOtp);
      if (body.sectionPermissions !== undefined) {
        target.permissions = target.role === "manager"
          ? ["all"]
          : sanitizePermissions(body.sectionPermissions);
      }
      target.updatedAt = new Date();
      return Response.json({ ok: true });
    }

    if (action === "deactivate") {
      target.isActive = false;
      target.bypassOtp = false;
      target.updatedAt = new Date();
      return Response.json({ ok: true });
    }

    if (action === "delete") {
      if (target.id === me.id) {
        return Response.json({ ok: false, error: "نمی‌توانید خودتان را حذف کنید" }, { status: 400 });
      }
      target.isActive = false;
      target.bypassOtp = false;
      target.username = `${target.username}__deleted_${target.id}`;
      target.updatedAt = new Date();
      return Response.json({ ok: true });
    }

    return Response.json({ ok: false, error: "action نامعتبر است" }, { status: 400 });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 400 });
  }
}
