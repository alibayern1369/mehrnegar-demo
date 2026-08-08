import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ensureSeeded } from "@/mock/ensure-seeded";
import { getStore } from "@/mock/store";
import { resolveAppLogo } from "@/lib/demo";

export type AppBrandingIcon = { appName: string; appLogo: string | null };

export async function loadBrandingIcon(): Promise<AppBrandingIcon> {
  try {
    ensureSeeded();
    const s = getStore().appSettings[0];
    return {
      appName: s?.appName?.trim() || "مهرنگار",
      appLogo: resolveAppLogo(s?.appLogo),
    };
  } catch {
    return { appName: "مهرنگار", appLogo: resolveAppLogo(null) };
  }
}

function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!m) return null;
  try {
    return { mime: m[1].toLowerCase(), bytes: Uint8Array.from(Buffer.from(m[2].replace(/\s/g, ""), "base64")) };
  } catch {
    return null;
  }
}

function fallbackIcon(size: number, letter: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7c4dff 0%, #5b2fd6 100%)",
          color: "white",
          fontSize: Math.round(size * 0.48),
          fontWeight: 900,
          fontFamily: "Arial, sans-serif",
        }}
      >
        {letter}
      </div>
    ),
    { width: size, height: size },
  );
}

const RASTER = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

async function staticLogoResponse(relativePath: string, headers: Record<string, string>): Promise<Response | null> {
  if (!relativePath.startsWith("/")) return null;
  try {
    const filePath = path.join(process.cwd(), "public", relativePath.slice(1));
    const bytes = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const type = ext === ".jpg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
    return new Response(Buffer.from(bytes), { headers: { ...headers, "Content-Type": type } });
  } catch {
    return null;
  }
}

export async function appIconResponse(size: number): Promise<Response> {
  const { appName, appLogo } = await loadBrandingIcon();
  const letter = (appName || "م").charAt(0) || "م";
  const headers = {
    "Cache-Control": "public, max-age=0, must-revalidate",
  };

  if (appLogo?.startsWith("/")) {
    const staticRes = await staticLogoResponse(appLogo, headers);
    if (staticRes) return staticRes;
  }

  if (appLogo?.startsWith("data:image/")) {
    const parsed = parseDataUrl(appLogo);
    if (parsed && RASTER.has(parsed.mime)) {
      const type = parsed.mime === "image/jpg" ? "image/jpeg" : parsed.mime;
      return new Response(Buffer.from(parsed.bytes), {
        headers: { ...headers, "Content-Type": type },
      });
    }

    try {
      return new ImageResponse(
        (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#ffffff",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse img */}
            <img
              src={appLogo}
              alt=""
              width={Math.round(size * 0.9)}
              height={Math.round(size * 0.9)}
              style={{ objectFit: "contain" }}
            />
          </div>
        ),
        { width: size, height: size, headers },
      );
    } catch {
      return fallbackIcon(size, letter);
    }
  }

  return fallbackIcon(size, letter);
}
