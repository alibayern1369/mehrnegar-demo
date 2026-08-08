import { getCurrentUser } from "@/mock/auth-helpers";
import { ensureSeeded, getStore, nextId } from "@/mock";
import { genDocumentNumber, runInTransaction, writeAudit } from "@/mock/inventory";
import { hasPermission } from "@/lib/permissions";
import { normalizeBarcode } from "@/lib/format";

export const dynamic = "force-dynamic";

type VariationCount = {
  variationId: number;
  color: string;
  size: string;
  price: number;
  systemQty: number;
};

function productNotDeleted(p: { status?: string | null }) {
  return p.status !== "deleted";
}

function matchLevel(declared: number, system: number): "match" | "partial" | "mismatch" {
  const diff = Math.abs(declared - system);
  if (diff === 0) return "match";
  if (system === 0) return declared <= 2 ? "partial" : "mismatch";
  const ratio = diff / system;
  if (diff <= 2 || ratio <= 0.1) return "partial";
  return "mismatch";
}

function countProductInWarehouse(
  store: ReturnType<typeof getStore>,
  productId: number,
  warehouseId: number,
) {
  const vars = store.productVariations.filter((v) => v.productId === productId);
  const units = store.productUnits.filter((u) =>
    u.productId === productId &&
    u.warehouseId === warehouseId &&
    u.status === "in_stock",
  );

  const byVar = new Map<number, number>();
  for (const u of units) {
    byVar.set(u.variationId, (byVar.get(u.variationId) ?? 0) + 1);
  }

  const variations: VariationCount[] = vars.map((v) => ({
    variationId: v.id,
    color: v.color,
    size: v.size,
    price: Number(v.price ?? 0),
    systemQty: byVar.get(v.id) ?? 0,
  }));

  const systemQty = variations.reduce((a, v) => a + v.systemQty, 0);
  const stockValue = variations.reduce((a, v) => a + v.systemQty * v.price, 0);
  const avgUnitPrice = systemQty > 0
    ? Math.round(stockValue / systemQty)
    : (variations[0]?.price ?? 0);

  return { variations, systemQty, avgUnitPrice, stockValue };
}

function listStockedProductIds(store: ReturnType<typeof getStore>, warehouseId: number): number[] {
  const ids = new Set<number>();
  for (const u of store.productUnits) {
    if (u.warehouseId === warehouseId && u.status === "in_stock") ids.add(u.productId);
  }
  return [...ids];
}

function loadSessionBundle(store: ReturnType<typeof getStore>, sessionId: number) {
  const session = store.stocktakeSessions.find((s) => s.id === sessionId);
  if (!session) return null;
  const items = store.stocktakeItems
    .filter((i) => i.sessionId === sessionId)
    .sort((a, b) => {
      const ta = a.checkedAt ? new Date(a.checkedAt).getTime() : 0;
      const tb = b.checkedAt ? new Date(b.checkedAt).getTime() : 0;
      return tb - ta;
    });
  return { session, items };
}

function summarizeItems(items: { level: string; qtyDiff: number; amountDiff: number | null }[]) {
  let matchCount = 0;
  let partialCount = 0;
  let mismatchCount = 0;
  let shortageQty = 0;
  let surplusQty = 0;
  let shortageAmount = 0;
  let surplusAmount = 0;
  for (const h of items) {
    if (h.level === "match") matchCount += 1;
    else if (h.level === "partial") partialCount += 1;
    else mismatchCount += 1;
    if (h.qtyDiff < 0) {
      shortageQty += Math.abs(h.qtyDiff);
      shortageAmount += Math.abs(Number(h.amountDiff) || 0);
    } else if (h.qtyDiff > 0) {
      surplusQty += h.qtyDiff;
      surplusAmount += Number(h.amountDiff) || 0;
    }
  }
  return {
    checkedProductCount: items.length,
    matchCount,
    partialCount,
    mismatchCount,
    shortageQty,
    surplusQty,
    shortageAmount,
    surplusAmount,
  };
}

export async function GET(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "stocktake") && !hasPermission(user, "warehouses") && !hasPermission(user, "report_transfers")) {
      return Response.json({ ok: false, error: "دسترسی مجاز نیست" }, { status: 403 });
    }

    const store = getStore();
    const url = new URL(req.url);
    const warehouseId = Number(url.searchParams.get("warehouseId") || 0);
    const productId = Number(url.searchParams.get("productId") || 0);
    const sessionId = Number(url.searchParams.get("sessionId") || 0);
    const sessionsOnly = url.searchParams.get("sessions") === "1";
    const activeOnly = url.searchParams.get("active") === "1";
    const q = String(url.searchParams.get("q") ?? "").trim();

    if (sessionId) {
      const bundle = loadSessionBundle(store, sessionId);
      if (!bundle) return Response.json({ ok: false, error: "جلسه یافت نشد" }, { status: 404 });
      return Response.json({ ok: true, ...bundle });
    }

    if (sessionsOnly) {
      const limit = Math.min(100, Math.max(10, Number(url.searchParams.get("limit") || 40)));
      const rows = warehouseId
        ? store.stocktakeSessions
          .filter((s) => s.warehouseId === warehouseId)
          .sort((a, b) => b.id - a.id)
          .slice(0, limit)
        : [...store.stocktakeSessions].sort((a, b) => b.id - a.id).slice(0, limit);
      return Response.json({ ok: true, sessions: rows });
    }

    if (activeOnly && warehouseId) {
      const active = store.stocktakeSessions
        .filter((s) => s.warehouseId === warehouseId && s.status === "in_progress")
        .sort((a, b) => b.id - a.id)[0];
      if (!active) return Response.json({ ok: true, session: null, items: [] });
      const items = store.stocktakeItems.filter((i) => i.sessionId === active.id);
      return Response.json({ ok: true, session: active, items });
    }

    if (!warehouseId) {
      return Response.json({ ok: false, error: "انبار الزامی است" }, { status: 400 });
    }

    const wh = store.warehouses.find((w) => w.id === warehouseId);
    if (!wh) return Response.json({ ok: false, error: "انبار یافت نشد" }, { status: 404 });

    if (productId) {
      const p = store.products.find((x) => x.id === productId && productNotDeleted(x));
      if (!p) return Response.json({ ok: false, error: "محصول یافت نشد" }, { status: 404 });
      const stock = countProductInWarehouse(store, productId, warehouseId);
      return Response.json({
        ok: true,
        warehouse: { id: wh.id, name: wh.name, code: wh.code },
        product: {
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          price: Number(p.price ?? p.sellingPrice ?? 0),
          ...stock,
        },
      });
    }

    const code = q ? normalizeBarcode(q) : "";
    let productRows = [];

    if (q) {
      const ql = q.toLowerCase();
      const stockedIds = listStockedProductIds(store, warehouseId);
      productRows = store.products
        .filter((p) =>
          productNotDeleted(p) &&
          stockedIds.includes(p.id) &&
          (
            p.name.toLowerCase().includes(ql) ||
            p.sku.toLowerCase().includes(ql) ||
            p.barcode.toLowerCase().includes(ql) ||
            (code && p.barcode === code)
          ),
        )
        .sort((a, b) => b.id - a.id)
        .slice(0, 80);
    } else {
      const ids = listStockedProductIds(store, warehouseId);
      productRows = store.products
        .filter((p) => productNotDeleted(p) && ids.includes(p.id))
        .sort((a, b) => a.name.localeCompare(b.name, "fa"));
    }

    const list = productRows.map((p) => {
      const stock = countProductInWarehouse(store, p.id, warehouseId);
      return {
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        price: Number(p.price ?? p.sellingPrice ?? 0),
        systemQty: stock.systemQty,
        variationCount: stock.variations.filter((v) => v.systemQty > 0).length || stock.variations.length,
        avgUnitPrice: stock.avgUnitPrice,
      };
    });

    const withStock = list.filter((p) => p.systemQty > 0);

    return Response.json({
      ok: true,
      warehouse: { id: wh.id, name: wh.name, code: wh.code },
      products: withStock,
      total: withStock.length,
    });
  } catch (e) {
    console.error("stocktake GET:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "stocktake") && !hasPermission(user, "warehouses")) {
      return Response.json({ ok: false, error: "دسترسی مجاز نیست" }, { status: 403 });
    }

    const body = await req.json();
    const action = String(body.action || "check");
    const store = getStore();

    if (action === "start") {
      const warehouseId = Number(body.warehouseId);
      const mode = body.mode === "selective" ? "selective" : "full";
      if (!warehouseId) return Response.json({ ok: false, error: "انبار الزامی است" }, { status: 400 });

      const wh = store.warehouses.find((w) => w.id === warehouseId);
      if (!wh) return Response.json({ ok: false, error: "انبار یافت نشد" }, { status: 404 });

      for (const s of store.stocktakeSessions.filter(
        (x) => x.warehouseId === warehouseId && x.status === "in_progress",
      )) {
        s.status = "partial";
        s.completedAt = new Date();
        s.notes = [s.notes, "بسته خودکار با شروع جلسه جدید"].filter(Boolean).join(" | ");
      }

      const stockedIds = listStockedProductIds(store, warehouseId);
      const sessionNumber = genDocumentNumber("STK");
      const session = {
        id: nextId(store, "stocktakeSessions"),
        sessionNumber,
        warehouseId: wh.id,
        warehouseName: wh.name,
        status: "in_progress",
        mode,
        expectedProductCount: stockedIds.length,
        checkedProductCount: null,
        matchCount: null,
        partialCount: null,
        mismatchCount: null,
        shortageQty: null,
        surplusQty: null,
        shortageAmount: null,
        surplusAmount: null,
        notes: null,
        operatorId: user.id,
        operatorName: user.name,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
      };
      store.stocktakeSessions.push(session);

      writeAudit(store, user, "شروع انبارگردانی", "stocktake_session", session.id,
        `${sessionNumber} — ${wh.name} — ${stockedIds.length} محصول مورد انتظار`,
        { warehouseId: wh.id, kind: "info" });

      return Response.json({ ok: true, session, expectedProductIds: stockedIds });
    }

    if (action === "complete") {
      const sessionId = Number(body.sessionId);
      if (!sessionId) return Response.json({ ok: false, error: "جلسه الزامی است" }, { status: 400 });
      const bundle = loadSessionBundle(store, sessionId);
      if (!bundle) return Response.json({ ok: false, error: "جلسه یافت نشد" }, { status: 404 });
      if (bundle.session.status !== "in_progress") {
        return Response.json({ ok: false, error: "این جلسه قبلاً بسته شده است" }, { status: 400 });
      }

      const expected = Number(bundle.session.expectedProductCount) || 0;
      const checked = bundle.items.length;
      const remaining = Math.max(0, expected - checked);
      const force = Boolean(body.force);

      if (remaining > 0 && !force) {
        return Response.json({
          ok: false,
          incomplete: true,
          remaining,
          expected,
          checked,
          error: `${remaining.toLocaleString("fa-IR")} محصول هنوز انبارگردانی نشده‌اند`,
        }, { status: 409 });
      }

      const summary = summarizeItems(bundle.items);
      const status = remaining > 0 ? "partial" : "completed";
      Object.assign(bundle.session, {
        ...summary,
        status,
        completedAt: new Date(),
        notes: remaining > 0
          ? `تکمیل ناقص — ${remaining} محصول بررسی نشد`
          : (body.notes ? String(body.notes) : bundle.session.notes),
      });

      writeAudit(store, user,
        status === "completed" ? "اتمام انبارگردانی کامل" : "اتمام انبارگردانی ناقص",
        "stocktake_session",
        sessionId,
        `${bundle.session.sessionNumber} — بررسی‌شده ${checked}/${expected} — کسری ${summary.shortageQty} / مازاد ${summary.surplusQty}`,
        { warehouseId: bundle.session.warehouseId, kind: status === "completed" ? "info" : "warning" },
      );

      return Response.json({
        ok: true,
        session: bundle.session,
        remaining,
        message: remaining > 0
          ? `جلسه با ${remaining.toLocaleString("fa-IR")} محصول باقی‌مانده به‌صورت ناقص بسته شد`
          : "انبارگردانی کامل ثبت شد",
      });
    }

    const warehouseId = Number(body.warehouseId);
    const productId = Number(body.productId);
    const sessionId = Number(body.sessionId || 0);
    const declaredQty = Math.round(Number(body.declaredQty));

    if (!warehouseId) return Response.json({ ok: false, error: "انبار الزامی است" }, { status: 400 });
    if (!productId) return Response.json({ ok: false, error: "محصول الزامی است" }, { status: 400 });
    if (!Number.isFinite(declaredQty) || declaredQty < 0) {
      return Response.json({ ok: false, error: "تعداد اظهار نامعتبر است" }, { status: 400 });
    }

    const wh = store.warehouses.find((w) => w.id === warehouseId);
    if (!wh) return Response.json({ ok: false, error: "انبار یافت نشد" }, { status: 404 });

    const p = store.products.find((x) => x.id === productId && productNotDeleted(x));
    if (!p) return Response.json({ ok: false, error: "محصول یافت نشد" }, { status: 404 });

    let session = sessionId
      ? store.stocktakeSessions.find((s) => s.id === sessionId)
      : undefined;

    if (session && session.status !== "in_progress") {
      return Response.json({ ok: false, error: "جلسه بسته شده است — جلسه جدید شروع کنید" }, { status: 400 });
    }

    if (!session) {
      const stockedIds = listStockedProductIds(store, warehouseId);
      session = {
        id: nextId(store, "stocktakeSessions"),
        sessionNumber: genDocumentNumber("STK"),
        warehouseId: wh.id,
        warehouseName: wh.name,
        status: "in_progress",
        mode: "selective",
        expectedProductCount: stockedIds.length,
        checkedProductCount: null,
        matchCount: null,
        partialCount: null,
        mismatchCount: null,
        shortageQty: null,
        surplusQty: null,
        shortageAmount: null,
        surplusAmount: null,
        notes: null,
        operatorId: user.id,
        operatorName: user.name,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
      };
      store.stocktakeSessions.push(session);
    }

    const stock = countProductInWarehouse(store, productId, warehouseId);
    const unitPrice = stock.avgUnitPrice || Number(p.price ?? p.sellingPrice ?? 0);
    const qtyDiff = declaredQty - stock.systemQty;
    const amountDiff = qtyDiff * unitPrice;
    const level = matchLevel(declaredQty, stock.systemQty);

    const issues: string[] = [];
    if (qtyDiff > 0) {
      issues.push(`اظهار شما ${qtyDiff.toLocaleString("fa-IR")} عدد بیشتر از موجودی سیستم است (مازاد اظهار)`);
      issues.push(`مبلغ مازاد تقریبی: ${Math.abs(amountDiff).toLocaleString("fa-IR")} تومان`);
    } else if (qtyDiff < 0) {
      issues.push(`اظهار شما ${Math.abs(qtyDiff).toLocaleString("fa-IR")} عدد کمتر از موجودی سیستم است (کسری اظهار)`);
      issues.push(`مبلغ کسری تقریبی: ${Math.abs(amountDiff).toLocaleString("fa-IR")} تومان`);
    }

    const message =
      level === "match"
        ? "همخوانی کامل — تعداد اظهار با موجودی سیستم یکی است"
        : level === "partial"
          ? `اختلاف جزئی — ${issues.join("؛ ")}`
          : `تناقض زیاد — ${issues.join("؛ ")}`;

    const result = runInTransaction((tx) => {
      const existing = tx.stocktakeItems.find(
        (i) => i.sessionId === session!.id && i.productId === productId,
      );

      const payload = {
        productName: p.name,
        sku: p.sku,
        barcode: p.barcode,
        systemQty: stock.systemQty,
        declaredQty,
        qtyDiff,
        unitPrice,
        amountDiff,
        level,
        message,
        issues,
        variationsSnapshot: stock.variations,
        checkedBy: user.name,
        checkedAt: new Date(),
      };

      let itemRow;
      if (existing) {
        Object.assign(existing, payload);
        itemRow = existing;
      } else {
        itemRow = {
          id: nextId(tx, "stocktakeItems"),
          sessionId: session!.id,
          productId: p.id,
          ...payload,
        };
        tx.stocktakeItems.push(itemRow);
      }

      const allItems = tx.stocktakeItems.filter((i) => i.sessionId === session!.id);
      const summary = summarizeItems(allItems);
      Object.assign(session!, summary);
      const updatedSession = session!;

      return { item: itemRow, session: updatedSession };
    });

    return Response.json({
      ok: true,
      result: {
        warehouseId: wh.id,
        warehouseName: wh.name,
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        barcode: p.barcode,
        declaredQty,
        systemQty: stock.systemQty,
        qtyDiff,
        unitPrice,
        amountDiff,
        stockValue: stock.stockValue,
        level,
        message,
        issues,
        variations: stock.variations,
        checkedAt: new Date().toISOString(),
        checkedBy: user.name,
        sessionId: result.session.id,
        itemId: result.item.id,
      },
      session: result.session,
    });
  } catch (e) {
    console.error("stocktake POST:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
