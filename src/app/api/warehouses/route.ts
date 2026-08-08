import { ensureSeeded, getStore } from "@/mock";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    ensureSeeded();
    const store = getStore();
    const groups = [...store.warehouseGroups].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
    const whs = [...store.warehouses].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );

    const result = groups.map((g) => ({
      ...g,
      warehouses: whs.filter((w) => w.groupId === g.id),
    }));

    return Response.json({ ok: true, groups: result, warehouses: whs });
  } catch (e) {
    return Response.json({ ok: false, groups: [], warehouses: [], error: String(e) }, { status: 500 });
  }
}
