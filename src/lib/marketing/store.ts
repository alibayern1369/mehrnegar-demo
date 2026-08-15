import { promises as fs } from "node:fs";
import path from "node:path";
import { DEFAULT_MARKETING_CONTENT } from "./defaults";
import type { MarketingContent } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "marketing-content.json");

let memoryCache: MarketingContent | null = null;

function deepMerge<T extends Record<string, unknown>>(base: T, patch: Partial<T>): T {
  const out = { ...base };
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const value = patch[key];
    if (value === undefined) continue;
    const current = out[key];
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      current &&
      typeof current === "object" &&
      !Array.isArray(current)
    ) {
      out[key] = deepMerge(
        current as Record<string, unknown>,
        value as Record<string, unknown>,
      ) as T[keyof T];
    } else {
      out[key] = value as T[keyof T];
    }
  }
  return out;
}

export function publicMarketingContent(content: MarketingContent): Omit<MarketingContent, "recaptchaSecretKey"> {
  const { recaptchaSecretKey: _secret, ...rest } = content;
  return rest;
}

export async function getMarketingContent(): Promise<MarketingContent> {
  if (memoryCache) {
    return {
      ...DEFAULT_MARKETING_CONTENT,
      ...memoryCache,
      googleSiteVerification:
        memoryCache.googleSiteVerification ||
        process.env.GOOGLE_SITE_VERIFICATION ||
        "",
      recaptchaSiteKey:
        memoryCache.recaptchaSiteKey ||
        process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ||
        "",
      recaptchaSecretKey:
        memoryCache.recaptchaSecretKey || process.env.RECAPTCHA_SECRET_KEY || "",
      siteUrl:
        memoryCache.siteUrl ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        DEFAULT_MARKETING_CONTENT.siteUrl,
    };
  }

  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<MarketingContent>;
    memoryCache = deepMerge(
      DEFAULT_MARKETING_CONTENT as unknown as Record<string, unknown>,
      parsed as Record<string, unknown>,
    ) as unknown as MarketingContent;
    return getMarketingContent();
  } catch {
    memoryCache = { ...DEFAULT_MARKETING_CONTENT };
    return getMarketingContent();
  }
}

export async function saveMarketingContent(
  patch: Partial<MarketingContent>,
): Promise<MarketingContent> {
  const current = await getMarketingContent();
  const next = deepMerge(
    current as unknown as Record<string, unknown>,
    patch as Record<string, unknown>,
  ) as unknown as MarketingContent;

  memoryCache = next;

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf8");
  } catch {
    // Serverless / read-only FS: keep in-memory for process lifetime
  }

  return next;
}

export function resetMarketingCache() {
  memoryCache = null;
}
