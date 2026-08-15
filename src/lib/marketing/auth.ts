import { createHmac, timingSafeEqual } from "node:crypto";
export { verifyAdminPassword, setAdminPassword } from "./credentials";

const COOKIE_NAME = "mehrnegar_mkt_admin";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

function secret(): string {
  return (
    process.env.MARKETING_ADMIN_SECRET ||
    process.env.MARKETING_ADMIN_PASSWORD ||
    "mehrnegar-dev-admin-secret"
  );
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function getAdminCookieName() {
  return COOKIE_NAME;
}

export function getAdminCookieMaxAge() {
  return MAX_AGE_SEC;
}

export function createAdminToken(): string {
  const exp = Date.now() + MAX_AGE_SEC * 1000;
  const body = `ok.${exp}`;
  return `${body}.${sign(body)}`;
}

export function verifyAdminToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [flag, expStr, sig] = parts;
  if (flag !== "ok") return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const body = `${flag}.${expStr}`;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function adminCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${MAX_AGE_SEC}${secure}`;
}

export function clearAdminCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
