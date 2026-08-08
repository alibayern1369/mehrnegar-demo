import { getCurrentUser, isManager } from "@/mock/auth-helpers";
import { ensureSeeded, getStore } from "@/mock";
import { normalizeBarcode } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!isManager(user)) {
      return Response.json({ ok: false, error: "دسترسی مجاز نیست" }, { status: 403 });
    }

    const store = getStore();
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view") ?? "ledger";
    const limit = Math.min(Number(searchParams.get("limit") || 200), 500);

    if (view === "barcode") {
      const barcode = normalizeBarcode(searchParams.get("barcode") ?? "");
      if (!barcode) return Response.json({ ok: false, error: "بارکد الزامی است" }, { status: 400 });

      const unit = store.productUnits.find((u) => u.barcode === barcode);
      if (!unit) return Response.json({ ok: false, error: "بارکد یافت نشد" }, { status: 404 });

      const product = store.products.find((p) => p.id === unit.productId) ?? null;
      const variation = store.productVariations.find((v) => v.id === unit.variationId) ?? null;
      const warehouse = unit.warehouseId
        ? store.warehouses.find((w) => w.id === unit.warehouseId) ?? null
        : null;
      const history = store.inventoryLedger
        .filter((e) => e.barcode === barcode)
        .sort((a, b) => b.id - a.id);

      return Response.json({
        ok: true,
        unit: {
          ...unit,
          product,
          variation,
          warehouse,
          currentLocation: warehouse?.name ?? (unit.status === "sold" ? "فروخته‌شده" : "—"),
        },
        history,
      });
    }

    if (view === "stock") {
      const warehouseId = searchParams.get("warehouseId");
      const productId = searchParams.get("productId");
      let rows = [...store.variationStock];
      if (warehouseId) rows = rows.filter((r) => r.warehouseId === Number(warehouseId));
      if (productId) rows = rows.filter((r) => r.productId === Number(productId));

      const stock = rows.map((r) => ({
        ...r,
        warehouse: store.warehouses.find((w) => w.id === r.warehouseId) ?? null,
        product: store.products.find((p) => p.id === r.productId) ?? null,
        variation: store.productVariations.find((v) => v.id === r.variationId) ?? null,
      }));

      return Response.json({ ok: true, stock });
    }

    const warehouseId = searchParams.get("warehouseId");
    const productId = searchParams.get("productId");
    const variationId = searchParams.get("variationId");
    const barcode = searchParams.get("barcode");
    const documentNumber = searchParams.get("documentNumber");
    const operatorId = searchParams.get("userId");
    const txnType = searchParams.get("type");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let rows = [...store.inventoryLedger].sort((a, b) => b.id - a.id);

    if (warehouseId) {
      const wid = Number(warehouseId);
      rows = rows.filter((r) => r.sourceWarehouseId === wid || r.destWarehouseId === wid);
    }
    if (productId) rows = rows.filter((r) => r.productId === Number(productId));
    if (variationId) rows = rows.filter((r) => r.variationId === Number(variationId));
    if (barcode) rows = rows.filter((r) => r.barcode === normalizeBarcode(barcode));
    if (documentNumber) rows = rows.filter((r) => r.documentNumber === documentNumber);
    if (operatorId) rows = rows.filter((r) => r.operatorId === Number(operatorId));
    if (txnType) rows = rows.filter((r) => r.transactionType === txnType);
    if (from) {
      const f = new Date(from);
      rows = rows.filter((r) => r.createdAt && new Date(r.createdAt) >= f);
    }
    if (to) {
      const t = new Date(to);
      t.setHours(23, 59, 59, 999);
      rows = rows.filter((r) => r.createdAt && new Date(r.createdAt) <= t);
    }

    rows = rows.slice(0, limit);

    const ledger = rows.map((r) => ({
      ...r,
      sourceWarehouse: store.warehouses.find((w) => w.id === r.sourceWarehouseId) ?? null,
      destWarehouse: store.warehouses.find((w) => w.id === r.destWarehouseId) ?? null,
      incoming: (r.quantity ?? 0) > 0,
      outgoing: (r.quantity ?? 0) < 0,
    }));

    const docs = [...store.stockDocuments].sort((a, b) => b.id - a.id).slice(0, 50);

    return Response.json({ ok: true, ledger, documents: docs });
  } catch (e) {
    return Response.json({ ok: false, ledger: [], error: String(e) }, { status: 500 });
  }
}
