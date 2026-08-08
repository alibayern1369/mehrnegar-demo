import { ensureSeeded, getStore } from "@/mock";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const fast = url.searchParams.get("fast") === "1";
    const wasEmpty = getStore().users.length === 0;
    ensureSeeded();
    return Response.json({ ok: true, seeded: wasEmpty, fast });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
