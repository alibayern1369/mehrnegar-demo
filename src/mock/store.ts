import type {
  ActivityLog,
  AppSettings,
  AuditLog,
  BarcodeSequence,
  Customer,
  InventoryLedger,
  Invoice,
  InvoiceItem,
  InvoiceSettings,
  OtpCode,
  Product,
  ProductUnit,
  ProductVariation,
  Return,
  SmsMessage,
  SmsSettings,
  StockDocument,
  StockDocumentItem,
  StockDocumentUnit,
  StocktakeItem,
  StocktakeSession,
  User,
  UserSalesPermission,
  VariationStock,
  Warehouse,
  WarehouseGroup,
  WarehouseStock,
} from "./types";

export type TableName =
  | "warehouseGroups"
  | "warehouses"
  | "users"
  | "products"
  | "productVariations"
  | "productUnits"
  | "warehouseStock"
  | "variationStock"
  | "barcodeSequence"
  | "stockDocuments"
  | "stockDocumentItems"
  | "stockDocumentUnits"
  | "inventoryLedger"
  | "customers"
  | "invoices"
  | "invoiceItems"
  | "userSalesPermissions"
  | "smsMessages"
  | "smsSettings"
  | "otpCodes"
  | "returns"
  | "auditLogs"
  | "invoiceSettings"
  | "appSettings"
  | "stocktakeSessions"
  | "stocktakeItems"
  | "activityLogs";

export type MockStore = {
  warehouseGroups: WarehouseGroup[];
  warehouses: Warehouse[];
  users: User[];
  products: Product[];
  productVariations: ProductVariation[];
  productUnits: ProductUnit[];
  warehouseStock: WarehouseStock[];
  variationStock: VariationStock[];
  barcodeSequence: BarcodeSequence[];
  stockDocuments: StockDocument[];
  stockDocumentItems: StockDocumentItem[];
  stockDocumentUnits: StockDocumentUnit[];
  inventoryLedger: InventoryLedger[];
  customers: Customer[];
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  userSalesPermissions: UserSalesPermission[];
  smsMessages: SmsMessage[];
  smsSettings: SmsSettings[];
  otpCodes: OtpCode[];
  returns: Return[];
  auditLogs: AuditLog[];
  invoiceSettings: InvoiceSettings[];
  appSettings: AppSettings[];
  stocktakeSessions: StocktakeSession[];
  stocktakeItems: StocktakeItem[];
  activityLogs: ActivityLog[];
  /** Auto-increment counters per table */
  counters: Record<TableName, number>;
  /** Whether initial seed has been applied */
  seeded: boolean;
};

const INITIAL_COUNTERS: Record<TableName, number> = {
  warehouseGroups: 0,
  warehouses: 0,
  users: 0,
  products: 0,
  productVariations: 0,
  productUnits: 0,
  warehouseStock: 0,
  variationStock: 0,
  barcodeSequence: 0,
  stockDocuments: 0,
  stockDocumentItems: 0,
  stockDocumentUnits: 0,
  inventoryLedger: 0,
  customers: 0,
  invoices: 0,
  invoiceItems: 0,
  userSalesPermissions: 0,
  smsMessages: 0,
  smsSettings: 0,
  otpCodes: 0,
  returns: 0,
  auditLogs: 0,
  invoiceSettings: 0,
  appSettings: 0,
  stocktakeSessions: 0,
  stocktakeItems: 0,
  activityLogs: 0,
};

export function createEmptyStore(): MockStore {
  return {
    warehouseGroups: [],
    warehouses: [],
    users: [],
    products: [],
    productVariations: [],
    productUnits: [],
    warehouseStock: [],
    variationStock: [],
    barcodeSequence: [{ id: 1, name: "unit", nextVal: 2800000001001 }],
    stockDocuments: [],
    stockDocumentItems: [],
    stockDocumentUnits: [],
    inventoryLedger: [],
    customers: [],
    invoices: [],
    invoiceItems: [],
    userSalesPermissions: [],
    smsMessages: [],
    smsSettings: [],
    otpCodes: [],
    returns: [],
    auditLogs: [],
    invoiceSettings: [],
    appSettings: [],
    stocktakeSessions: [],
    stocktakeItems: [],
    activityLogs: [],
    counters: { ...INITIAL_COUNTERS },
    seeded: false,
  };
}

/** Allocate the next auto-increment ID for a table */
export function nextId(store: MockStore, table: TableName): number {
  store.counters[table] += 1;
  return store.counters[table];
}

const GLOBAL_KEY = "__mehrnegarMockStore__";

type GlobalWithStore = typeof globalThis & {
  [GLOBAL_KEY]?: MockStore;
};

/** Singleton in-memory store — persists across requests in dev via globalThis */
export function getStore(): MockStore {
  const g = globalThis as GlobalWithStore;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = createEmptyStore();
  }
  return g[GLOBAL_KEY];
}

/** Reset store to empty state (optionally re-seed by calling seedMockData afterward) */
export function resetStore(): MockStore {
  const g = globalThis as GlobalWithStore;
  g[GLOBAL_KEY] = createEmptyStore();
  return g[GLOBAL_KEY];
}

export { seedMockData } from "./seed";
