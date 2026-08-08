import { getCurrentUser } from "@/mock/auth-helpers";
import { ensureSeeded, getStore } from "@/mock";
import { productPrice } from "@/mock/inventory";
import { salesMethodLabel } from "@/lib/sales-methods";
import { normalizeBarcode } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Dedicated barcode lookup — always finds unit barcodes (+ sale context for returns) */
export async function GET(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const barcode = normalizeBarcode(new URL(req.url).searchParams.get("barcode") ?? "");
    if (!barcode) return Response.json({ ok: false, error: "بارکد الزامی است" }, { status: 400 });

    const store = getStore();
    const unit = store.productUnits.find((u) => u.barcode === barcode);
    if (unit) {
      const product = store.products.find((p) => p.id === unit.productId) ?? null;
      const variation = store.productVariations.find((v) => v.id === unit.variationId) ?? null;
      const warehouse = unit.warehouseId
        ? store.warehouses.find((w) => w.id === unit.warehouseId) ?? null
        : null;
      const history = store.inventoryLedger
        .filter((e) => e.barcode === barcode)
        .sort((a, b) => b.id - a.id)
        .slice(0, 50);
      const warehouseNames = new Map(store.warehouses.map((row) => [row.id, row.name]));
      const creator = product?.createdBy
        ? store.users.find((u) => u.id === product.createdBy) ?? null
        : null;
      const seenMovementEvents = new Set<string>();
      const enrichedHistory = history
        .slice()
        .reverse()
        .map((event) => ({
          ...event,
          sourceWarehouseName: event.sourceWarehouseId
            ? warehouseNames.get(event.sourceWarehouseId) ?? null
            : null,
          destWarehouseName: event.destWarehouseId
            ? warehouseNames.get(event.destWarehouseId) ?? null
            : null,
        }))
        .filter((event) => {
          if (!["distribution", "transfer"].includes(event.transactionType)) return true;
          const key = [
            event.transactionType,
            event.documentNumber,
            event.sourceWarehouseId,
            event.destWarehouseId,
          ].join("|");
          if (seenMovementEvents.has(key)) return false;
          seenMovementEvents.add(key);
          return true;
        });

      const price = productPrice(variation ?? product ?? { price: 0 });

      let sale: Record<string, unknown> | null = null;
      if (unit.soldInvoiceId || unit.status === "sold") {
        const invId = unit.soldInvoiceId;
        if (invId) {
          const inv = store.invoices.find((i) => i.id === invId) ?? null;
          if (inv) {
            const seller = inv.soldBy ? store.users.find((u) => u.id === inv.soldBy) ?? null : null;
            const saleWh = inv.warehouseId
              ? store.warehouses.find((w) => w.id === inv.warehouseId) ?? null
              : null;
            sale = {
              invoiceId: inv.id,
              invoiceNumber: inv.invoiceNumber,
              customerName: inv.customerName,
              customerPhone: inv.customerPhone,
              salesMethod: inv.salesMethod,
              salesMethodLabel: salesMethodLabel(inv.salesMethod),
              soldAt: inv.createdAt,
              warehouseId: inv.warehouseId,
              warehouseName: saleWh?.name ?? null,
              employeeId: inv.soldBy,
              employeeName: seller?.name ?? null,
              grandTotal: inv.grandTotal,
            };
          }
        }
      }

      return Response.json({
        ok: true,
        found: true,
        type: "unit",
        barcode,
        unit,
        product: product
          ? {
              ...product,
              sellingPrice: price,
              price,
              creatorName: creator?.name ?? null,
            }
          : null,
        variation,
        warehouse,
        history: enrichedHistory,
        sale,
      });
    }

    const product = store.products.find((p) => p.barcode === barcode) ?? null;
    if (product) {
      const variations = store.productVariations.filter((v) => v.productId === product.id);
      const price = productPrice(product);
      return Response.json({
        ok: true,
        found: true,
        type: "product",
        barcode,
        product: { ...product, sellingPrice: price, price },
        variations,
        unit: null,
        warehouse: null,
        history: [],
        sale: null,
      });
    }

    return Response.json({ ok: false, found: false, error: "بارکد یافت نشد" }, { status: 404 });
  } catch (e) {
    return Response.json({ ok: false, found: false, error: String(e) }, { status: 500 });
  }
}
