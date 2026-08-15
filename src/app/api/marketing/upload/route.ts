import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getAdminCookieName, verifyAdminToken } from "@/lib/marketing/auth";

export const dynamic = "force-dynamic";

const MAX_BYTES = 1_500_000;
const ALLOWED = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"],
  ["image/x-icon", "ico"],
  ["image/vnd.microsoft.icon", "ico"],
]);

const SLOT_RE = /^[a-z0-9][a-z0-9_-]{0,40}$/i;

function getToken(req: NextRequest) {
  return req.cookies.get(getAdminCookieName())?.value;
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(getToken(req))) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "missing_file" }, { status: 400 });
  }

  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "file_too_large" }, { status: 400 });
  }

  const extFromType = ALLOWED.get(file.type);
  const nameExt = path.extname(file.name).replace(".", "").toLowerCase();
  const allowedExts = new Set(["png", "jpg", "jpeg", "webp", "svg", "ico"]);
  const ext = extFromType || (allowedExts.has(nameExt) ? (nameExt === "jpeg" ? "jpg" : nameExt) : null);
  if (!ext) {
    return NextResponse.json({ ok: false, error: "invalid_type" }, { status: 400 });
  }

  const slotRaw = String(form.get("slot") || "asset");
  const slot = SLOT_RE.test(slotRaw) ? slotRaw.toLowerCase() : "asset";
  const id = randomBytes(6).toString("hex");
  const filename = `${slot}-${id}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "marketing");
  const dest = path.join(dir, filename);

  try {
    await fs.mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(dest, buffer);
  } catch {
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    url: `/uploads/marketing/${filename}`,
  });
}
