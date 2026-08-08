import { getCurrentUser } from "@/mock/auth-helpers";
import {
  ensureSeeded,
  getStore,
  nextId,
} from "@/mock";
import {
  bumpStock,
  createUnitsInWarehouse,
  getCentralWarehouse,
  productPrice,
  runInTransaction,
  writeAudit,
  writeLedger,
} from "@/mock/inventory";
import type { Return } from "@/mock/types";

export const dynamic = "force-dynamic";

function resolveReturnCredit(opts: {
  store: ReturnType<typeof getStore>;
  barcode: string;
  soldInvoiceId: number | null;
  invoiceItemId?: number | null;
  variationPrice: number;
  quantity: number;
}): { unitPrice: number; amount: number } {
  let unitPrice = Math.max(0, opts.variationPrice);

  if (opts.invoiceItemId) {
    const item = opts.store.invoiceItems.find((i) => i.id === opts.invoiceItemId);
    if (item) {
      unitPrice = Math.max(
        0,
        Math.round((Number(item.lineTotal) || 0) / Math.max(1, Number(item.quantity) || 1))
          || Number(item.unitPrice)
          || unitPrice,
      );
    }
  } else if (opts.soldInvoiceId) {
    const items = opts.store.invoiceItems.filter((i) => i.invoiceId === opts.soldInvoiceId);
    const item = items.find(
      (it) => it.barcode === opts.barcode || (it.unitBarcodes ?? []).includes(opts.barcode),
    );
    if (item) {
      unitPrice = Math.max(
        0,
        Math.round((Number(item.lineTotal) || 0) / Math.max(1, Number(item.quantity) || 1))
          || Number(item.unitPrice)
          || unitPrice,
      );
    }
  }

  const amount = unitPrice * Math.max(1, opts.quantity);
  return { unitPrice, amount };
}

export async function GET(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const store = getStore();
    const rows = user.role === "manager"
      ? [...store.returns].sort((a, b) => b.id - a.id)
      : store.returns.filter((r) => r.returnedBy === user.id).sort((a, b) => b.id - a.id);
    const warehouseNames = new Map(store.warehouses.map((warehouse) => [warehouse.id, warehouse.name]));

    return Response.json({
      ok: true,
      returns: rows.map((row) => ({
        ...row,
        returnWarehouseName: row.returnWarehouseId
          ? warehouseNames.get(row.returnWarehouseId) ?? null
          : null,
      })),
    });
  } catch (e) {
    return Response.json({ ok: false, returns: [], error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { barcode, quantity = 1, reason, notes, invoiceItemId, returnWarehouseId } = body;

    if (!barcode) return Response.json({ ok: false, error: "بارکد محصول الزامی است" }, { status: 400 });

    const mainWh = getCentralWarehouse();
    if (!mainWh) return Response.json({ ok: false, error: "انبار مرکزی یافت نشد" }, { status: 500 });
    const targetWarehouseId = Number(returnWarehouseId) || mainWh.id;
    const targetWh = getStore().warehouses.find((w) => w.id === targetWarehouseId);
    if (!targetWh || !targetWh.isActive) {
      return Response.json({ ok: false, error: "انبار مقصد معتبر نیست" }, { status: 400 });
    }

    const returnId = `RTN-${Date.now().toString(36).toUpperCase()}`;

    const ret = runInTransaction((store) => {
      const unit = store.productUnits.find((u) => u.barcode === barcode);

      let productId: number;
      let variationId: number | null = null;
      let unitId: number | null = null;
      let productName = "";
      let color: string | null = null;
      let size: string | null = null;
      let origInvoiceId: number | null = null;
      let origWarehouseId: number | null = null;
      let origSoldBy: number | null = null;
      let soldInvoiceId: number | null = null;
      let variationPrice = 0;
      const qty = unit ? 1 : Math.max(1, Number(quantity) || 1);

      if (unit) {
        if (unit.status !== "sold" && unit.status !== "adjusted_out") {
          if (unit.status === "in_stock") {
            throw new Error("این واحد هنوز فروخته نشده و مرجوعی ندارد");
          }
        }
        productId = unit.productId;
        variationId = unit.variationId;
        unitId = unit.id;
        const p = store.products.find((x) => x.id === unit.productId);
        const v = store.productVariations.find((x) => x.id === unit.variationId);
        productName = p?.name ?? "محصول";
        color = v?.color ?? null;
        size = v?.size ?? null;
        variationPrice = productPrice(v ?? p ?? { price: 0 });
        origWarehouseId = unit.warehouseId;
        soldInvoiceId = unit.soldInvoiceId ?? null;
        if (unit.soldInvoiceId) {
          origInvoiceId = unit.soldInvoiceId;
          const inv = store.invoices.find((i) => i.id === unit.soldInvoiceId);
          if (inv) {
            origSoldBy = inv.soldBy;
            origWarehouseId = inv.warehouseId;
          }
        }
      } else if (invoiceItemId) {
        const item = store.invoiceItems.find((i) => i.id === invoiceItemId);
        if (!item) throw new Error("قلم فاکتور یافت نشد");
        productId = item.productId;
        variationId = item.variationId;
        productName = item.productName;
        variationPrice = Number(item.unitPrice) || 0;
        origInvoiceId = item.invoiceId;
        soldInvoiceId = item.invoiceId;
        const inv = store.invoices.find((i) => i.id === item.invoiceId);
        if (inv) {
          origWarehouseId = inv.warehouseId;
          origSoldBy = inv.soldBy;
        }
        const existingRets = store.returns.filter(
          (r) => r.invoiceItemId === invoiceItemId && r.status === "returned",
        );
        const returnedQty = existingRets.reduce((a, r) => a + (r.quantity ?? 0), 0);
        if (returnedQty + qty > (item.quantity ?? 1)) {
          throw new Error("این کالا قبلاً مرجوع شده است");
        }
      } else {
        const p = store.products.find((x) => x.barcode === barcode);
        if (!p) throw new Error("بارکد یافت نشد");
        productId = p.id;
        productName = p.name;
        variationPrice = productPrice(p);
        const v = store.productVariations.find((x) => x.productId === p.id);
        variationId = v?.id ?? null;
        color = v?.color ?? p.color;
        size = v?.size ?? p.size;
        if (v) variationPrice = productPrice(v);
      }

      const credit = resolveReturnCredit({
        store,
        barcode,
        soldInvoiceId,
        invoiceItemId: invoiceItemId || null,
        variationPrice,
        quantity: qty,
      });

      const retRow: Return = {
        id: nextId(store, "returns"),
        returnId,
        invoiceId: origInvoiceId,
        invoiceItemId: invoiceItemId || null,
        productId,
        variationId,
        unitId,
        barcode,
        productName,
        quantity: qty,
        unitPrice: credit.unitPrice,
        amount: credit.amount,
        affectsSales: true,
        originalWarehouseId: origWarehouseId,
        returnWarehouseId: targetWh.id,
        originalSoldBy: origSoldBy,
        returnedBy: user.id,
        reason: reason || null,
        notes: notes || null,
        status: "returned",
        createdAt: new Date(),
      };
      store.returns.push(retRow);

      if (unit) {
        unit.status = "in_stock";
        unit.warehouseId = targetWh.id;
        unit.soldInvoiceId = null;
        unit.soldAt = null;
        unit.updatedAt = new Date();
        bumpStock(store, productId, unit.variationId, targetWh.id, 1);
        writeLedger(store, [{
          productId,
          variationId: unit.variationId,
          unitId: unit.id,
          barcode: unit.barcode,
          productName,
          color,
          size,
          quantity: 1,
          sourceWarehouseId: origWarehouseId,
          destWarehouseId: targetWh.id,
          transactionType: "return",
          operatorId: user.id,
          operatorName: user.name,
          documentNumber: returnId,
          reference: returnId,
        }]);
      } else if (variationId) {
        createUnitsInWarehouse(store, {
          productId,
          variationId,
          warehouseId: targetWh.id,
          quantity: qty,
          productName,
          color,
          size,
          operator: user,
          documentNumber: returnId,
          transactionType: "return",
          reference: returnId,
        });
      }

      writeAudit(store, user, "ثبت مرجوعی", "return", retRow.id,
        `مرجوعی ${returnId} — ${productName} — تعداد: ${qty} — مبلغ: ${credit.amount}`,
        { warehouseId: targetWh.id, kind: "info" },
      );

      return retRow;
    });

    return Response.json({
      ok: true,
      return: { ...ret, returnWarehouseName: targetWh.name },
    });
  } catch (e) {
    console.error("Return error:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 400 });
  }
}
