import { getStore, nextId } from "@/mock/store";
import { randomBytes } from "crypto";
import { DEFAULT_DEVELOPER_URL } from "@/lib/version";

export function generateSetupLoginToken(): string {
  return randomBytes(24).toString("hex");
}

export async function ensureAppSettingsRow() {
  const store = getStore();
  if (store.appSettings[0]) {
    const row = store.appSettings[0];
    if (!row.setupLoginToken) {
      row.setupLoginToken = generateSetupLoginToken();
      row.updatedAt = new Date();
    }
    if (!row.developerUrl) {
      row.developerUrl = DEFAULT_DEVELOPER_URL;
      row.updatedAt = new Date();
    }
    return row;
  }

  const row = {
    id: nextId(store, "appSettings"),
    appName: "مهرنگار",
    appLogo: null,
    developerUrl: DEFAULT_DEVELOPER_URL,
    setupLoginToken: generateSetupLoginToken(),
    updatedAt: new Date(),
  };
  store.appSettings.push(row);
  return row;
}

export async function regenerateSetupLoginToken() {
  const current = await ensureAppSettingsRow();
  current.setupLoginToken = generateSetupLoginToken();
  current.updatedAt = new Date();
  return current;
}

export async function verifySetupLoginToken(token: string): Promise<boolean> {
  const t = token.trim();
  if (!t || t.length < 16) return false;
  try {
    const row = await ensureAppSettingsRow();
    return Boolean(row.setupLoginToken && row.setupLoginToken === t);
  } catch {
    return false;
  }
}

export function publicAppSettings(row: {
  appName: string | null;
  appLogo: string | null;
  developerUrl?: string | null;
}) {
  return {
    appName: row.appName || "مهرنگار",
    appLogo: row.appLogo ?? null,
    developerUrl: row.developerUrl?.trim() || DEFAULT_DEVELOPER_URL,
  };
}

export async function isDatabaseSeeded(): Promise<boolean> {
  return getStore().users.length > 0;
}
