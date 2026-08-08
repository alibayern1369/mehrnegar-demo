import type { MockStore } from "@/mock/store";
import { TEST_SKU_PREFIX } from "@/lib/test-catalog";

export function productNotDeleted(p: { status?: string | null }) {
  return p.status !== "deleted";
}

export async function softDeleteProduct(store: MockStore, productId: number) {
  const p = store.products.find((x) => x.id === productId);
  if (p) {
    p.status = "deleted";
    p.updatedAt = new Date();
  }
}

export async function deleteProductCascade(store: MockStore, productId: number) {
  const unitIds = store.productUnits.filter((u) => u.productId === productId).map((u) => u.id);
  if (unitIds.length) {
    store.stockDocumentUnits = store.stockDocumentUnits.filter((u) => !unitIds.includes(u.unitId));
  }
  store.returns = store.returns.filter((r) => r.productId !== productId);
  store.invoiceItems = store.invoiceItems.filter((i) => i.productId !== productId);
  store.stockDocumentItems = store.stockDocumentItems.filter((i) => i.productId !== productId);
  for (const e of store.inventoryLedger) {
    if (e.productId === productId) {
      e.productId = null;
      e.variationId = null;
      e.unitId = null;
    }
  }
  store.warehouseStock = store.warehouseStock.filter((s) => s.productId !== productId);
  store.variationStock = store.variationStock.filter((s) => s.productId !== productId);
  store.productUnits = store.productUnits.filter((u) => u.productId !== productId);
  store.productVariations = store.productVariations.filter((v) => v.productId !== productId);
  store.products = store.products.filter((p) => p.id !== productId);
}

function hasSalesHistory(store: MockStore, productId: number) {
  if (store.invoiceItems.some((i) => i.productId === productId)) return true;
  return store.returns.some((r) => r.productId === productId);
}

export async function removeProduct(store: MockStore, productId: number): Promise<"hard" | "soft"> {
  if (hasSalesHistory(store, productId)) {
    await softDeleteProduct(store, productId);
    return "soft";
  }
  await deleteProductCascade(store, productId);
  return "hard";
}

export async function deleteAllTestProducts(store: MockStore) {
  const rows = store.products.filter((p) => p.sku.startsWith(TEST_SKU_PREFIX));
  for (const row of rows) {
    await deleteProductCascade(store, row.id);
  }
  return { deleted: rows.length, products: rows };
}
