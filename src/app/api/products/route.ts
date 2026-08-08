import { ensureSeeded } from "@/mock/ensure-seeded";
import { getStore, nextId, type MockStore } from "@/mock/store";
import type { Product, ProductUnit } from "@/mock/types";
import {
  getCentralWarehouse,
  createUnitsInWarehouse,
  runInTransaction,
  writeAudit,
  productPrice,
  bumpStock,
  writeLedger,
} from "@/mock/inventory";
import { getCurrentUser, isManager } from "@/mock/auth-helpers";
import { normalizeBarcode } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { TEST_SKU_PREFIX } from "@/lib/test-catalog";
import { demoModeBlockedMessage, isDemoMode } from "@/lib/demo";

export const dynamic = "force-dynamic";

function isProductNotDeleted(p: Product): boolean {
  return p.status !== "deleted";
}

function enrichProduct(store: MockStore, p: Product) {
  const stock = store.warehouseStock.filter((s) => s.productId === p.id);
  const variations = store.productVariations.filter((v) => v.productId === p.id);
  const varStock = store.variationStock.filter((s) => s.productId === p.id);
  const price = productPrice(p);
  return {
    ...p,
    price,
    sellingPrice: price,
    purchasePrice: 0,
    stock,
    variations: variations.map((v) => ({
      ...v,
      stock: varStock.filter((s) => s.variationId === v.id),
    })),
  };
}

function deleteProductCascade(store: MockStore, productId: number) {
  const unitIds = store.productUnits.filter((u) => u.productId === productId).map((u) => u.id);

  if (unitIds.length) {
    store.stockDocumentUnits = store.stockDocumentUnits.filter(
      (u) => !unitIds.includes(u.unitId),
    );
  }

  store.returns = store.returns.filter((r) => r.productId !== productId);
  store.invoiceItems = store.invoiceItems.filter((i) => i.productId !== productId);
  store.stockDocumentItems = store.stockDocumentItems.filter((i) => i.productId !== productId);

  for (const entry of store.inventoryLedger) {
    if (entry.productId === productId) {
      entry.productId = null;
      entry.variationId = null;
      entry.unitId = null;
    }
  }

  store.warehouseStock = store.warehouseStock.filter((s) => s.productId !== productId);
  store.variationStock = store.variationStock.filter((s) => s.productId !== productId);
  store.productUnits = store.productUnits.filter((u) => u.productId !== productId);
  store.productVariations = store.productVariations.filter((v) => v.productId !== productId);
  store.products = store.products.filter((p) => p.id !== productId);
}

function hasSalesHistory(store: MockStore, productId: number): boolean {
  if (store.invoiceItems.some((i) => i.productId === productId)) return true;
  return store.returns.some((r) => r.productId === productId);
}

function removeProduct(store: MockStore, productId: number): "hard" | "soft" {
  if (hasSalesHistory(store, productId)) {
    const product = store.products.find((p) => p.id === productId);
    if (product) {
      product.status = "deleted";
      product.updatedAt = new Date();
    }
    return "soft";
  }
  deleteProductCascade(store, productId);
  return "hard";
}

function deleteAllTestProducts(store: MockStore) {
  const rows = store.products
    .filter((p) => p.sku.startsWith(TEST_SKU_PREFIX))
    .map((p) => ({ id: p.id, name: p.name, sku: p.sku }));

  for (const row of rows) {
    deleteProductCascade(store, row.id);
  }

  return { deleted: rows.length, products: rows };
}

export async function GET(req: Request) {
  try {
    ensureSeeded();
    const store = getStore();
    const { searchParams } = new URL(req.url);
    const barcode = searchParams.get("barcode")?.trim();
    const warehouseId = searchParams.get("warehouseId");
    const productId = searchParams.get("id");
    const withUnits = searchParams.get("units") === "1";
    const query = searchParams.get("q")?.trim();

    if (query && query.length >= 2) {
      const whId = Number(warehouseId);
      const qLower = query.toLowerCase();
      const matches = store.products
        .filter(
          (p) =>
            isProductNotDeleted(p) &&
            p.status === "active" &&
            p.name.toLowerCase().includes(qLower),
        )
        .sort((a, b) => b.id - a.id)
        .slice(0, 12);

      const results = matches.map((product) => {
        const variations = store.productVariations.filter(
          (v) => v.productId === product.id && v.status === "active",
        );
        const units = whId
          ? store.productUnits
              .filter(
                (u) =>
                  u.productId === product.id &&
                  u.warehouseId === whId &&
                  u.status === "in_stock",
              )
              .sort((a, b) => b.id - a.id)
              .slice(0, 80)
          : [];
        const stockCount = whId
          ? store.productUnits.filter(
              (u) =>
                u.productId === product.id &&
                u.warehouseId === whId &&
                u.status === "in_stock",
            ).length
          : 0;
        const variationMap = new Map(variations.map((v) => [v.id, v]));
        return {
          id: product.id,
          name: product.name,
          price: productPrice(product),
          availableCount: stockCount,
          units: units.map((unit) => {
            const variation = variationMap.get(unit.variationId);
            return {
              barcode: unit.barcode,
              variationId: unit.variationId,
              color: variation?.color ?? null,
              size: variation?.size ?? null,
              price: productPrice(variation ?? product),
            };
          }),
        };
      });

      return Response.json({ ok: true, products: results });
    }

    if (productId) {
      const id = Number(productId);
      if (!id) return Response.json({ ok: false, error: "شناسه نامعتبر" }, { status: 400 });
      const p = store.products.find((x) => x.id === id && isProductNotDeleted(x));
      if (!p) return Response.json({ ok: false, error: "محصول یافت نشد" }, { status: 404 });
      const enriched = enrichProduct(store, p);
      let units: (ProductUnit & { warehouseName?: string | null })[] = [];
      if (withUnits) {
        const whMap = Object.fromEntries(store.warehouses.map((w) => [w.id, w.name]));
        units = store.productUnits
          .filter((u) => u.productId === id)
          .sort((a, b) => b.id - a.id)
          .map((u) => ({
            ...u,
            warehouseName: u.warehouseId ? whMap[u.warehouseId] ?? null : null,
          }));
      }
      return Response.json({ ok: true, product: enriched, units });
    }

    if (barcode) {
      const code = normalizeBarcode(barcode);
      const unit = store.productUnits.find((u) => u.barcode === code);
      if (unit) {
        const p = store.products.find(
          (x) => x.id === unit.productId && isProductNotDeleted(x),
        );
        const variation = store.productVariations.find((v) => v.id === unit.variationId);
        if (!p) return Response.json({ ok: true, products: [], lookupType: "unit" });

        const enriched = enrichProduct(store, p);
        const whId = warehouseId ? Number(warehouseId) : unit.warehouseId;
        let available = 0;
        if (whId) {
          const vs = store.variationStock.find(
            (s) => s.variationId === unit.variationId && s.warehouseId === whId,
          );
          available = vs?.quantity ?? 0;
        }

        return Response.json({
          ok: true,
          lookupType: "unit",
          products: [{
            ...enriched,
            variationId: unit.variationId,
            variation,
            unit: {
              id: unit.id,
              barcode: unit.barcode,
              warehouseId: unit.warehouseId,
              status: unit.status,
            },
            availableAtWarehouse: available,
            scannedBarcode: code,
          }],
        });
      }

      const byProduct = store.products.filter(
        (p) => p.barcode === code && isProductNotDeleted(p),
      );
      if (byProduct.length) {
        const withStock = byProduct.map((p) => enrichProduct(store, p));
        return Response.json({ ok: true, lookupType: "product", products: withStock });
      }

      return Response.json({ ok: true, products: [], lookupType: "none" });
    }

    const rows = store.products
      .filter(isProductNotDeleted)
      .sort((a, b) => b.id - a.id);
    const withStock = rows.map((p) => enrichProduct(store, p));
    return Response.json({ ok: true, products: withStock });
  } catch (e) {
    return Response.json({ ok: false, products: [], error: String(e) }, { status: 500 });
  }
}

type VariationInput = {
  color: string;
  size: string;
  price?: number;
  quantity?: number;
  sku?: string;
};

export async function POST(req: Request) {
  try {
    ensureSeeded();
    const body = await req.json();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!isManager(user) && !hasPermission(user, "create_product")) {
      return Response.json({ ok: false, error: "دسترسی ثبت محصول ندارید" }, { status: 403 });
    }
    const central = getCentralWarehouse();
    if (!central) {
      return Response.json({ ok: false, error: "انبار مرکزی یافت نشد — ابتدا setup را اجرا کنید" }, { status: 500 });
    }

    const name = String(body.name ?? "").trim();
    if (!name) return Response.json({ ok: false, error: "نام محصول الزامی است" }, { status: 400 });

    const basePrice = Number(body.price ?? body.sellingPrice ?? 0) || 0;
    const category = body.category || "عمومی";
    const brand = body.brand ?? "کامفی فیتس";
    const supplier = body.supplier ?? brand;

    let variations: VariationInput[] = [];
    if (Array.isArray(body.variations) && body.variations.length) {
      variations = body.variations.map((v: VariationInput) => ({
        color: String(v.color ?? "").trim() || "پیش‌فرض",
        size: String(v.size ?? "").trim() || "فری سایز",
        price: Number(v.price ?? basePrice) || 0,
        quantity: Math.max(0, Number(v.quantity) || 0),
        sku: v.sku,
      }));
    } else if (Array.isArray(body.colors) && Array.isArray(body.sizes)) {
      const colors: string[] = body.colors.length ? body.colors : ["پیش‌فرض"];
      const sizes: string[] = body.sizes.length ? body.sizes : ["فری سایز"];
      const defaultQty = Math.max(0, Number(body.defaultQuantity) || 0);
      for (const color of colors) {
        for (const size of sizes) {
          variations.push({
            color: String(color).trim() || "پیش‌فرض",
            size: String(size).trim() || "فری سایز",
            price: basePrice,
            quantity: defaultQty,
          });
        }
      }
    } else {
      variations = [{
        color: String(body.color ?? "پیش‌فرض").trim() || "پیش‌فرض",
        size: String(body.size ?? "فری سایز").trim() || "فری سایز",
        price: basePrice,
        quantity: Math.max(0, Number(body.quantity ?? body.initialQuantity) || 0),
      }];
    }

    const seen = new Set<string>();
    variations = variations.filter((v) => {
      const key = `${v.color}||${v.size}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (!variations.length) {
      return Response.json({ ok: false, error: "حداقل یک ورییشن لازم است" }, { status: 400 });
    }

    const parentSku = body.sku?.trim() || `CF-${Date.now().toString(36).toUpperCase()}`;
    const parentBarcode = body.barcode?.trim() || `P${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const result = runInTransaction((tx) => {
      const now = new Date();
      const productId = nextId(tx, "products");
      const product: Product = {
        id: productId,
        name,
        sku: parentSku,
        barcode: parentBarcode,
        category,
        brand,
        supplier,
        description: body.description ?? null,
        color: variations[0].color,
        size: variations[0].size,
        purchasePrice: 0,
        sellingPrice: basePrice,
        price: basePrice,
        tax: Number(body.tax) || 9,
        status: "active",
        createdBy: user?.id ?? null,
        createdAt: now,
        updatedAt: now,
      };
      tx.products.push(product);

      const createdVariations = [];
      let totalUnits = 0;

      for (let i = 0; i < variations.length; i++) {
        const v = variations[i];
        const vSku = v.sku || `${parentSku}-${i + 1}`;
        const variationId = nextId(tx, "productVariations");
        const variation = {
          id: variationId,
          productId: product.id,
          sku: vSku,
          color: v.color,
          size: v.size,
          price: v.price ?? basePrice,
          status: "active",
          createdAt: now,
        };
        tx.productVariations.push(variation);

        const qty = v.quantity ?? 0;
        let barcodes: string[] = [];
        if (qty > 0) {
          barcodes = createUnitsInWarehouse(tx, {
            productId: product.id,
            variationId: variation.id,
            warehouseId: central.id,
            quantity: qty,
            productName: name,
            color: v.color,
            size: v.size,
            operator: user,
            transactionType: "receipt",
            reference: `product-create-${product.id}`,
          });
          totalUnits += qty;
        }

        createdVariations.push({ ...variation, quantity: qty, barcodes });
      }

      writeAudit(tx, user, "ایجاد محصول", "product", product.id,
        `محصول «${name}» با ${createdVariations.length} ورییشن و ${totalUnits} واحد در انبار مرکزی ایجاد شد`,
        { warehouseId: central.id, kind: "success", newValue: { variations: createdVariations.length, units: totalUnits } },
      );

      return { product, variations: createdVariations, totalUnits, centralWarehouseId: central.id };
    });

    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("Product create error:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

/** Add stock (new unit barcodes) or remove in-stock units for a product variation */
export async function PATCH(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!isManager(user) && !hasPermission(user, "edit_product")) {
      return Response.json({ ok: false, error: "دسترسی ویرایش محصول ندارید" }, { status: 403 });
    }

    const body = await req.json();
    const productId = Number(body.productId);
    if (!productId) return Response.json({ ok: false, error: "شناسه محصول الزامی است" }, { status: 400 });

    const store = getStore();
    const product = store.products.find((p) => p.id === productId);
    if (!product) return Response.json({ ok: false, error: "محصول یافت نشد" }, { status: 404 });

    const central = getCentralWarehouse();
    if (!central) return Response.json({ ok: false, error: "انبار مرکزی یافت نشد" }, { status: 500 });

    const warehouseId = Number(body.warehouseId) || central.id;
    const adjustments: { variationId: number; addQuantity?: number; removeBarcodes?: string[] }[] =
      Array.isArray(body.adjustments) ? body.adjustments : [];

    if (!adjustments.length) {
      return Response.json({ ok: false, error: "هیچ تغییری ارسال نشده" }, { status: 400 });
    }

    const result = runInTransaction((tx) => {
      const createdLabels: { barcode: string; variationId: number; color: string; size: string; price: number }[] = [];
      let added = 0;
      let removed = 0;

      for (const adj of adjustments) {
        const variationId = Number(adj.variationId);
        const variation = tx.productVariations.find(
          (v) => v.id === variationId && v.productId === productId,
        );
        if (!variation) throw new Error(`ورییشن ${variationId} یافت نشد`);

        const addQty = Math.max(0, Number(adj.addQuantity) || 0);
        if (addQty > 0) {
          const barcodes = createUnitsInWarehouse(tx, {
            productId,
            variationId,
            warehouseId,
            quantity: addQty,
            productName: product.name,
            color: variation.color,
            size: variation.size,
            operator: user,
            transactionType: "receipt",
            reference: `stock-adjust-${productId}`,
          });
          added += barcodes.length;
          const price = Number(variation.price ?? product.price ?? 0);
          for (const bc of barcodes) {
            createdLabels.push({
              barcode: bc,
              variationId,
              color: variation.color,
              size: variation.size,
              price,
            });
          }
        }

        const removeList = (adj.removeBarcodes ?? []).map(normalizeBarcode).filter(Boolean);
        for (const bc of removeList) {
          const unit = tx.productUnits.find((u) => u.barcode === bc);
          if (!unit || unit.productId !== productId) throw new Error(`بارکد ${bc} متعلق به این محصول نیست`);
          if (unit.status !== "in_stock") throw new Error(`بارکد ${bc} قابل حذف از موجودی نیست (${unit.status})`);
          const unitWh = unit.warehouseId ?? warehouseId;
          unit.status = "adjusted_out";
          unit.warehouseId = null;
          unit.updatedAt = new Date();
          bumpStock(tx, productId, variationId, unitWh, -1);
          writeLedger(tx, [{
            productId,
            variationId,
            unitId: unit.id,
            barcode: unit.barcode,
            productName: product.name,
            color: variation.color,
            size: variation.size,
            quantity: -1,
            sourceWarehouseId: unitWh,
            destWarehouseId: null,
            transactionType: "adjustment",
            operatorId: user.id,
            operatorName: user.name,
            reference: `stock-adjust-${productId}`,
          }]);
          removed += 1;
        }
      }

      writeAudit(tx, user, "ویرایش موجودی", "product", productId,
        `افزایش ${added} واحد / کاهش ${removed} واحد برای «${product.name}»`,
        { warehouseId, kind: "success", newValue: { added, removed } },
      );

      return { added, removed, createdLabels };
    });

    const tx = getStore();
    const updatedProduct = tx.products.find((p) => p.id === productId)!;
    const enriched = enrichProduct(tx, updatedProduct);
    const units = tx.productUnits
      .filter((u) => u.productId === productId)
      .sort((a, b) => b.id - a.id);

    return Response.json({ ok: true, ...result, product: enriched, units });
  } catch (e) {
    console.error("Product stock adjust error:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const url = new URL(req.url);
    const testOnly = url.searchParams.get("test") === "1";
    const id = Number(url.searchParams.get("id") || 0);

    if (testOnly) {
      if (isDemoMode()) {
        return Response.json({ ok: false, error: demoModeBlockedMessage() }, { status: 403 });
      }
      if (!isManager(user) && !hasPermission(user, "settings") && !hasPermission(user, "delete_product")) {
        return Response.json({ ok: false, error: "دسترسی حذف محصولات تست ندارید" }, { status: 403 });
      }

      const result = runInTransaction((tx) => {
        const purged = deleteAllTestProducts(tx);
        writeAudit(tx, user, "حذف محصولات تست", "product", null,
          `${purged.deleted} محصول تست (SKU با پیشوند ${TEST_SKU_PREFIX}) حذف شد`,
          { kind: "warning", newValue: { deleted: purged.deleted, skus: purged.products.map((p) => p.sku) } },
        );
        return purged;
      });

      return Response.json({ ok: true, deleted: result.deleted, products: result.products });
    }

    if (!id) return Response.json({ ok: false, error: "شناسه نامعتبر" }, { status: 400 });
    if (!isManager(user) && !hasPermission(user, "delete_product")) {
      return Response.json({ ok: false, error: "دسترسی حذف محصول ندارید" }, { status: 403 });
    }

    const store = getStore();
    const product = store.products.find((p) => p.id === id && isProductNotDeleted(p));
    if (!product) return Response.json({ ok: false, error: "محصول یافت نشد" }, { status: 404 });

    const mode = runInTransaction((tx) => {
      const result = removeProduct(tx, id);
      writeAudit(tx, user, "حذف محصول", "product", id,
        result === "hard"
          ? `محصول «${product.name}» (${product.sku}) به‌طور کامل حذف شد`
          : `محصول «${product.name}» (${product.sku}) از فهرست محصولات حذف شد (تاریخچه فاکتور حفظ شد)`,
        { kind: "warning", prevValue: { name: product.name, sku: product.sku, mode: result } },
      );
      return result;
    });

    return Response.json({ ok: true, deletedId: id, mode });
  } catch (e) {
    console.error("Product delete error:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
