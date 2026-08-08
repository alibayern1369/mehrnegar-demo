import { getStore } from "./store";
import type { SessionUser, User } from "./types";

export type { SessionUser };

export function encodeToken(user: SessionUser): string {
  const payload = JSON.stringify(user);
  return Buffer.from(payload).toString("base64url");
}

export function decodeToken(token: string): SessionUser | null {
  try {
    const payload = Buffer.from(token, "base64url").toString("utf-8");
    return JSON.parse(payload) as SessionUser;
  } catch {
    return null;
  }
}

function toSession(user: User): SessionUser {
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

/** Resolve current user from Bearer token, refreshing role/permissions from mock store */
export function getCurrentUser(req: Request): SessionUser | null {
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const decoded = decodeToken(token);
  if (!decoded?.id) return null;

  const store = getStore();
  const row = store.users.find((u) => u.id === decoded.id);
  if (!row || row.isActive === false) return null;
  return toSession(row);
}

export function isManager(user: SessionUser | null): boolean {
  return user?.role === "manager";
}

export function hashPassword(plain: string): string {
  let h = 5381;
  for (let i = 0; i < plain.length; i++) h = ((h << 5) + h) ^ plain.charCodeAt(i);
  return "cf_" + Math.abs(h).toString(36) + "_" + plain.length;
}

export function verifyPassword(plain: string, hash: string): boolean {
  return hashPassword(plain) === hash;
}

/** Async wrapper for API routes that expect Promise-based getCurrentUser */
export async function getCurrentUserAsync(req: Request): Promise<SessionUser | null> {
  return getCurrentUser(req);
}
