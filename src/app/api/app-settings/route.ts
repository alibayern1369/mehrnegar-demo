import { ensureSeeded, getStore, nextId } from "@/mock";
import { getCurrentUserAsync, isManager } from "@/mock/auth-helpers";
import { resolveAppLogo } from "@/lib/demo";
import { DEFAULT_DEVELOPER_URL } from "@/lib/version";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

function publicAppSettings(row: {
  appName: string | null;
  appLogo: string | null;
  developerUrl?: string | null;
}) {
  return {
    appName: row.appName || "مهرنگار",
    appLogo: resolveAppLogo(row.appLogo),
    developerUrl: row.developerUrl?.trim() || DEFAULT_DEVELOPER_URL,
  };
}

function ensureAppSettingsRow() {
  const store = getStore();
  if (store.appSettings[0]) return store.appSettings[0];

  const row = {
    id: nextId(store, "appSettings"),
    appName: "مهرنگار",
    appLogo: null,
    developerUrl: DEFAULT_DEVELOPER_URL,
    setupLoginToken: randomBytes(24).toString("hex"),
    updatedAt: new Date(),
  };
  store.appSettings.push(row);
  return row;
}

export async function GET(req: Request) {
  try {
    ensureSeeded();
    const row = ensureAppSettingsRow();
    const settings = publicAppSettings(row);
    const user = await getCurrentUserAsync(req);
    if (isManager(user) && row.setupLoginToken) {
      return Response.json({
        ok: true,
        settings: {
          ...settings,
          setupLoginToken: row.setupLoginToken,
          setupLoginPath: `/?setup=${row.setupLoginToken}`,
        },
      });
    }
    return Response.json({ ok: true, settings });
  } catch (e) {
    return Response.json({
      ok: true,
      settings: {
        appName: "مهرنگار",
        appLogo: null,
        developerUrl: DEFAULT_DEVELOPER_URL,
      },
      error: String(e),
    });
  }
}

export async function POST(req: Request) {
  try {
    ensureSeeded();
    const user = await getCurrentUserAsync(req);
    if (!isManager(user)) return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const store = getStore();
    const current = ensureAppSettingsRow();

    if (body.action === "regenerate_setup_token") {
      current.setupLoginToken = randomBytes(24).toString("hex");
      current.updatedAt = new Date();

      store.auditLogs.push({
        id: nextId(store, "auditLogs"),
        userId: user!.id,
        userName: user!.name,
        action: "تازه‌سازی لینک ورود راه‌اندازی",
        entity: "setting",
        entityId: null,
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
        settings: {
          ...publicAppSettings(current),
          setupLoginToken: current.setupLoginToken,
          setupLoginPath: `/?setup=${current.setupLoginToken}`,
        },
      });
    }

    const appName = String(body.appName ?? current.appName ?? "مهرنگار").trim() || "مهرنگار";
    const appLogo = body.appLogo === "" || body.appLogo == null
      ? null
      : (body.appLogo === undefined ? current.appLogo : String(body.appLogo));
    const developerUrl = body.developerUrl !== undefined
      ? (String(body.developerUrl).trim() || DEFAULT_DEVELOPER_URL)
      : (current.developerUrl || DEFAULT_DEVELOPER_URL);

    if (appLogo && (!appLogo.startsWith("data:image/") || appLogo.length > 1_200_000)) {
      return Response.json({ ok: false, error: "لوگو نامعتبر است" }, { status: 400 });
    }

    current.appName = appName;
    current.appLogo = appLogo;
    current.developerUrl = developerUrl;
    current.updatedAt = new Date();

    store.auditLogs.push({
      id: nextId(store, "auditLogs"),
      userId: user!.id,
      userName: user!.name,
      action: "ویرایش تنظیمات نرم‌افزار",
      entity: "setting",
      entityId: null,
      detail: null,
      prevValue: null,
      newValue: null,
      warehouseId: null,
      relatedInvoice: null,
      kind: "info",
      createdAt: new Date(),
    });

    const token = current.setupLoginToken;
    return Response.json({
      ok: true,
      settings: {
        ...publicAppSettings(current),
        setupLoginToken: token,
        setupLoginPath: token ? `/?setup=${token}` : null,
      },
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
