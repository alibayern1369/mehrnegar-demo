import { ensureSeeded } from "@/mock/ensure-seeded";
import { getStore } from "@/mock/store";
import { getCurrentUser } from "@/mock/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, logs: [] }, { status: 401 });
    const store = getStore();
    const rows = [...store.auditLogs].sort((a, b) => b.id - a.id).slice(0, 100);
    return Response.json({ ok: true, logs: rows });
  } catch {
    return Response.json({ ok: false, logs: [] }, { status: 500 });
  }
}
