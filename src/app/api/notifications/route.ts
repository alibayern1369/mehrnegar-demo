import { ensureSeeded } from "@/mock/ensure-seeded";
import { getStore } from "@/mock/store";
import { getCurrentUser } from "@/mock/auth-helpers";
import { faNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

const LOW_STOCK_THRESHOLD = 10;

function isProductNotDeleted(p: { status?: string | null }): boolean {
  return p.status !== "deleted";
}

/**
 * Real low-stock alerts: products whose in-stock unit count is below threshold.
 * Falls back to warehouse_stock sum if units table is empty for a product.
 */
export async function GET(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const store = getStore();
    const rows = store.products.filter(isProductNotDeleted);

    const unitMap = new Map<number, number>();
    for (const u of store.productUnits) {
      if (u.status === "in_stock") {
        unitMap.set(u.productId, (unitMap.get(u.productId) ?? 0) + 1);
      }
    }

    const stockMap = new Map<number, number>();
    for (const s of store.warehouseStock) {
      stockMap.set(s.productId, (stockMap.get(s.productId) ?? 0) + (s.quantity ?? 0));
    }

    const notifications = rows
      .map((p) => {
        const fromUnits = unitMap.get(p.id);
        const total = fromUnits != null ? fromUnits : (stockMap.get(p.id) ?? 0);
        return { id: p.id, name: p.name, total };
      })
      .filter((x) => x.total < LOW_STOCK_THRESHOLD)
      .sort((a, b) => a.total - b.total)
      .slice(0, 40)
      .map((x) => ({
        id: `stock-${x.id}`,
        emoji: x.total === 0 ? "🚫" : "⚠️",
        title: x.total === 0 ? "اتمام موجودی" : "کمبود موجودی",
        body:
          x.total === 0
            ? `«${x.name}» ناموجود است`
            : `«${x.name}» — فقط ${faNumber(x.total)} عدد باقی مانده (کمتر از ${faNumber(LOW_STOCK_THRESHOLD)})`,
        total: x.total,
      }));

    return Response.json({
      ok: true,
      threshold: LOW_STOCK_THRESHOLD,
      notifications,
    });
  } catch (e) {
    return Response.json({ ok: false, notifications: [], error: String(e) }, { status: 500 });
  }
}
