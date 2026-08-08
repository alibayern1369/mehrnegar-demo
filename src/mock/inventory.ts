import { getStore, nextId } from "./store";
import type { MockStore } from "./store";
import type { ProductUnit, SessionUser } from "./types";

export const CENTRAL_CODE = "main";

export type MockTx = MockStore;

export function getMockTx(): MockTx {
  return getStore();
}

export function getCentralWarehouse(store: MockStore = getStore()) {
  return store.warehouses.find((w) => w.code === CENTRAL_CODE) ?? null;
}

/** Allocate N unique unit barcodes atomically */
export function allocateBarcodes(count: number, store: MockStore = getStore()): string[] {
  if (count <= 0) return [];

  let seq = store.barcodeSequence.find((s) => s.name === "unit");
  if (!seq) {
    seq = { id: 1, name: "unit", nextVal: 2800000001001 };
    store.barcodeSequence.push(seq);
  }

  const start = seq.nextVal;
  seq.nextVal += count;

  return Array.from({ length: count }, (_, i) => String(start + i));
}

export function bumpStock(
  store: MockStore,
  productId: number,
  variationId: number,
  warehouseId: number,
  delta: number,
) {
  const vs = store.variationStock.find(
    (s) => s.variationId === variationId && s.warehouseId === warehouseId,
  );
  if (vs) {
    const next = (vs.quantity ?? 0) + delta;
    if (next < 0) throw new Error("موجودی نمی‌تواند منفی شود");
    vs.quantity = next;
    vs.updatedAt = new Date();
  } else {
    if (delta < 0) throw new Error("موجودی نمی‌تواند منفی شود");
    store.variationStock.push({
      id: nextId(store, "variationStock"),
      variationId,
      productId,
      warehouseId,
      quantity: delta,
      updatedAt: new Date(),
    });
  }

  const ws = store.warehouseStock.find(
    (s) => s.productId === productId && s.warehouseId === warehouseId,
  );
  if (ws) {
    const next = (ws.quantity ?? 0) + delta;
    if (next < 0) throw new Error("موجودی نمی‌تواند منفی شود");
    ws.quantity = next;
    ws.updatedAt = new Date();
  } else {
    if (delta < 0) throw new Error("موجودی نمی‌تواند منفی شود");
    store.warehouseStock.push({
      id: nextId(store, "warehouseStock"),
      productId,
      warehouseId,
      quantity: delta,
      updatedAt: new Date(),
    });
  }
}

export type LedgerEntry = {
  productId: number;
  variationId: number;
  unitId?: number | null;
  barcode?: string | null;
  productName?: string;
  color?: string | null;
  size?: string | null;
  quantity: number;
  sourceWarehouseId?: number | null;
  destWarehouseId?: number | null;
  transactionType: string;
  operatorId?: number | null;
  operatorName?: string | null;
  documentNumber?: string | null;
  reference?: string | null;
};

export function writeLedger(store: MockStore, entries: LedgerEntry[]) {
  if (!entries.length) return;
  const now = new Date();
  for (const e of entries) {
    store.inventoryLedger.push({
      id: nextId(store, "inventoryLedger"),
      productId: e.productId,
      variationId: e.variationId,
      unitId: e.unitId ?? null,
      barcode: e.barcode ?? null,
      productName: e.productName ?? null,
      color: e.color ?? null,
      size: e.size ?? null,
      quantity: e.quantity,
      sourceWarehouseId: e.sourceWarehouseId ?? null,
      destWarehouseId: e.destWarehouseId ?? null,
      transactionType: e.transactionType,
      operatorId: e.operatorId ?? null,
      operatorName: e.operatorName ?? null,
      documentNumber: e.documentNumber ?? null,
      reference: e.reference ?? null,
      createdAt: now,
    });
  }
}

export function writeAudit(
  store: MockStore,
  user: SessionUser | null,
  action: string,
  entity: string,
  entityId: number | null,
  detail: string,
  opts?: {
    warehouseId?: number;
    relatedInvoice?: string;
    kind?: string;
    prevValue?: unknown;
    newValue?: unknown;
  },
) {
  store.auditLogs.push({
    id: nextId(store, "auditLogs"),
    userId: user?.id ?? null,
    userName: user?.name ?? "سیستم",
    action,
    entity,
    entityId,
    detail,
    warehouseId: opts?.warehouseId ?? null,
    relatedInvoice: opts?.relatedInvoice ?? null,
    kind: opts?.kind ?? "info",
    prevValue: (opts?.prevValue as Record<string, unknown>) ?? null,
    newValue: (opts?.newValue as Record<string, unknown>) ?? null,
    createdAt: new Date(),
  });
}

/** Create physical units in a warehouse and update stock caches */
export function createUnitsInWarehouse(
  store: MockStore,
  opts: {
    productId: number;
    variationId: number;
    warehouseId: number;
    quantity: number;
    productName: string;
    color?: string | null;
    size?: string | null;
    operator?: SessionUser | null;
    documentNumber?: string | null;
    transactionType?: string;
    reference?: string | null;
  },
): string[] {
  const qty = opts.quantity;
  if (qty <= 0) return [];

  const barcodes = allocateBarcodes(qty, store);
  const now = new Date();
  const inserted: ProductUnit[] = [];

  for (const barcode of barcodes) {
    const unit: ProductUnit = {
      id: nextId(store, "productUnits"),
      barcode,
      productId: opts.productId,
      variationId: opts.variationId,
      warehouseId: opts.warehouseId,
      status: "in_stock",
      soldInvoiceId: null,
      soldAt: null,
      createdAt: now,
      updatedAt: now,
    };
    store.productUnits.push(unit);
    inserted.push(unit);
  }

  bumpStock(store, opts.productId, opts.variationId, opts.warehouseId, qty);

  writeLedger(
    store,
    inserted.map((u) => ({
      productId: opts.productId,
      variationId: opts.variationId,
      unitId: u.id,
      barcode: u.barcode,
      productName: opts.productName,
      color: opts.color,
      size: opts.size,
      quantity: 1,
      sourceWarehouseId: null,
      destWarehouseId: opts.warehouseId,
      transactionType: opts.transactionType ?? "receipt",
      operatorId: opts.operator?.id,
      operatorName: opts.operator?.name,
      documentNumber: opts.documentNumber,
      reference: opts.reference,
    })),
  );

  return barcodes;
}

/** Move N in-stock units of a variation from source to dest warehouse */
export function moveUnitsBetweenWarehouses(
  store: MockStore,
  opts: {
    productId: number;
    variationId: number;
    sourceWarehouseId: number;
    destWarehouseId: number;
    quantity: number;
    productName: string;
    color?: string | null;
    size?: string | null;
    operator?: SessionUser | null;
    documentNumber: string;
    transactionType: string;
    reference?: string | null;
    barcodes?: string[] | null;
  },
): ProductUnit[] {
  if (opts.sourceWarehouseId === opts.destWarehouseId) {
    throw new Error("انبار مبدأ و مقصد نمی‌توانند یکسان باشند");
  }
  if (opts.quantity <= 0) throw new Error("تعداد باید بزرگ‌تر از صفر باشد");

  const wanted = (opts.barcodes ?? []).map((b) => String(b).trim()).filter(Boolean);
  let units: ProductUnit[];

  if (wanted.length) {
    if (wanted.length !== opts.quantity) {
      throw new Error(`تعداد بارکد با تعداد درخواستی هم‌خوان نیست (${wanted.length}/${opts.quantity})`);
    }
    units = store.productUnits.filter(
      (u) =>
        u.variationId === opts.variationId &&
        u.warehouseId === opts.sourceWarehouseId &&
        u.status === "in_stock" &&
        wanted.includes(u.barcode),
    );
    if (units.length < wanted.length) {
      throw new Error(`برخی بارکدها در انبار مبدأ موجود نیستند برای «${opts.productName}»`);
    }
  } else {
    units = store.productUnits
      .filter(
        (u) =>
          u.variationId === opts.variationId &&
          u.warehouseId === opts.sourceWarehouseId &&
          u.status === "in_stock",
      )
      .slice(0, opts.quantity);
  }

  if (units.length < opts.quantity) {
    throw new Error(
      `موجودی کافی نیست برای «${opts.productName}» (موجود: ${units.length}، درخواستی: ${opts.quantity})`,
    );
  }

  const now = new Date();
  for (const u of units) {
    u.warehouseId = opts.destWarehouseId;
    u.updatedAt = now;
  }

  bumpStock(store, opts.productId, opts.variationId, opts.sourceWarehouseId, -opts.quantity);
  bumpStock(store, opts.productId, opts.variationId, opts.destWarehouseId, opts.quantity);

  writeLedger(
    store,
    units.map((u) => ({
      productId: opts.productId,
      variationId: opts.variationId,
      unitId: u.id,
      barcode: u.barcode,
      productName: opts.productName,
      color: opts.color,
      size: opts.size,
      quantity: -1,
      sourceWarehouseId: opts.sourceWarehouseId,
      destWarehouseId: opts.destWarehouseId,
      transactionType: opts.transactionType,
      operatorId: opts.operator?.id,
      operatorName: opts.operator?.name,
      documentNumber: opts.documentNumber,
      reference: opts.reference,
    })),
  );

  writeLedger(
    store,
    units.map((u) => ({
      productId: opts.productId,
      variationId: opts.variationId,
      unitId: u.id,
      barcode: u.barcode,
      productName: opts.productName,
      color: opts.color,
      size: opts.size,
      quantity: 1,
      sourceWarehouseId: opts.sourceWarehouseId,
      destWarehouseId: opts.destWarehouseId,
      transactionType: opts.transactionType,
      operatorId: opts.operator?.id,
      operatorName: opts.operator?.name,
      documentNumber: opts.documentNumber,
      reference: opts.reference ? `${opts.reference}-IN` : "IN",
    })),
  );

  return units;
}

export function genDocumentNumber(prefix: string) {
  const d = new Date();
  const ts = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${ts}-${rand}`;
}

/** Synchronous mock transaction wrapper */
export function runInTransaction<T>(fn: (tx: MockStore) => T): T {
  return fn(getStore());
}

export function productPrice(p: { price?: number | null; sellingPrice?: number | null }) {
  return Number(p.price ?? p.sellingPrice ?? 0);
}

// Async wrappers for drop-in compatibility with DB-based inventory.ts
export async function allocateBarcodesAsync(count: number, store: MockStore = getStore()) {
  return allocateBarcodes(count, store);
}

export async function bumpStockAsync(
  store: MockStore,
  productId: number,
  variationId: number,
  warehouseId: number,
  delta: number,
) {
  return bumpStock(store, productId, variationId, warehouseId, delta);
}

export async function writeLedgerAsync(store: MockStore, entries: LedgerEntry[]) {
  return writeLedger(store, entries);
}

export async function writeAuditAsync(
  store: MockStore,
  user: SessionUser | null,
  action: string,
  entity: string,
  entityId: number | null,
  detail: string,
  opts?: Parameters<typeof writeAudit>[6],
) {
  return writeAudit(store, user, action, entity, entityId, detail, opts);
}

export async function createUnitsInWarehouseAsync(
  store: MockStore,
  opts: Parameters<typeof createUnitsInWarehouse>[1],
) {
  return createUnitsInWarehouse(store, opts);
}

export async function moveUnitsBetweenWarehousesAsync(
  store: MockStore,
  opts: Parameters<typeof moveUnitsBetweenWarehouses>[1],
) {
  return moveUnitsBetweenWarehouses(store, opts);
}

export async function getCentralWarehouseAsync(store: MockStore = getStore()) {
  return getCentralWarehouse(store);
}

export async function runInTransactionAsync<T>(fn: (tx: MockStore) => Promise<T>): Promise<T> {
  return fn(getStore());
}
