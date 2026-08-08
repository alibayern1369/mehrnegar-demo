import { getCurrentUser, isManager } from "@/mock/auth-helpers";
import { ensureSeeded, getStore, nextId } from "@/mock";
import {
  genDocumentNumber,
  getCentralWarehouse,
  moveUnitsBetweenWarehouses,
  runInTransaction,
  writeAudit,
} from "@/mock/inventory";

export const dynamic = "force-dynamic";

type TransferItem = { variationId: number; quantity: number; barcodes?: string[] };

function loadDocument(store: ReturnType<typeof getStore>, id: number) {
  const doc = store.stockDocuments.find((d) => d.id === id);
  if (!doc) return null;
  const items = store.stockDocumentItems.filter((i) => i.documentId === id);
  const units = store.stockDocumentUnits.filter((u) => u.documentId === id);
  const findWh = (wid: number | null) => store.warehouses.find((w) => w.id === wid) ?? null;
  return {
    ...doc,
    sourceWarehouse: findWh(doc.sourceWarehouseId),
    destWarehouse: findWh(doc.destWarehouseId),
    items: items.map((it) => ({
      ...it,
      barcodes: units.filter((u) => u.itemId === it.id).map((u) => u.barcode),
    })),
  };
}

export async function GET(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const store = getStore();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const number = searchParams.get("number");

    if (id) {
      const doc = loadDocument(store, Number(id));
      if (!doc) return Response.json({ ok: false, error: "سند یافت نشد" }, { status: 404 });
      return Response.json({ ok: true, document: doc });
    }
    if (number) {
      const row = store.stockDocuments.find((d) => d.documentNumber === number);
      if (!row) return Response.json({ ok: false, error: "سند یافت نشد" }, { status: 404 });
      const doc = loadDocument(store, row.id);
      return Response.json({ ok: true, document: doc });
    }

    const type = searchParams.get("type");
    const warehouseId = searchParams.get("warehouseId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const q = searchParams.get("q");

    let rows = [...store.stockDocuments].sort((a, b) => b.id - a.id).slice(0, 300);

    if (type) rows = rows.filter((r) => r.type === type);
    if (warehouseId) {
      const wid = Number(warehouseId);
      rows = rows.filter((r) => r.sourceWarehouseId === wid || r.destWarehouseId === wid);
    }
    if (from) {
      const f = new Date(from);
      rows = rows.filter((r) => r.createdAt && new Date(r.createdAt) >= f);
    }
    if (to) {
      const t = new Date(to);
      t.setHours(23, 59, 59, 999);
      rows = rows.filter((r) => r.createdAt && new Date(r.createdAt) <= t);
    }
    if (q) {
      rows = rows.filter((r) =>
        r.documentNumber.includes(q) ||
        (r.operatorName ?? "").includes(q) ||
        (r.notes ?? "").includes(q),
      );
    }

    const documents = rows.map((d) => ({
      ...d,
      sourceWarehouse: store.warehouses.find((w) => w.id === d.sourceWarehouseId) ?? null,
      destWarehouse: store.warehouses.find((w) => w.id === d.destWarehouseId) ?? null,
    }));

    return Response.json({ ok: true, documents });
  } catch (e) {
    return Response.json({ ok: false, documents: [], error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!isManager(user)) {
      return Response.json({ ok: false, error: "فقط مدیر می‌تواند انتقال/توزیع انجام دهد" }, { status: 403 });
    }

    const body = await req.json();
    const type = body.type === "distribution" ? "distribution" : "transfer";
    const items: TransferItem[] = body.items ?? [];
    const notes = body.notes ? String(body.notes) : null;

    if (!items.length) {
      return Response.json({ ok: false, error: "حداقل یک قلم لازم است" }, { status: 400 });
    }

    const central = getCentralWarehouse();
    if (!central) return Response.json({ ok: false, error: "انبار مرکزی یافت نشد" }, { status: 500 });

    let sourceWarehouseId = Number(body.sourceWarehouseId);
    let destWarehouseId = Number(body.destWarehouseId);

    if (type === "distribution") {
      sourceWarehouseId = central.id;
      if (!destWarehouseId) {
        return Response.json({ ok: false, error: "انبار مقصد الزامی است" }, { status: 400 });
      }
      if (destWarehouseId === central.id) {
        return Response.json({ ok: false, error: "توزیع به انبار مرکزی مجاز نیست" }, { status: 400 });
      }
    } else {
      if (!sourceWarehouseId || !destWarehouseId) {
        return Response.json({ ok: false, error: "انبار مبدأ و مقصد الزامی است" }, { status: 400 });
      }
    }

    if (sourceWarehouseId === destWarehouseId) {
      return Response.json({ ok: false, error: "انبار مبدأ و مقصد یکسان است" }, { status: 400 });
    }

    const prefix = type === "distribution" ? "DIST" : "TRF";
    const documentNumber = genDocumentNumber(prefix);

    const doc = runInTransaction((store) => {
      let totalQty = 0;
      const itemResults: {
        productId: number; variationId: number; productName: string;
        color: string; size: string; quantity: number;
        barcodeStart: string; barcodeEnd: string; unitIds: { id: number; barcode: string }[];
      }[] = [];

      for (const raw of items) {
        const variationId = Number(raw.variationId);
        const quantity = Number(raw.quantity);
        if (!variationId || quantity <= 0) throw new Error("قلم نامعتبر");

        const variation = store.productVariations.find((v) => v.id === variationId);
        if (!variation) throw new Error(`ورییشن ${variationId} یافت نشد`);
        const product = store.products.find((p) => p.id === variation.productId);
        if (!product) throw new Error("محصول یافت نشد");

        const vs = store.variationStock.find(
          (s) => s.variationId === variationId && s.warehouseId === sourceWarehouseId,
        );
        if (!vs || (vs.quantity ?? 0) < quantity) {
          throw new Error(`موجودی ناکافی: ${product.name} / ${variation.color} / ${variation.size}`);
        }

        const moved = moveUnitsBetweenWarehouses(store, {
          productId: product.id,
          variationId,
          sourceWarehouseId,
          destWarehouseId,
          quantity,
          productName: product.name,
          color: variation.color,
          size: variation.size,
          operator: user,
          documentNumber,
          transactionType: type,
          reference: type,
          barcodes: Array.isArray(raw.barcodes) ? raw.barcodes.map(String) : undefined,
        });

        const barcodes = moved.map((u) => u.barcode).sort();
        itemResults.push({
          productId: product.id,
          variationId,
          productName: product.name,
          color: variation.color,
          size: variation.size,
          quantity,
          barcodeStart: barcodes[0],
          barcodeEnd: barcodes[barcodes.length - 1],
          unitIds: moved.map((u) => ({ id: u.id, barcode: u.barcode })),
        });
        totalQty += quantity;
      }

      const now = new Date();
      const document = {
        id: nextId(store, "stockDocuments"),
        documentNumber,
        type,
        sourceWarehouseId,
        destWarehouseId,
        operatorId: user.id,
        operatorName: user.name,
        notes,
        status: "completed",
        totalItems: itemResults.length,
        totalQuantity: totalQty,
        createdAt: now,
      };
      store.stockDocuments.push(document);

      for (const it of itemResults) {
        const itemRow = {
          id: nextId(store, "stockDocumentItems"),
          documentId: document.id,
          productId: it.productId,
          variationId: it.variationId,
          productName: it.productName,
          color: it.color,
          size: it.size,
          quantity: it.quantity,
          barcodeStart: it.barcodeStart,
          barcodeEnd: it.barcodeEnd,
        };
        store.stockDocumentItems.push(itemRow);

        if (it.unitIds.length) {
          for (const u of it.unitIds) {
            store.stockDocumentUnits.push({
              id: nextId(store, "stockDocumentUnits"),
              documentId: document.id,
              itemId: itemRow.id,
              unitId: u.id,
              barcode: u.barcode,
            });
          }
        }
      }

      writeAudit(store, user,
        type === "distribution" ? "توزیع انبار" : "انتقال بین انبار",
        "stock_document",
        document.id,
        `سند ${documentNumber} — ${totalQty} واحد از انبار ${sourceWarehouseId} به ${destWarehouseId}`,
        { warehouseId: destWarehouseId, kind: "success" },
      );

      return document;
    });

    const full = loadDocument(getStore(), doc.id);
    return Response.json({ ok: true, document: full });
  } catch (e) {
    console.error("Transfer error:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 400 });
  }
}
