import { readFile } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/mock/auth-helpers";
import { buildNlblExport } from "@/lib/nlblExport";
import type { ZebraLabelItem } from "@/lib/zebraLabels";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const labels = (body?.labels ?? []) as ZebraLabelItem[];
    if (!Array.isArray(labels) || labels.length === 0) {
      return Response.json({ ok: false, error: "لیبلی برای خروجی نیست" }, { status: 400 });
    }

    const dir = path.join(process.cwd(), "src", "lib", "zebra-template");
    const [templateXml, slnxXml] = await Promise.all([
      readFile(path.join(dir, "Formats_Label.xml"), "utf8"),
      readFile(path.join(dir, "Label.slnx"), "utf8"),
    ]);

    const result = await buildNlblExport(labels, templateXml, slnxXml);
    const mime = result.kind === "nlbl" ? "application/octet-stream" : "application/zip";

    return new Response(Buffer.from(result.bytes), {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("nlbl export", e);
    return Response.json({ ok: false, error: "خطا در ساخت فایل nlbl" }, { status: 500 });
  }
}
