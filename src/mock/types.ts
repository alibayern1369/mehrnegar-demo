/** In-memory mock entity types — mirrors src/db/schema.ts */

export type WarehouseGroup = {
  id: number;
  name: string;
  isActive: boolean | null;
  isPlaceholder: boolean | null;
  sortOrder: number | null;
  createdAt: Date | null;
};

export type Warehouse = {
  id: number;
  groupId: number | null;
  name: string;
  code: string;
  isActive: boolean | null;
  sortOrder: number | null;
  createdAt: Date | null;
};

export type User = {
  id: number;
  name: string;
  username: string;
  passwordHash: string;
  phone: string | null;
  gender: string | null;
  role: string;
  isActive: boolean | null;
  mustChangePass: boolean | null;
  bypassOtp: boolean | null;
  isBootstrap: boolean | null;
  permissions: string[];
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type NewUser = Omit<User, "id" | "createdAt" | "updatedAt"> & {
  id?: number;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

export type Product = {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string | null;
  supplier: string | null;
  description: string | null;
  color: string | null;
  size: string | null;
  purchasePrice: number | null;
  sellingPrice: number | null;
  price: number | null;
  tax: number | null;
  status: string | null;
  createdBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type NewProduct = Omit<Product, "id" | "createdAt" | "updatedAt"> & {
  id?: number;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

export type ProductVariation = {
  id: number;
  productId: number;
  sku: string;
  color: string;
  size: string;
  price: number | null;
  status: string | null;
  createdAt: Date | null;
};

export type ProductUnit = {
  id: number;
  barcode: string;
  productId: number;
  variationId: number;
  warehouseId: number | null;
  status: string;
  soldInvoiceId: number | null;
  soldAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type WarehouseStock = {
  id: number;
  productId: number;
  warehouseId: number;
  quantity: number | null;
  updatedAt: Date | null;
};

export type VariationStock = {
  id: number;
  variationId: number;
  productId: number;
  warehouseId: number;
  quantity: number | null;
  updatedAt: Date | null;
};

export type BarcodeSequence = {
  id: number;
  name: string;
  nextVal: number;
};

export type StockDocument = {
  id: number;
  documentNumber: string;
  type: string;
  sourceWarehouseId: number | null;
  destWarehouseId: number | null;
  operatorId: number | null;
  operatorName: string | null;
  notes: string | null;
  status: string | null;
  totalItems: number | null;
  totalQuantity: number | null;
  createdAt: Date | null;
};

export type StockDocumentItem = {
  id: number;
  documentId: number;
  productId: number;
  variationId: number;
  productName: string;
  color: string | null;
  size: string | null;
  quantity: number;
  barcodeStart: string | null;
  barcodeEnd: string | null;
};

export type StockDocumentUnit = {
  id: number;
  documentId: number;
  itemId: number;
  unitId: number;
  barcode: string;
};

export type InventoryLedger = {
  id: number;
  productId: number | null;
  variationId: number | null;
  unitId: number | null;
  barcode: string | null;
  productName: string | null;
  color: string | null;
  size: string | null;
  quantity: number;
  sourceWarehouseId: number | null;
  destWarehouseId: number | null;
  transactionType: string;
  operatorId: number | null;
  operatorName: string | null;
  documentNumber: string | null;
  reference: string | null;
  createdAt: Date | null;
};

export type Customer = {
  id: number;
  name: string;
  phone: string;
  address: string;
  birthDate: string;
  createdBy: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type NewCustomer = Omit<Customer, "id" | "createdAt" | "updatedAt"> & {
  id?: number;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

export type Invoice = {
  id: number;
  invoiceNumber: string;
  status: string | null;
  soldBy: number | null;
  warehouseId: number | null;
  salesMethod: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  customerBirthDate: string | null;
  notes: string | null;
  subtotal: number | null;
  totalDiscount: number | null;
  totalTax: number | null;
  grandTotal: number | null;
  businessSnapshot: Record<string, string>;
  customerSmsSentAt: Date | null;
  adminSmsSentAt: Date | null;
  lastSmsError: string | null;
  createdAt: Date | null;
};

export type NewInvoice = Omit<Invoice, "id" | "createdAt"> & {
  id?: number;
  createdAt?: Date | null;
};

export type InvoiceItem = {
  id: number;
  invoiceId: number;
  productId: number;
  variationId: number | null;
  barcode: string;
  productName: string;
  color: string | null;
  size: string | null;
  quantity: number;
  unitPrice: number | null;
  discount: number | null;
  lineTotal: number | null;
  unitBarcodes: string[];
};

export type UserSalesPermission = {
  id: number;
  userId: number;
  warehouseId: number;
  enabled: boolean;
  salesMethods: string[];
  createdAt: Date | null;
};

export type SmsMessage = {
  id: number;
  type: string;
  campaignName: string | null;
  phone: string;
  customerName: string | null;
  message: string;
  status: string | null;
  invoiceId: number | null;
  sentBy: number | null;
  providerRef: string | null;
  errorDetail: string | null;
  createdAt: Date | null;
};

export type SmsSettings = {
  id: number;
  provider: string;
  melipayamakUsername: string | null;
  melipayamakPassword: string | null;
  melipayamakFrom: string | null;
  melipayamakOtpBodyId: number | null;
  melipayamakCustomerSaleBodyId: number | null;
  melipayamakAdminSaleBodyId: number | null;
  otpTemplate: string | null;
  customerSaleTemplate: string | null;
  adminSaleTemplate: string | null;
  otpMapping: string[];
  customerSaleMapping: string[];
  adminSaleMapping: string[];
  adminPhones: string | null;
  notifyCustomerOnSaleFinalized: boolean | null;
  notifyAdminOnSaleFinalized: boolean | null;
  otpLength: number | null;
  otpExpireSeconds: number | null;
  otpCooldownSeconds: number | null;
  otpHourlyLimit: number | null;
  otpMaxAttempts: number | null;
  otpLockSeconds: number | null;
  otpIpHourlyLimit: number | null;
  varMaxLength: number | null;
  enabled: boolean | null;
  updatedAt: Date | null;
};

export type OtpCode = {
  id: number;
  phone: string;
  userId: number | null;
  codeHash: string;
  attempts: number | null;
  verified: boolean | null;
  lockedUntil: Date | null;
  expiresAt: Date;
  ip: string | null;
  createdAt: Date | null;
};

export type Return = {
  id: number;
  returnId: string;
  invoiceId: number | null;
  invoiceItemId: number | null;
  productId: number;
  variationId: number | null;
  unitId: number | null;
  barcode: string;
  productName: string;
  quantity: number;
  unitPrice: number | null;
  amount: number | null;
  affectsSales: boolean | null;
  originalWarehouseId: number | null;
  returnWarehouseId: number | null;
  originalSoldBy: number | null;
  returnedBy: number | null;
  reason: string | null;
  notes: string | null;
  status: string | null;
  createdAt: Date | null;
};

export type AuditLog = {
  id: number;
  userId: number | null;
  userName: string | null;
  action: string;
  entity: string | null;
  entityId: number | null;
  detail: string | null;
  prevValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  warehouseId: number | null;
  relatedInvoice: string | null;
  kind: string | null;
  createdAt: Date | null;
};

export type InvoiceSettings = {
  id: number;
  businessName: string | null;
  businessLogo: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  socialNetwork: string | null;
  socialUrl: string | null;
  taxId: string | null;
  invoiceTitle: string | null;
  invoicePrefix: string | null;
  footerText: string | null;
  returnPolicy: string | null;
  customNotes: string | null;
  updatedAt: Date | null;
};

export type AppSettings = {
  id: number;
  appName: string | null;
  appLogo: string | null;
  developerUrl: string | null;
  setupLoginToken: string | null;
  updatedAt: Date | null;
};

export type StocktakeSession = {
  id: number;
  sessionNumber: string;
  warehouseId: number;
  warehouseName: string;
  status: string;
  mode: string;
  expectedProductCount: number | null;
  checkedProductCount: number | null;
  matchCount: number | null;
  partialCount: number | null;
  mismatchCount: number | null;
  shortageQty: number | null;
  surplusQty: number | null;
  shortageAmount: number | null;
  surplusAmount: number | null;
  notes: string | null;
  operatorId: number | null;
  operatorName: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date | null;
};

export type StocktakeItem = {
  id: number;
  sessionId: number;
  productId: number;
  productName: string;
  sku: string | null;
  barcode: string | null;
  systemQty: number;
  declaredQty: number;
  qtyDiff: number;
  unitPrice: number | null;
  amountDiff: number | null;
  level: string;
  message: string | null;
  issues: string[];
  variationsSnapshot: Record<string, unknown>[];
  checkedBy: string | null;
  checkedAt: Date | null;
};

export type ActivityLog = {
  id: number;
  user: string;
  action: string;
  detail: string | null;
  kind: string | null;
  createdAt: Date | null;
};

/** Session user claims embedded in auth tokens */
export type SessionUser = {
  id: number;
  name: string;
  username: string;
  role: "manager" | "user";
  permissions: string[];
  gender?: string | null;
  isBootstrap?: boolean;
};
