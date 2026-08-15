import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);
const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "marketing-admin.json");

type StoredCredentials = {
  passwordHash: string;
};

let cache: StoredCredentials | null | undefined;

function envFallbackPassword(): string {
  return process.env.MARKETING_ADMIN_PASSWORD || "mehrnegar-admin";
}

async function readStored(): Promise<StoredCredentials | null> {
  if (cache !== undefined) return cache;
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<StoredCredentials>;
    if (parsed.passwordHash && parsed.passwordHash.includes(":")) {
      cache = { passwordHash: parsed.passwordHash };
      return cache;
    }
  } catch {
    // no stored credentials yet
  }
  cache = null;
  return null;
}

async function writeStored(data: StoredCredentials) {
  cache = data;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPasswordHash(password: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  if (derived.length !== expected.length) return false;
  try {
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  try {
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  if (!password) return false;
  const stored = await readStored();
  if (stored?.passwordHash) {
    return verifyPasswordHash(password, stored.passwordHash);
  }
  return timingSafeStringEqual(password, envFallbackPassword());
}

export async function setAdminPassword(password: string): Promise<void> {
  const passwordHash = await hashPassword(password);
  await writeStored({ passwordHash });
}

export function resetAdminCredentialsCache() {
  cache = undefined;
}
