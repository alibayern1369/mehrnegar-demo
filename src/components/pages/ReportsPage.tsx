"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Glass, SectionTitle, Btn, Badge, Field, Input, Select, Modal } from "../ui";
import { I } from "../icons";
import { useApp } from "../context";
import { toman, tomanShort, faNumber, normalizeBarcode } from "@/lib/format";
import { hasPermission } from "@/lib/permissions";
import { SALES_METHODS, salesMethodLabel } from "@/lib/sales-methods";
import { downloadCsv, openPrintReport } from "@/lib/report-export";
import { useInvoicePreview, InvoiceNumberButton } from "../InvoicePreview";
import { JalaliDatePicker } from "../JalaliDatePicker";
import { TransferDeliverySlip, useStoreBrand, type TransferDoc } from "../TransferDeliverySlip";

type InvItem = {
  productName: string; barcode: string; unitBarcodes?: string[] | null;
  color?: string | null; size?: string | null; quantity: number;
};
type InvRow = {
  id: number; invoiceNumber: string; grandTotal: number | null; status: string | null;
  createdAt: string | Date | null; customerName?: string | null; items?: InvItem[];
  salesMethod?: string | null; soldBy?: number | null;
};
type RetRow = {
  id: number;
  returnId: string;
  productName: string;
  quantity: number;
  amount?: number | null;
  unitPrice?: number | null;
  reason?: string | null;
  notes?: string | null;
  barcode?: string | null;
  color?: string | null;
  size?: string | null;
  createdAt: string | Date | null;
  invoiceNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  returnedByName?: string | null;
  originalSoldByName?: string | null;
  returnWarehouseName?: string | null;
  originalWarehouseName?: string | null;
  affectsSales?: boolean | null;
};
type AuditRow = { id: number; userName?: string | null; action: string; detail?: string | null; createdAt: string | Date | null; kind?: string | null };
type LedgerRow = {
  id: number; productName?: string | null; color?: string | null; size?: string | null;
  barcode?: string | null; quantity: number; transactionType: string;
  documentNumber?: string | null; operatorName?: string | null; createdAt: string | Date | null;
  sourceWarehouse?: { name: string } | null; destWarehouse?: { name: string } | null;
};
type StockRow = {
  id: number; quantity: number | null;
  warehouse?: { name: string } | null;
  product?: { name: string } | null;
  variation?: { color: string; size: string } | null;
};
type DocRow = {
  id: number; documentNumber: string; type: string; totalQuantity: number | null;
  operatorName?: string | null; createdAt: string | Date | null;
  sourceWarehouse?: { name: string } | null; destWarehouse?: { name: string } | null;
};
type StocktakeSessionRow = {
  id: number; sessionNumber: string; warehouseName: string; status: string;
  checkedProductCount?: number | null; expectedProductCount?: number | null;
  matchCount?: number | null; partialCount?: number | null; mismatchCount?: number | null;
  shortageQty?: number | null; surplusQty?: number | null;
  shortageAmount?: number | null; surplusAmount?: number | null;
  operatorName?: string | null; completedAt?: string | Date | null; startedAt?: string | Date | null;
};
type StocktakeItemRow = {
  productId: number; productName: string; sku?: string | null; barcode?: string | null;
  systemQty: number; declaredQty: number; qtyDiff: number; amountDiff?: number | null;
  level: string; message?: string | null;
};
type WH = { id: number; name: string };

function DocNumberButton({
  number,
  onOpen,
}: {
  number: string | null | undefined;
  onOpen: (n: string) => void;
}) {
  const n = String(number ?? "").trim();
  if (!n || n === "—") return <span className="text-xs text-muted">—</span>;
  return (
    <button
      type="button"
      dir="ltr"
      className="cursor-pointer bg-transparent p-0 text-right font-mono text-xs text-brand-400 hover:underline"
      onClick={() => onOpen(n)}
      title="مشاهده و چاپ سند"
    >
      {n}
    </button>
  );
}

function SessionNumberButton({
  number,
  onOpen,
}: {
  number: string | null | undefined;
  onOpen: () => void;
}) {
  const n = String(number ?? "").trim();
  if (!n || n === "—") return <span className="text-xs text-muted">—</span>;
  return (
    <button
      type="button"
      dir="ltr"
      className="cursor-pointer bg-transparent p-0 text-right font-mono text-xs text-brand-400 hover:underline"
      onClick={onOpen}
      title="مشاهده گزارش و خروجی PDF"
    >
      {n}
    </button>
  );
}

type FinancialData = {
  cards: {
    today: { count: number; total: number; returnsTotal?: number; salesGross?: number };
    week: { count: number; total: number; returnsTotal?: number; salesGross?: number };
    month: { count: number; total: number; returnsTotal?: number; salesGross?: number };
    year: { count: number; total: number; returnsTotal?: number; salesGross?: number };
    prevMonth: { count: number; total: number; returnsTotal?: number; salesGross?: number };
    all: { count: number; total: number; returnsTotal?: number; salesGross?: number };
  };
  daily: { date: string; label: string; count: number; total: number; returnsTotal?: number }[];
  monthly: { month: number; label: string; count: number; total: number; returnsTotal?: number }[];
  jalaliYear?: number;
  ranking: { userId: number; name: string; count: number; total: number }[];
  avgTicketMonth: number;
};

type MySalesData = {
  invoices: InvRow[];
  summary: {
    today: { count: number; total: number; returnsTotal?: number };
    month: { count: number; total: number; returnsTotal?: number };
    all: { count: number; total: number; returnsTotal?: number };
  };
};

type AdvRow = {
  kind: "sale" | "return" | "edit";
  id: number;
  ref: string;
  date: string | Date | null;
  productName: string;
  category: string | null;
  color: string | null;
  size: string | null;
  quantity: number;
  amount: number;
  salesMethod: string | null;
  salesMethodLabel: string;
  warehouseName: string | null;
  sellerName: string | null;
  customerName: string | null;
  detail: string | null;
};

type ReportMeta = {
  categories: string[];
  products: { id: number; name: string; category: string }[];
  colors: string[];
  sizes: string[];
  sellers: { id: number; name: string; role: string }[];
  warehouses: WH[];
};

type Drilldown = {
  title: string;
  from?: string;
  to?: string;
  soldBy?: number;
  jalaliYear?: number;
  jalaliMonth?: number;
};

type TabId = "financial" | "sales" | "my_sales" | "returns" | "audit" | "ledger" | "stock" | "transfers" | "stocktake" | "advanced";

const KIND_LABEL: Record<string, string> = {
  sale: "فروش",
  return: "مرجوعی",
  edit: "ویرایش",
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function fmtDate(v: string | Date | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("fa-IR");
}

function fmtDateTime(v: string | Date | null | undefined) {
  if (!v) return "—";
  return new Date(v).toLocaleString("fa-IR");
}

export function ReportsPage() {
  const { token, toast, user, isManager } = useApp();
  const { openByNumber, modal: invoiceModal } = useInvoicePreview();
  const storeBrand = useStoreBrand();
  const canFinancial = isManager || hasPermission(user, "report_financial");
  const canSales = isManager || hasPermission(user, "report_sales");
  const canMySales = isManager || hasPermission(user, "report_my_sales");
  const canReturns = isManager || hasPermission(user, "report_returns");
  const canLedger = isManager || hasPermission(user, "report_ledger");
  const canStock = isManager || hasPermission(user, "report_stock");
  const canTransfers = isManager || hasPermission(user, "report_transfers");
  const canStocktake = isManager || hasPermission(user, "stocktake") || canTransfers;
  const canAdvanced = isManager || hasPermission(user, "report_advanced");
  const canAudit = isManager || hasPermission(user, "report_audit");
  const canInventoryTrack = canLedger || canStock || canTransfers || canStocktake;

  const firstTab = ((): TabId => {
    if (canFinancial) return "financial";
    if (canAdvanced) return "advanced";
    if (canMySales) return "my_sales";
    if (canSales) return "sales";
    if (canReturns) return "returns";
    if (canLedger) return "ledger";
    if (canStock) return "stock";
    if (canTransfers) return "transfers";
    if (canAudit) return "audit";
    return "sales";
  })();

  const [tab, setTab] = useState<TabId>(firstTab);
  const [data, setData] = useState<unknown[]>([]);
  const [financial, setFinancial] = useState<FinancialData | null>(null);
  const [mySales, setMySales] = useState<MySalesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<WH[]>([]);
  const [filters, setFilters] = useState({ warehouseId: "", barcode: "", documentNumber: "", from: "", to: "" });
  const [bcLookup, setBcLookup] = useState("");

  const [drill, setDrill] = useState<Drilldown | null>(null);
  const [drillRows, setDrillRows] = useState<InvRow[]>([]);
  const [drillReturns, setDrillReturns] = useState<RetRow[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillSummary, setDrillSummary] = useState({
    count: 0, returnCount: 0, total: 0, salesGross: 0, returnsTotal: 0,
  });
  const [viewReturn, setViewReturn] = useState<RetRow | null>(null);

  const [meta, setMeta] = useState<ReportMeta | null>(null);
  const [adv, setAdv] = useState({
    kind: "all",
    from: isoDate(addDays(new Date(), -30)),
    to: isoDate(new Date()),
    category: "",
    productName: "",
    productId: "",
    color: "",
    size: "",
    salesMethod: "",
    warehouseId: "",
    sellerId: "",
  });
  const [advRows, setAdvRows] = useState<AdvRow[]>([]);
  const [advSummary, setAdvSummary] = useState<{
    count: number; salesAmount: number; salesQty: number; returnQty: number; editCount: number;
    saleRows: number; returnRows: number;
  } | null>(null);
  const [advLoading, setAdvLoading] = useState(false);
  const [advQueried, setAdvQueried] = useState(false);

  const [viewDoc, setViewDoc] = useState<TransferDoc | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [stReport, setStReport] = useState<StocktakeSessionRow | null>(null);
  const [stItems, setStItems] = useState<StocktakeItemRow[]>([]);
  const [stLoading, setStLoading] = useState(false);

  const switchTab = useCallback((id: TabId) => {
    setData([]);
    setFinancial(null);
    setMySales(null);
    setLoading(true);
    setTab(id);
  }, []);

  useEffect(() => {
    fetch("/api/warehouses").then((r) => r.json()).then((d) => d.ok && setWarehouses(d.warehouses));
  }, []);

  useEffect(() => {
    if (!canAdvanced && !canFinancial) return;
    fetch("/api/reports?type=meta", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.ok && setMeta(d.data))
      .catch(() => {});
  }, [token, canAdvanced, canFinancial]);

  useEffect(() => {
    const allowed: Record<TabId, boolean> = {
      financial: canFinancial,
      sales: canSales,
      my_sales: canMySales,
      returns: canReturns,
      ledger: canLedger,
      stock: canStock,
      transfers: canTransfers,
      stocktake: canStocktake,
      advanced: canAdvanced,
      audit: canAudit,
    };
    if (!allowed[tab]) switchTab(firstTab);
  }, [tab, canFinancial, canSales, canMySales, canReturns, canLedger, canStock, canTransfers, canStocktake, canAdvanced, canAudit, firstTab, switchTab]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    if (tab === "financial") {
      fetch(`/api/reports?type=financial`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          if (!d.ok) { toast(d.error ?? "خطا", "error"); setFinancial(null); return; }
          setFinancial(d.data);
        })
        .catch(() => { if (!cancelled) toast("خطا در بارگذاری گزارش مالی", "error"); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }

    if (tab === "my_sales") {
      fetch(`/api/reports?type=my_sales&limit=100`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          if (!d.ok) { toast(d.error ?? "خطا", "error"); setMySales(null); return; }
          setMySales(d.data);
        })
        .catch(() => { if (!cancelled) toast("خطا در بارگذاری فروش شخصی", "error"); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }

    if (tab === "advanced") {
      setLoading(false);
      return;
    }

    if (tab === "stocktake") {
      fetch(`/api/stocktake?sessions=1&limit=50`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          if (!d.ok) { toast(d.error ?? "خطا", "error"); setData([]); return; }
          setData(d.sessions ?? []);
        })
        .catch(() => { if (!cancelled) toast("خطا در بارگذاری سوابق انبارگردانی", "error"); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }

    if (tab === "transfers") {
      const params = new URLSearchParams();
      if (filters.warehouseId) params.set("warehouseId", filters.warehouseId);
      if (filters.documentNumber) params.set("q", filters.documentNumber);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      fetch(`/api/transfers?${params}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          if (!d.ok) { toast(d.error ?? "خطا", "error"); setData([]); return; }
          setData(d.documents ?? []);
        })
        .catch(() => { if (!cancelled) toast("خطا در بارگذاری اسناد", "error"); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }

    if (tab === "ledger" || tab === "stock") {
      const params = new URLSearchParams();
      if (tab === "stock") params.set("view", "stock");
      else params.set("view", "ledger");
      if (filters.warehouseId) params.set("warehouseId", filters.warehouseId);
      if (filters.barcode) params.set("barcode", filters.barcode);
      if (filters.documentNumber) params.set("documentNumber", filters.documentNumber);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      params.set("limit", "200");

      fetch(`/api/inventory?${params}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((d) => {
          if (cancelled || !d.ok) return;
          if (tab === "stock") setData(d.stock ?? []);
          else setData(d.ledger ?? []);
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }

    const reportType = tab === "audit" ? "audit" : tab === "returns" ? "returns" : "sales";
    fetch(`/api/reports?type=${reportType}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.ok) setData(d.data ?? []);
        else setData([]);
      })
      .catch(() => { if (!cancelled) setData([]); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [tab, token, filters, toast]);

  const openDrill = async (d: Drilldown) => {
    setDrill(d);
    setDrillRows([]);
    setDrillReturns([]);
    setDrillLoading(true);
    try {
      const params = new URLSearchParams({ type: "sales", limit: "500" });
      if (d.from) params.set("from", d.from);
      if (d.to) params.set("to", d.to);
      if (d.soldBy) params.set("soldBy", String(d.soldBy));
      if (d.jalaliYear) params.set("jalaliYear", String(d.jalaliYear));
      if (d.jalaliMonth) params.set("jalaliMonth", String(d.jalaliMonth));
      const res = await fetch(`/api/reports?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!json.ok) { toast(json.error ?? "خطا", "error"); setDrill(null); return; }
      setDrillRows(json.data ?? []);
      setDrillReturns(json.returns ?? []);
      setDrillSummary({
        count: json.summary?.count ?? (json.data ?? []).length,
        returnCount: json.summary?.returnCount ?? (json.returns ?? []).length,
        total: json.summary?.total ?? 0,
        salesGross: json.summary?.salesGross ?? 0,
        returnsTotal: json.summary?.returnsTotal ?? 0,
      });
    } catch {
      toast("خطا در بارگذاری جزئیات", "error");
      setDrill(null);
    } finally {
      setDrillLoading(false);
    }
  };

  const runAdvanced = async () => {
    setAdvLoading(true);
    setAdvQueried(true);
    try {
      const params = new URLSearchParams({ type: "advanced", limit: "1000", kind: adv.kind });
      if (adv.from) params.set("from", adv.from);
      if (adv.to) params.set("to", adv.to);
      if (adv.category) params.set("category", adv.category);
      if (adv.productName) params.set("productName", adv.productName);
      if (adv.productId) params.set("productId", adv.productId);
      if (adv.color) params.set("color", adv.color);
      if (adv.size) params.set("size", adv.size);
      if (adv.salesMethod) params.set("salesMethod", adv.salesMethod);
      if (adv.warehouseId) params.set("warehouseId", adv.warehouseId);
      if (adv.sellerId) params.set("sellerId", adv.sellerId);
      const res = await fetch(`/api/reports?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!json.ok) { toast(json.error ?? "خطا", "error"); setAdvRows([]); setAdvSummary(null); return; }
      setAdvRows(json.data ?? []);
      setAdvSummary(json.summary ?? null);
    } catch {
      toast("خطا در گزارش‌گیری", "error");
    } finally {
      setAdvLoading(false);
    }
  };

  const brandOpts = {
    brand: {
      businessName: storeBrand.businessName,
      businessLogo: storeBrand.businessLogo,
      address: storeBrand.address,
      phone: storeBrand.phone,
      website: storeBrand.website,
    },
    operatorName: user?.name,
  };

  const openTransferDoc = useCallback(async (documentNumber: string) => {
    const q = String(documentNumber ?? "").trim();
    if (!q || q === "—") return;
    setDocLoading(true);
    try {
      const res = await fetch(`/api/transfers?number=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!d.ok || !d.document) {
        toast(d.error ?? "سند یافت نشد", "error");
        return;
      }
      setViewDoc(d.document as TransferDoc);
    } catch {
      toast("خطا در دریافت سند", "error");
    } finally {
      setDocLoading(false);
    }
  }, [token, toast]);

  const openStocktakeSession = useCallback(async (sess: StocktakeSessionRow) => {
    setStReport(sess);
    setStItems([]);
    setStLoading(true);
    try {
      const res = await fetch(`/api/stocktake?sessionId=${sess.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!d.ok) {
        toast(d.error ?? "خطا در بارگذاری جلسه", "error");
        setStReport(null);
        return;
      }
      if (d.session) setStReport(d.session);
      setStItems(d.items ?? []);
    } catch {
      toast("خطا در بارگذاری گزارش انبارگردانی", "error");
      setStReport(null);
    } finally {
      setStLoading(false);
    }
  }, [token, toast]);

  const printStocktakeSession = () => {
    if (!stReport) return;
    const levelLabel = (level: string) =>
      level === "match" ? "همخوانی" : level === "partial" ? "اختلاف جزئی" : "تناقض";
    const ok = openPrintReport({
      title: "گزارش انبارگردانی",
      docLabel: stReport.sessionNumber,
      subtitle: `${stReport.warehouseName} · ${
        stReport.status === "completed" ? "کامل" : stReport.status === "partial" ? "ناقص" : stReport.status
      }`,
      headers: ["محصول", "کد", "سیستم", "اعلامی", "اختلاف", "مبلغ اختلاف", "وضعیت"],
      rows: stItems.map((it) => [
        it.productName,
        it.sku || it.barcode || "—",
        faNumber(it.systemQty),
        faNumber(it.declaredQty),
        faNumber(it.qtyDiff),
        toman(Math.abs(Number(it.amountDiff) || 0)),
        levelLabel(it.level),
      ]),
      summaryCards: [
        { label: "بررسی‌شده", value: `${faNumber(stReport.checkedProductCount ?? stItems.length)} / ${faNumber(stReport.expectedProductCount ?? 0)}` },
        { label: "همخوانی", value: faNumber(stReport.matchCount ?? stItems.filter((i) => i.level === "match").length) },
        { label: "کسری تعداد", value: faNumber(stReport.shortageQty ?? 0) },
        { label: "مازاد تعداد", value: faNumber(stReport.surplusQty ?? 0) },
        { label: "مبلغ کسری", value: toman(stReport.shortageAmount ?? 0) },
        { label: "مبلغ مازاد", value: toman(stReport.surplusAmount ?? 0) },
        { label: "اپراتور", value: stReport.operatorName || user?.name || "—" },
        { label: "تاریخ", value: fmtDateTime(stReport.completedAt ?? stReport.startedAt) },
      ],
      ...brandOpts,
      meta: [
        { label: "شماره جلسه", value: stReport.sessionNumber },
        { label: "انبار", value: stReport.warehouseName },
        { label: "وضعیت", value: stReport.status === "completed" ? "کامل" : stReport.status === "partial" ? "ناقص" : "باز" },
      ],
    });
    if (!ok) toast("اجازه پاپ‌آپ برای چاپ/PDF لازم است", "error");
  };

  const exportStocktakeSessionExcel = () => {
    if (!stReport) return;
    downloadCsv(
      `انبارگردانی-${stReport.sessionNumber}.xls`,
      ["محصول", "SKU", "بارکد", "موجودی سیستم", "اعلامی", "اختلاف تعداد", "اختلاف مبلغ", "وضعیت", "پیام"],
      stItems.map((it) => [
        it.productName,
        it.sku ?? "",
        it.barcode ?? "",
        it.systemQty,
        it.declaredQty,
        it.qtyDiff,
        it.amountDiff ?? 0,
        it.level,
        it.message ?? "",
      ]),
      {
        title: `گزارش انبارگردانی ${stReport.sessionNumber}`,
        ...brandOpts,
        summaryLines: [
          `انبار: ${stReport.warehouseName}`,
          `کسری: ${stReport.shortageQty ?? 0} · مازاد: ${stReport.surplusQty ?? 0}`,
        ],
      },
    );
    toast("فایل Excel دانلود شد");
  };

  const exportAdvancedExcel = () => {
    if (!advRows.length) { toast("ابتدا گزارش را اجرا کنید", "info"); return; }
    downloadCsv(
      `گزارش-پیشرفته-${adv.from || "all"}-${adv.to || "all"}.csv`,
      ["نوع", "شماره", "تاریخ", "محصول", "دسته", "رنگ", "سایز", "تعداد", "مبلغ", "روش فروش", "انبار", "فروشنده", "مشتری", "جزئیات"],
      advRows.map((r) => [
        KIND_LABEL[r.kind] ?? r.kind,
        r.ref,
        fmtDateTime(r.date),
        r.productName,
        r.category ?? "",
        r.color ?? "",
        r.size ?? "",
        r.quantity,
        r.amount,
        r.salesMethodLabel,
        r.warehouseName ?? "",
        r.sellerName ?? "",
        r.customerName ?? "",
        r.detail ?? "",
      ]),
      {
        title: "گزارش پیشرفته",
        ...brandOpts,
        summaryLines: advSummary ? [
          `تعداد ردیف: ${advSummary.count}`,
          `مبلغ فروش: ${advSummary.salesAmount}`,
        ] : [],
      },
    );
    toast("فایل Excel حرفه‌ای دانلود شد");
  };

  const exportAdvancedPdf = () => {
    if (!advRows.length) { toast("ابتدا گزارش را اجرا کنید", "info"); return; }
    const ok = openPrintReport({
      title: "گزارش پیشرفته",
      docLabel: "گزارش فروش",
      subtitle: `از ${adv.from || "—"} تا ${adv.to || "—"} · نوع: ${
        adv.kind === "all" ? "همه" : adv.kind === "sales" ? "فروش" : adv.kind === "returns" ? "مرجوعی" : "ویرایش"
      }`,
      headers: ["نوع", "شماره", "تاریخ", "محصول", "تعداد", "مبلغ", "روش فروش", "فروشنده"],
      rows: advRows.map((r) => [
        KIND_LABEL[r.kind] ?? r.kind,
        r.ref,
        fmtDate(r.date),
        r.productName,
        faNumber(r.quantity),
        toman(r.amount),
        r.salesMethodLabel,
        r.sellerName ?? "—",
      ]),
      summaryCards: advSummary ? [
        { label: "تعداد ردیف", value: faNumber(advSummary.count) },
        { label: "مبلغ فروش", value: toman(advSummary.salesAmount) },
        { label: "تعداد فروش", value: faNumber(advSummary.salesQty) },
        { label: "مرجوعی / ویرایش", value: `${faNumber(advSummary.returnQty)} / ${faNumber(advSummary.editCount)}` },
      ] : [],
      ...brandOpts,
    });
    if (!ok) toast("اجازه پاپ‌آپ برای چاپ/PDF لازم است", "error");
  };

  const exportDrillExcel = () => {
    const saleRows = drillRows.map((r) => [
      "فروش",
      r.invoiceNumber,
      r.customerName ?? "",
      r.grandTotal ?? 0,
      salesMethodLabel(r.salesMethod),
      fmtDate(r.createdAt),
      "",
    ]);
    const retRows = drillReturns.map((r) => [
      "مرجوعی",
      r.returnId,
      r.customerName ?? "",
      -(r.amount ?? 0),
      r.productName,
      fmtDate(r.createdAt),
      r.reason ?? "",
    ]);
    downloadCsv(
      `جزئیات-فروش-و-مرجوعی.csv`,
      ["نوع", "شماره", "مشتری", "مبلغ", "جزئیات", "تاریخ", "دلیل مرجوعی"],
      [...saleRows, ...retRows],
      {
        title: drill?.title ?? "جزئیات فروش و مرجوعی",
        ...brandOpts,
        summaryLines: [
          `فروش ناخالص: ${drillSummary.salesGross}`,
          `مرجوعی کسرشده: ${drillSummary.returnsTotal}`,
          `درآمد خالص: ${drillSummary.total}`,
        ],
      },
    );
  };

  const exportCurrentTab = () => {
    if (tab === "advanced") { exportAdvancedExcel(); return; }
    if (tab === "financial") {
      if (!financial) { toast("داده‌ای برای خروجی نیست", "info"); return; }
      downloadCsv("گزارش-مالی-روزانه.csv", ["تاریخ", "برچسب", "تعداد", "مبلغ"],
        financial.daily.map((d) => [d.date, d.label, d.count, d.total]),
        {
          title: "گزارش مالی روزانه",
          ...brandOpts,
          summaryLines: [
            `امروز: ${financial.cards.today.total}`,
            `این ماه: ${financial.cards.month.total}`,
          ],
        });
      toast("خروجی Excel حرفه‌ای دانلود شد");
      return;
    }
    if (tab === "sales" || tab === "my_sales") {
      const rows = tab === "my_sales" ? (mySales?.invoices ?? []) : (data as InvRow[]);
      if (!rows.length) { toast("داده‌ای برای خروجی نیست", "info"); return; }
      downloadCsv("گزارش-فروش.csv", ["شماره", "مشتری", "مبلغ", "روش فروش", "تاریخ"],
        rows.map((r) => [r.invoiceNumber, r.customerName ?? "", r.grandTotal ?? 0, salesMethodLabel(r.salesMethod), fmtDate(r.createdAt)]),
        { title: tab === "my_sales" ? "فروش‌های من" : "گزارش فروش", ...brandOpts });
      toast("خروجی Excel حرفه‌ای دانلود شد");
      return;
    }
    if (tab === "returns") {
      const rows = data as RetRow[];
      if (!rows.length) { toast("داده‌ای برای خروجی نیست", "info"); return; }
      downloadCsv("گزارش-مرجوعی.csv",
        ["کد", "محصول", "رنگ", "سایز", "بارکد", "تعداد", "مبلغ", "دلیل", "توضیحات", "مشتری", "موبایل", "فاکتور", "فروشنده", "ثبت‌کننده", "انبار مرجوعی", "تاریخ"],
        rows.map((r) => [
          r.returnId,
          r.productName,
          r.color ?? "",
          r.size ?? "",
          r.barcode ?? "",
          r.quantity,
          r.amount ?? r.unitPrice ?? "",
          r.reason ?? "",
          r.notes ?? "",
          r.customerName ?? "",
          r.customerPhone ?? "",
          r.invoiceNumber ?? "",
          r.originalSoldByName ?? "",
          r.returnedByName ?? "",
          r.returnWarehouseName ?? "",
          fmtDate(r.createdAt),
        ]),
        { title: "گزارش مرجوعی", ...brandOpts });
      toast("خروجی Excel حرفه‌ای دانلود شد");
      return;
    }
    if (tab === "ledger") {
      const rows = data as LedgerRow[];
      if (!rows.length) { toast("داده‌ای برای خروجی نیست", "info"); return; }
      downloadCsv("گزارش-گردش-موجودی.csv", ["محصول", "رنگ", "سایز", "بارکد", "تعداد", "نوع", "مبدأ", "مقصد", "سند", "اپراتور", "تاریخ"],
        rows.map((r) => [
          r.productName ?? "", r.color ?? "", r.size ?? "", r.barcode ?? "", r.quantity,
          r.transactionType, r.sourceWarehouse?.name ?? "", r.destWarehouse?.name ?? "",
          r.documentNumber ?? "", r.operatorName ?? "", fmtDateTime(r.createdAt),
        ]),
        { title: "گردش موجودی", ...brandOpts });
      toast("خروجی Excel حرفه‌ای دانلود شد");
      return;
    }
    if (tab === "stock") {
      const rows = data as StockRow[];
      if (!rows.length) { toast("داده‌ای برای خروجی نیست", "info"); return; }
      downloadCsv("گزارش-موجودی.csv", ["انبار", "محصول", "رنگ", "سایز", "تعداد"],
        rows.map((r) => [r.warehouse?.name ?? "", r.product?.name ?? "", r.variation?.color ?? "", r.variation?.size ?? "", r.quantity ?? 0]),
        { title: "موجودی انبارها", ...brandOpts });
      toast("خروجی Excel حرفه‌ای دانلود شد");
      return;
    }
    if (tab === "transfers") {
      const rows = data as DocRow[];
      if (!rows.length) { toast("داده‌ای برای خروجی نیست", "info"); return; }
      downloadCsv("گزارش-اسناد-انبار.csv", ["شماره سند", "نوع", "مبدأ", "مقصد", "تعداد", "اپراتور", "تاریخ"],
        rows.map((r) => [
          r.documentNumber, r.type, r.sourceWarehouse?.name ?? "", r.destWarehouse?.name ?? "",
          r.totalQuantity ?? 0, r.operatorName ?? "", fmtDateTime(r.createdAt),
        ]),
        { title: "اسناد انتقال و توزیع", ...brandOpts });
      toast("خروجی Excel حرفه‌ای دانلود شد");
      return;
    }
    if (tab === "audit") {
      const rows = data as AuditRow[];
      if (!rows.length) { toast("داده‌ای برای خروجی نیست", "info"); return; }
      downloadCsv("گزارش-ممیزی.csv", ["کاربر", "عملیات", "جزئیات", "تاریخ"],
        rows.map((r) => [r.userName ?? "", r.action, r.detail ?? "", fmtDateTime(r.createdAt)]),
        { title: "گزارش ممیزی", ...brandOpts });
      toast("خروجی Excel حرفه‌ای دانلود شد");
      return;
    }
    if (tab === "stocktake") {
      const rows = data as StocktakeSessionRow[];
      if (!rows.length) { toast("داده‌ای برای خروجی نیست", "info"); return; }
      downloadCsv("گزارش-انبارگردانی.csv",
        ["شماره جلسه", "انبار", "وضعیت", "بررسی‌شده", "همخوانی", "جزئی", "تناقض", "کسری", "مازاد", "اپراتور", "تاریخ"],
        rows.map((r) => [
          r.sessionNumber,
          r.warehouseName,
          r.status === "completed" ? "کامل" : r.status === "partial" ? "ناقص" : "باز",
          `${r.checkedProductCount ?? 0}/${r.expectedProductCount ?? 0}`,
          r.matchCount ?? 0,
          r.partialCount ?? 0,
          r.mismatchCount ?? 0,
          r.shortageQty ?? 0,
          r.surplusQty ?? 0,
          r.operatorName ?? "",
          fmtDate(r.completedAt ?? r.startedAt),
        ]),
        { title: "سوابق انبارگردانی", ...brandOpts });
      toast("خروجی Excel حرفه‌ای دانلود شد");
      return;
    }
    toast("برای این تب ابتدا داده‌ها را بارگذاری کنید", "info");
  };

  const exportCurrentPdf = () => {
    if (tab === "advanced") { exportAdvancedPdf(); return; }
    if (tab === "financial" && financial) {
      const ok = openPrintReport({
        title: "گزارش مالی",
        docLabel: "گزارش مالی",
        subtitle: `سال ${financial.jalaliYear ?? "—"}`,
        headers: ["تاریخ", "برچسب", "تعداد", "مبلغ", "مرجوعی"],
        rows: financial.daily.map((d) => [d.date, d.label, faNumber(d.count), toman(d.total), toman(d.returnsTotal ?? 0)]),
        summaryCards: [
          { label: "امروز", value: toman(financial.cards.today.total) },
          { label: "این ماه", value: toman(financial.cards.month.total) },
          { label: "امسال", value: toman(financial.cards.year.total) },
          { label: "کل", value: toman(financial.cards.all.total) },
        ],
        ...brandOpts,
      });
      if (!ok) toast("اجازه پاپ‌آپ برای چاپ/PDF لازم است", "error");
      return;
    }
    if (tab === "sales" || tab === "my_sales") {
      const rows = tab === "my_sales" ? (mySales?.invoices ?? []) : (data as InvRow[]);
      if (!rows.length) { toast("داده‌ای برای خروجی نیست", "info"); return; }
      const ok = openPrintReport({
        title: tab === "my_sales" ? "فروش‌های من" : "گزارش فروش",
        docLabel: "گزارش فروش",
        headers: ["شماره", "مشتری", "مبلغ", "روش فروش", "تاریخ"],
        rows: rows.map((r) => [
          r.invoiceNumber, r.customerName || "—", toman(r.grandTotal ?? 0),
          salesMethodLabel(r.salesMethod), fmtDate(r.createdAt),
        ]),
        ...brandOpts,
      });
      if (!ok) toast("اجازه پاپ‌آپ برای چاپ/PDF لازم است", "error");
      return;
    }
    if (tab === "returns") {
      const rows = data as RetRow[];
      if (!rows.length) { toast("داده‌ای برای خروجی نیست", "info"); return; }
      const ok = openPrintReport({
        title: "گزارش مرجوعی",
        docLabel: "مرجوعی",
        headers: ["کد", "محصول", "مشتری", "تعداد", "مبلغ", "دلیل", "تاریخ"],
        rows: rows.map((r) => [
          r.returnId,
          r.productName,
          r.customerName || r.customerPhone || "—",
          faNumber(r.quantity),
          toman(r.amount ?? 0),
          r.reason || "—",
          fmtDate(r.createdAt),
        ]),
        ...brandOpts,
      });
      if (!ok) toast("اجازه پاپ‌آپ برای چاپ/PDF لازم است", "error");
      return;
    }
    if (tab === "ledger") {
      const rows = data as LedgerRow[];
      if (!rows.length) { toast("داده‌ای برای خروجی نیست", "info"); return; }
      const ok = openPrintReport({
        title: "گردش موجودی",
        docLabel: "دفتر موجودی",
        headers: ["محصول", "تنوع", "تعداد", "نوع", "مسیر", "سند", "تاریخ"],
        rows: rows.map((r) => [
          r.productName || "—",
          [r.color, r.size].filter(Boolean).join(" / ") || "—",
          faNumber(r.quantity),
          r.transactionType,
          [r.sourceWarehouse?.name, r.destWarehouse?.name].filter(Boolean).join(" ← ") || "—",
          r.documentNumber || "—",
          fmtDate(r.createdAt),
        ]),
        ...brandOpts,
      });
      if (!ok) toast("اجازه پاپ‌آپ برای چاپ/PDF لازم است", "error");
      return;
    }
    if (tab === "stock") {
      const rows = data as StockRow[];
      if (!rows.length) { toast("داده‌ای برای خروجی نیست", "info"); return; }
      const ok = openPrintReport({
        title: "موجودی انبارها",
        docLabel: "موجودی",
        headers: ["انبار", "محصول", "رنگ", "سایز", "تعداد"],
        rows: rows.map((r) => [
          r.warehouse?.name || "—", r.product?.name || "—",
          r.variation?.color || "—", r.variation?.size || "—", faNumber(r.quantity ?? 0),
        ]),
        ...brandOpts,
      });
      if (!ok) toast("اجازه پاپ‌آپ برای چاپ/PDF لازم است", "error");
      return;
    }
    if (tab === "transfers") {
      const rows = data as DocRow[];
      if (!rows.length) { toast("داده‌ای برای خروجی نیست", "info"); return; }
      const ok = openPrintReport({
        title: "اسناد انتقال و توزیع",
        docLabel: "حواله",
        headers: ["شماره", "نوع", "مبدأ", "مقصد", "تعداد", "اپراتور", "تاریخ"],
        rows: rows.map((r) => [
          r.documentNumber,
          r.type === "distribution" ? "توزیع" : "انتقال",
          r.sourceWarehouse?.name || "—",
          r.destWarehouse?.name || "—",
          faNumber(r.totalQuantity ?? 0),
          r.operatorName || "—",
          fmtDate(r.createdAt),
        ]),
        ...brandOpts,
      });
      if (!ok) toast("اجازه پاپ‌آپ برای چاپ/PDF لازم است", "error");
      return;
    }
    if (tab === "stocktake") {
      const rows = data as StocktakeSessionRow[];
      if (!rows.length) { toast("داده‌ای برای خروجی نیست", "info"); return; }
      const ok = openPrintReport({
        title: "سوابق انبارگردانی",
        docLabel: "انبارگردانی",
        headers: ["شماره جلسه", "انبار", "وضعیت", "بررسی‌شده", "همخوانی", "کسری/مازاد", "اپراتور", "تاریخ"],
        rows: rows.map((r) => [
          r.sessionNumber,
          r.warehouseName,
          r.status === "completed" ? "کامل" : r.status === "partial" ? "ناقص" : "باز",
          `${faNumber(r.checkedProductCount ?? 0)}/${faNumber(r.expectedProductCount ?? 0)}`,
          faNumber(r.matchCount ?? 0),
          `−${faNumber(r.shortageQty ?? 0)} / +${faNumber(r.surplusQty ?? 0)}`,
          r.operatorName || "—",
          fmtDate(r.completedAt ?? r.startedAt),
        ]),
        ...brandOpts,
      });
      if (!ok) toast("اجازه پاپ‌آپ برای چاپ/PDF لازم است", "error");
      return;
    }
    if (tab === "audit") {
      const rows = data as AuditRow[];
      if (!rows.length) { toast("داده‌ای برای خروجی نیست", "info"); return; }
      const ok = openPrintReport({
        title: "گزارش ممیزی سیستم",
        docLabel: "لاگ",
        headers: ["کاربر", "عملیات", "جزئیات", "زمان"],
        rows: rows.map((r) => [
          r.userName || "سیستم",
          r.action,
          r.detail || "—",
          fmtDateTime(r.createdAt),
        ]),
        ...brandOpts,
      });
      if (!ok) toast("اجازه پاپ‌آپ برای چاپ/PDF لازم است", "error");
      return;
    }
    toast("برای این تب داده‌ای برای خروجی PDF نیست", "info");
  };

  const tabs = useMemo(() => {
    const list: { id: TabId; label: string; icon: React.ReactNode }[] = [];
    if (canFinancial) list.push({ id: "financial", label: "گزارش مالی", icon: <I.chart width={15} /> });
    if (canAdvanced) list.push({ id: "advanced", label: "گزارش پیشرفته", icon: <I.layers width={15} /> });
    if (canMySales) list.push({ id: "my_sales", label: "فروش من", icon: <I.user width={15} /> });
    if (canSales) list.push({ id: "sales", label: "فروش", icon: <I.cart width={15} /> });
    if (canReturns) list.push({ id: "returns", label: "مرجوعی", icon: <I.refresh width={15} /> });
    if (canLedger) list.push({ id: "ledger", label: "دفتر موجودی", icon: <I.layers width={15} /> });
    if (canStock) list.push({ id: "stock", label: "موجودی فعلی", icon: <I.warehouse width={15} /> });
    if (canTransfers) list.push({ id: "transfers", label: "تاریخچه توزیع", icon: <I.box width={15} /> });
    if (canStocktake) list.push({ id: "stocktake", label: "انبارگردانی", icon: <I.layers width={15} /> });
    if (canAudit) list.push({ id: "audit", label: "لاگ سیستم", icon: <I.shield width={15} /> });
    return list;
  }, [canFinancial, canAdvanced, canMySales, canSales, canReturns, canLedger, canStock, canTransfers, canStocktake, canAudit]);

  const lookupBarcode = async () => {
    const code = normalizeBarcode(bcLookup);
    if (!code) return;
    const res = await fetch(`/api/inventory?view=barcode&barcode=${encodeURIComponent(code)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const d = await res.json();
    if (!d.ok) { toast(d.error ?? "یافت نشد", "error"); return; }
    toast(`${d.unit.product?.name} — ${d.unit.currentLocation} — ${d.history?.length ?? 0} حرکت`);
    switchTab("ledger");
    setBcLookup(code);
    setFilters((f) => ({ ...f, barcode: code }));
  };

  const txnLabel: Record<string, string> = {
    receipt: "ورود", distribution: "توزیع", transfer: "انتقال",
    sale: "فروش", return: "مرجوعی", adjustment: "تعدیل",
  };

  const maxDaily = Math.max(1, ...(financial?.daily.map((d) => Math.abs(d.total)) ?? [1]));
  const maxMonthly = Math.max(1, ...(financial?.monthly.map((m) => Math.abs(m.total)) ?? [1]));
  const monthGrowth = financial
    ? (financial.cards.prevMonth.total
      ? ((financial.cards.month.total - financial.cards.prevMonth.total) / financial.cards.prevMonth.total) * 100
      : financial.cards.month.total > 0 ? 100 : 0)
    : 0;

  const now = new Date();
  const today = isoDate(now);
  const weekFrom = isoDate(addDays(now, -6));
  const monthFrom = isoDate(startOfMonth(now));
  const yearFrom = isoDate(new Date(now.getFullYear(), 0, 1));
  const prevMonthFrom = isoDate(startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
  const prevMonthTo = isoDate(addDays(startOfMonth(now), -1));

  const cardClick = (key: keyof FinancialData["cards"]) => {
    const map: Record<string, Drilldown> = {
      today: { title: "فروش امروز", from: today, to: today },
      week: { title: "فروش ۷ روز اخیر", from: weekFrom, to: today },
      month: { title: "فروش این ماه", from: monthFrom, to: today },
      prevMonth: { title: "فروش ماه قبل", from: prevMonthFrom, to: prevMonthTo },
      year: { title: "فروش امسال", from: yearFrom, to: today },
      all: { title: "کل فروش" },
    };
    openDrill(map[key]);
  };

  return (
    <div>
      <SectionTitle icon={<I.chart />} title="گزارش‌ها" sub="فروش، موجودی، گزارش مالی و گزارش‌گیری پیشرفته"
        action={<div className="flex gap-2">
          <Btn variant="ghost" onClick={exportCurrentTab}><I.download width={16} /> Excel</Btn>
          <Btn variant="ghost" onClick={exportCurrentPdf}>
            <I.printer width={16} /> PDF
          </Btn>
        </div>} />

      {canInventoryTrack && (
        <Glass className="mb-4 p-4">
          <div className="flex flex-wrap items-end gap-2">
            <Field label="ردیابی بارکد" className="min-w-[200px] flex-1">
              <Input value={bcLookup} onChange={(e) => setBcLookup(e.target.value)} dir="ltr" placeholder="2800000001001"
                onKeyDown={(e) => e.key === "Enter" && lookupBarcode()} />
            </Field>
            <Btn variant="soft" onClick={lookupBarcode}><I.scan width={14} /> رهگیری</Btn>
          </div>
        </Glass>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => switchTab(t.id)}
            className={`press inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${tab === t.id ? "grad-brand text-white" : "glass-2 text-muted hover:text-strong"}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {(tab === "ledger" || tab === "stock" || tab === "transfers") && (
        <Glass className="mb-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Field label="انبار">
              <Select value={filters.warehouseId} onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}>
                <option value="">همه</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
            <Field label="بارکد"><Input value={filters.barcode} onChange={(e) => setFilters({ ...filters, barcode: e.target.value })} dir="ltr" /></Field>
            <Field label="شماره سند"><Input value={filters.documentNumber} onChange={(e) => setFilters({ ...filters, documentNumber: e.target.value })} dir="ltr" /></Field>
            <JalaliDatePicker
              label="از تاریخ"
              value={filters.from}
              valueCalendar="gregorian"
              allowEmpty
              onChange={(from) => setFilters({ ...filters, from })}
            />
            <JalaliDatePicker
              label="تا تاریخ"
              value={filters.to}
              valueCalendar="gregorian"
              allowEmpty
              onChange={(to) => setFilters({ ...filters, to })}
            />
          </div>
        </Glass>
      )}

      {tab === "financial" ? (
        loading ? (
          <div className="py-16 text-center"><I.refresh width={28} className="anim-spin-slow mx-auto text-muted" /></div>
        ) : financial ? (
          <div className="min-w-0 space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {([
                { key: "today" as const, title: "درآمد خالص امروز", ...financial.cards.today, tone: "from-emerald-500/20 to-emerald-500/5" },
                { key: "week" as const, title: "خالص ۷ روز اخیر", ...financial.cards.week, tone: "from-sky-500/20 to-sky-500/5" },
                { key: "month" as const, title: "خالص این ماه", ...financial.cards.month, tone: "from-brand-500/25 to-brand-500/5" },
                { key: "prevMonth" as const, title: "خالص ماه قبل", ...financial.cards.prevMonth, tone: "from-amber-500/20 to-amber-500/5" },
                { key: "year" as const, title: "خالص امسال", ...financial.cards.year, tone: "from-cyan-500/20 to-cyan-500/5" },
                { key: "all" as const, title: "کل درآمد خالص", ...financial.cards.all, tone: "from-rose-500/15 to-rose-500/5" },
              ]).map((c) => (
                <button
                  key={c.title}
                  type="button"
                  onClick={() => cardClick(c.key)}
                  className={`rounded-3xl border border-white/10 bg-gradient-to-br ${c.tone} p-5 text-right transition hover:border-brand-400/40 hover:scale-[1.01]`}
                >
                  <p className="text-xs font-medium text-muted">{c.title} · کلیک برای جزئیات</p>
                  <p className={`mt-2 text-2xl font-black ${(c.total ?? 0) < 0 ? "text-rose-500" : "text-strong"}`}>
                    {toman(c.total)}
                  </p>
                  <div className="mt-2 space-y-1 text-[11px] text-muted">
                    <p>فروش ناخالص: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{toman(c.salesGross ?? 0)}</span></p>
                    <p>مرجوعی: <span className="font-semibold text-rose-500">−{toman(c.returnsTotal ?? 0)}</span></p>
                    <p>{faNumber(c.count)} فاکتور</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <Glass className="min-w-0 overflow-hidden p-3 sm:p-5 lg:col-span-2">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-strong">روند ۱۴ روز اخیر (خالص)</h3>
                    <p className="text-xs text-muted">فروش منهای مرجوعی — روی هر روز کلیک کنید</p>
                  </div>
                  <Badge className="max-w-full whitespace-normal text-center" tone={monthGrowth >= 0 ? "green" : "red"}>
                    {monthGrowth >= 0 ? "▲" : "▼"} {faNumber(Math.abs(Math.round(monthGrowth)))}٪ نسبت به ماه قبل
                  </Badge>
                </div>
                <div className="flex h-48 min-w-0 max-w-full gap-1 sm:h-52 sm:gap-2">
                  {financial.daily.map((d) => {
                    const pct = Math.max(d.total !== 0 ? 8 : 2, (Math.abs(d.total) / maxDaily) * 100);
                    return (
                      <button
                        key={d.date}
                        type="button"
                        onClick={() => openDrill({ title: `درآمد خالص ${d.label}`, from: d.date, to: d.date })}
                        className="flex min-w-0 flex-1 flex-col items-center rounded-lg transition hover:bg-white/5"
                        title={`${d.label}: خالص ${toman(d.total)} · مرجوعی ${toman(d.returnsTotal ?? 0)}`}
                      >
                        <span className={`mb-1 w-full truncate text-center text-[8px] font-bold leading-tight sm:text-[10px] ${d.total < 0 ? "text-rose-500" : "text-strong"}`}>
                          {tomanShort(d.total)}
                          <span className="hidden font-medium text-muted sm:inline"> تومان</span>
                        </span>
                        <div className="flex w-full flex-1 items-end">
                          <div
                            className={`w-full rounded-t-lg transition-all ${d.total < 0 ? "bg-gradient-to-t from-rose-600 to-rose-400/80" : "bg-gradient-to-t from-brand-600 to-cyan-400/80"}`}
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                        <span className="mt-1 w-full truncate text-center text-[9px] text-muted sm:text-[10px]">{d.label}</span>
                        {(d.returnsTotal ?? 0) > 0 && (
                          <span className="w-full truncate text-center text-[8px] text-rose-400">−{tomanShort(d.returnsTotal ?? 0)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </Glass>

              <Glass className="min-w-0 overflow-hidden space-y-3 p-4 sm:p-5">
                <h3 className="font-bold text-strong">شاخص‌های ماه</h3>
                <button type="button" onClick={() => cardClick("month")} className="w-full rounded-2xl glass-2 p-3 text-right transition hover:bg-white/8">
                  <p className="text-[11px] text-muted">میانگین هر فاکتور</p>
                  <p className="break-words text-base font-extrabold leading-relaxed text-strong sm:text-lg">{toman(financial.avgTicketMonth)}</p>
                </button>
                <button type="button" onClick={() => cardClick("month")} className="w-full rounded-2xl glass-2 p-3 text-right transition hover:bg-white/8">
                  <p className="text-[11px] text-muted">تعداد فروش این ماه</p>
                  <p className="text-lg font-extrabold text-strong">{faNumber(financial.cards.month.count)}</p>
                </button>
                <button
                  type="button"
                  disabled={!financial.ranking[0]}
                  onClick={() => financial.ranking[0] && openDrill({
                    title: `فروش ${financial.ranking[0].name} (این ماه)`,
                    from: monthFrom,
                    to: today,
                    soldBy: financial.ranking[0].userId || undefined,
                  })}
                  className="w-full rounded-2xl glass-2 p-3 text-right transition hover:bg-white/8 disabled:opacity-50"
                >
                  <p className="text-[11px] text-muted">بهترین فروشنده ماه</p>
                  <p className="text-sm font-bold text-strong">{financial.ranking[0]?.name ?? "—"}</p>
                  {financial.ranking[0] && (
                    <p className="break-words text-xs leading-relaxed text-muted">{toman(financial.ranking[0].total)}</p>
                  )}
                </button>
              </Glass>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Glass className="p-5">
                <h3 className="mb-4 font-bold text-strong">رتبه‌بندی فروشندگان (این ماه)</h3>
                <div className="space-y-2">
                  {financial.ranking.map((r, i) => (
                    <button
                      key={r.userId}
                      type="button"
                      onClick={() => openDrill({
                        title: `فروش ${r.name} (این ماه)`,
                        from: monthFrom,
                        to: today,
                        soldBy: r.userId || undefined,
                      })}
                      className="flex w-full items-center gap-3 rounded-2xl glass-2 px-3 py-2.5 text-right transition hover:bg-white/8"
                    >
                      <span className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-black ${
                        i === 0 ? "bg-amber-500/25 text-amber-400" : i === 1 ? "bg-slate-400/25 text-slate-300" : i === 2 ? "bg-orange-700/25 text-orange-400" : "bg-white/10 text-muted"
                      }`}>{faNumber(i + 1)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-strong">{r.name}</p>
                        <p className="text-[11px] text-muted">{faNumber(r.count)} فاکتور · کلیک برای جزئیات</p>
                      </div>
                      <p className="shrink-0 text-sm font-bold grad-text">{toman(r.total)}</p>
                    </button>
                  ))}
                  {!financial.ranking.length && <p className="py-8 text-center text-muted">فروشی در این ماه ثبت نشده</p>}
                </div>
              </Glass>

              <Glass className="p-5">
                <h3 className="mb-1 font-bold text-strong">فروش ۱۲ ماه سال</h3>
                <p className="mb-4 text-xs text-muted">
                  سال {financial.jalaliYear ? faNumber(financial.jalaliYear) : "جاری"} شمسی · روی ماه کلیک کنید
                </p>
                <div className="mb-4 flex h-44 gap-1 sm:h-52">
                  {financial.monthly.map((m) => {
                    const pct = Math.max(m.total !== 0 ? 6 : 2, (Math.abs(m.total) / maxMonthly) * 100);
                    return (
                      <button
                        key={m.month}
                        type="button"
                        onClick={() => openDrill({
                          title: `درآمد خالص ${m.label} ${financial.jalaliYear ?? ""}`,
                          jalaliYear: financial.jalaliYear,
                          jalaliMonth: m.month,
                        })}
                        className="flex min-w-0 flex-1 flex-col items-center rounded-md transition hover:bg-white/5"
                        title={`${m.label}: خالص ${toman(m.total)} · مرجوعی ${toman(m.returnsTotal ?? 0)}`}
                      >
                        <span className={`mb-1 w-full truncate text-center text-[7px] font-bold leading-tight sm:text-[9px] ${m.total < 0 ? "text-rose-500" : "text-strong"}`}>
                          {tomanShort(m.total)}
                        </span>
                        <div className="flex w-full flex-1 items-end">
                          <div
                            className={`w-full rounded-t-md transition-all ${m.total < 0 ? "bg-gradient-to-t from-rose-600 to-rose-400/80" : "bg-gradient-to-t from-cyan-600 to-brand-400/80"}`}
                            style={{ height: `${pct}%` }}
                          />
                        </div>
                        <span className="mt-1 w-full text-center text-[7px] leading-tight text-muted sm:text-[8px]">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="max-h-56 space-y-1.5 overflow-y-auto">
                  {financial.monthly.map((m) => (
                    <button
                      key={m.month}
                      type="button"
                      onClick={() => openDrill({
                        title: `فروش ${m.label} ${financial.jalaliYear ?? ""}`,
                        jalaliYear: financial.jalaliYear,
                        jalaliMonth: m.month,
                      })}
                      className="flex w-full items-center justify-between gap-3 rounded-xl glass-2 px-3 py-2 text-right transition hover:bg-white/8"
                    >
                      <div>
                        <p className="text-sm font-semibold text-strong">{m.label}</p>
                        <p className="text-[11px] text-muted">{faNumber(m.count)} فاکتور</p>
                      </div>
                      <p className="text-sm font-bold text-strong">{toman(m.total)}</p>
                    </button>
                  ))}
                </div>
              </Glass>
            </div>
          </div>
        ) : (
          <Glass className="py-16 text-center text-muted">داده‌ای برای گزارش مالی نیست</Glass>
        )
      ) : tab === "advanced" ? (
        <div className="space-y-4">
          <Glass className="p-4">
            <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <JalaliDatePicker
                label="از تاریخ"
                value={adv.from}
                valueCalendar="gregorian"
                minYear={1300}
                onChange={(from) => setAdv({ ...adv, from })}
              />
              <JalaliDatePicker
                label="تا تاریخ"
                value={adv.to}
                valueCalendar="gregorian"
                minYear={1300}
                onChange={(to) => setAdv({ ...adv, to })}
              />
              <Field label="نوع عملیات">
                <Select value={adv.kind} onChange={(e) => setAdv({ ...adv, kind: e.target.value })}>
                  <option value="all">همه (فروش + مرجوعی + ویرایش)</option>
                  <option value="sales">فقط فروش</option>
                  <option value="returns">فقط مرجوعی</option>
                  <option value="edits">فقط ویرایش سفارش</option>
                </Select>
              </Field>
              <Field label="روش فروش">
                <Select value={adv.salesMethod} onChange={(e) => setAdv({ ...adv, salesMethod: e.target.value })}>
                  <option value="">همه</option>
                  {SALES_METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </Select>
              </Field>
              <Field label="دسته‌بندی">
                <Select value={adv.category} onChange={(e) => setAdv({ ...adv, category: e.target.value })}>
                  <option value="">همه</option>
                  {(meta?.categories ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="نام کالا">
                <Input
                  list="adv-product-names"
                  value={adv.productName}
                  onChange={(e) => setAdv({ ...adv, productName: e.target.value, productId: "" })}
                  placeholder="جستجو نام محصول"
                />
                <datalist id="adv-product-names">
                  {(meta?.products ?? []).map((p) => <option key={p.id} value={p.name} />)}
                </datalist>
              </Field>
              <Field label="رنگ / نوع کالا">
                <Select value={adv.color} onChange={(e) => setAdv({ ...adv, color: e.target.value })}>
                  <option value="">همه رنگ‌ها</option>
                  {(meta?.colors ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="سایز">
                <Select value={adv.size} onChange={(e) => setAdv({ ...adv, size: e.target.value })}>
                  <option value="">همه سایزها</option>
                  {(meta?.sizes ?? []).map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="انبار">
                <Select value={adv.warehouseId} onChange={(e) => setAdv({ ...adv, warehouseId: e.target.value })}>
                  <option value="">همه</option>
                  {(meta?.warehouses ?? warehouses).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
              </Field>
              <Field label="فروشنده / اپراتور">
                <Select value={adv.sellerId} onChange={(e) => setAdv({ ...adv, sellerId: e.target.value })}>
                  <option value="">همه</option>
                  {(meta?.sellers ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Btn onClick={runAdvanced} disabled={advLoading}>
                {advLoading ? "..." : <><I.chart width={14} /> اجرای گزارش</>}
              </Btn>
              <Btn variant="soft" onClick={exportAdvancedExcel} disabled={!advRows.length}><I.download width={14} /> Excel</Btn>
              <Btn variant="ghost" onClick={exportAdvancedPdf} disabled={!advRows.length}><I.printer width={14} /> PDF</Btn>
            </div>
          </Glass>

          {advSummary && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-brand-500/20 to-brand-500/5 p-4">
                <p className="text-xs text-muted">ردیف‌ها</p>
                <p className="text-xl font-black text-strong">{faNumber(advSummary.count)}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 p-4">
                <p className="text-xs text-muted">مبلغ فروش</p>
                <p className="text-xl font-black text-strong">{toman(advSummary.salesAmount)}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-sky-500/20 to-sky-500/5 p-4">
                <p className="text-xs text-muted">تعداد فروش / مرجوعی</p>
                <p className="text-xl font-black text-strong">{faNumber(advSummary.salesQty)} / {faNumber(advSummary.returnQty)}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-amber-500/20 to-amber-500/5 p-4">
                <p className="text-xs text-muted">ویرایش سفارش</p>
                <p className="text-xl font-black text-strong">{faNumber(advSummary.editCount)}</p>
              </div>
            </div>
          )}

          <Glass className="overflow-hidden p-0">
            {advLoading ? (
              <div className="py-16 text-center"><I.refresh width={28} className="anim-spin-slow mx-auto text-muted" /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-white/10 text-muted">
                    <th className="p-3 text-right font-medium">نوع</th>
                    <th className="p-3 text-right font-medium">شماره</th>
                    <th className="p-3 text-right font-medium">تاریخ</th>
                    <th className="p-3 text-right font-medium">محصول</th>
                    <th className="p-3 text-right font-medium">دسته / رنگ / سایز</th>
                    <th className="p-3 text-center font-medium">تعداد</th>
                    <th className="p-3 text-right font-medium">مبلغ</th>
                    <th className="p-3 text-right font-medium">روش فروش</th>
                    <th className="p-3 text-right font-medium">فروشنده</th>
                  </tr></thead>
                  <tbody>
                    {advRows.map((row, i) => (
                      <tr key={`${row.kind}-${row.id}-${i}`} className="border-b border-white/5 hover:bg-white/4">
                        <td className="p-3">
                          <Badge tone={row.kind === "sale" ? "green" : row.kind === "return" ? "amber" : "brand"}>
                            {KIND_LABEL[row.kind]}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {row.kind === "return" ? (
                            <span className="font-mono text-xs text-amber-400" dir="ltr">{row.ref}</span>
                          ) : (
                            <InvoiceNumberButton number={row.ref} onOpen={openByNumber} />
                          )}
                        </td>
                        <td className="p-3 text-xs text-muted">{fmtDate(row.date)}</td>
                        <td className="p-3 text-strong">{row.productName}</td>
                        <td className="p-3 text-xs text-muted">
                          {[row.category, row.color, row.size].filter(Boolean).join(" / ") || "—"}
                        </td>
                        <td className="p-3 text-center font-bold">{faNumber(row.quantity)}</td>
                        <td className="p-3 font-bold grad-text">{row.amount ? toman(row.amount) : "—"}</td>
                        <td className="p-3 text-xs">{row.salesMethodLabel}</td>
                        <td className="p-3 text-xs">{row.sellerName ?? "—"}</td>
                      </tr>
                    ))}
                    {!advRows.length && (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-muted">
                          {advQueried ? "با این فیلترها داده‌ای یافت نشد" : "فیلترها را تنظیم و «اجرای گزارش» را بزنید"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Glass>
        </div>
      ) : tab === "my_sales" ? (
        loading ? (
          <div className="py-16 text-center"><I.refresh width={28} className="anim-spin-slow mx-auto text-muted" /></div>
        ) : mySales ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { title: "درآمد خالص امروز من", ...mySales.summary.today },
                { title: "خالص این ماه من", ...mySales.summary.month },
                { title: "کل درآمد خالص من", ...mySales.summary.all },
              ].map((c) => (
                <div key={c.title} className="rounded-3xl border border-white/10 bg-gradient-to-br from-brand-500/20 to-brand-500/5 p-5">
                  <p className="text-xs font-medium text-muted">{c.title}</p>
                  <p className={`mt-2 text-xl font-black ${(c.total ?? 0) < 0 ? "text-rose-500" : "text-strong"}`}>{toman(c.total)}</p>
                  <p className="mt-1 text-xs text-muted">{faNumber(c.count)} فاکتور</p>
                  {(c.returnsTotal ?? 0) > 0 && (
                    <p className="mt-1 text-[11px] text-rose-500">مرجوعی: −{toman(c.returnsTotal ?? 0)}</p>
                  )}
                </div>
              ))}
            </div>
            <Glass className="overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-white/10 text-muted">
                    <th className="p-3 text-right font-medium">شماره فاکتور</th>
                    <th className="p-3 text-right font-medium">مشتری</th>
                    <th className="p-3 text-right font-medium">مبلغ</th>
                    <th className="p-3 text-right font-medium">تاریخ</th>
                  </tr></thead>
                  <tbody>
                    {mySales.invoices.map((row) => (
                      <tr key={row.id} className="border-b border-white/5 hover:bg-white/4">
                        <td className="p-3"><InvoiceNumberButton number={row.invoiceNumber} onOpen={openByNumber} /></td>
                        <td className="p-3 text-strong">{row.customerName || "—"}</td>
                        <td className="p-3 font-bold grad-text">{toman(row.grandTotal ?? 0)}</td>
                        <td className="p-3 text-xs text-muted">{fmtDate(row.createdAt)}</td>
                      </tr>
                    ))}
                    {!mySales.invoices.length && <tr><td colSpan={4} className="py-12 text-center text-muted">فروشی ثبت نشده</td></tr>}
                  </tbody>
                </table>
              </div>
            </Glass>
          </div>
        ) : (
          <Glass className="py-16 text-center text-muted">داده‌ای نیست</Glass>
        )
      ) : (
      <Glass className="overflow-hidden p-0">
        {loading ? (
          <div className="py-16 text-center"><I.refresh width={28} className="anim-spin-slow mx-auto text-muted" /></div>
        ) : tab === "sales" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-muted">
                <th className="p-3 text-right font-medium">شماره فاکتور</th>
                <th className="p-3 text-right font-medium">مشتری</th>
                <th className="p-3 text-right font-medium">اقلام / بارکدها</th>
                <th className="p-3 text-right font-medium">مبلغ</th>
                <th className="p-3 text-center font-medium">وضعیت</th>
                <th className="p-3 text-right font-medium">تاریخ</th>
              </tr></thead>
              <tbody>
                {(data as InvRow[]).map((row) => (
                  <tr key={row.id} className="border-b border-white/5 align-top hover:bg-white/4">
                    <td className="p-3"><InvoiceNumberButton number={row.invoiceNumber} onOpen={openByNumber} /></td>
                    <td className="p-3 text-strong">{row.customerName || "—"}</td>
                    <td className="p-3">
                      <div className="max-w-md space-y-1.5">
                        {(row.items ?? []).map((it, i) => {
                          const bcs = (it.unitBarcodes?.length ? it.unitBarcodes : it.barcode ? [it.barcode] : []);
                          return (
                            <div key={i} className="rounded-xl glass-2 px-2.5 py-1.5">
                              <p className="text-xs font-semibold text-strong">
                                {it.productName}
                                {(it.color || it.size) ? ` — ${[it.color, it.size].filter(Boolean).join(" / ")}` : ""}
                                <span className="font-normal text-muted"> × {faNumber(it.quantity)}</span>
                              </p>
                              {bcs.map((b) => (
                                <p key={b} className="font-mono text-[11px] text-muted" dir="ltr">{b}</p>
                              ))}
                            </div>
                          );
                        })}
                        {!row.items?.length && <span className="text-xs text-muted">—</span>}
                      </div>
                    </td>
                    <td className="p-3 font-bold grad-text">{toman(row.grandTotal ?? 0)}</td>
                    <td className="p-3 text-center"><Badge tone={row.status === "completed" ? "green" : "amber"}>{row.status === "completed" ? "تکمیل" : row.status ?? "—"}</Badge></td>
                    <td className="p-3 text-xs text-muted">{fmtDate(row.createdAt)}</td>
                  </tr>
                ))}
                {!data.length && <tr><td colSpan={6} className="py-12 text-center text-muted">داده‌ای یافت نشد</td></tr>}
              </tbody>
            </table>
          </div>
        ) : tab === "returns" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-muted">
                <th className="p-3 text-right font-medium">کد مرجوعی</th>
                <th className="p-3 text-right font-medium">محصول</th>
                <th className="p-3 text-right font-medium">مشتری</th>
                <th className="p-3 text-center font-medium">تعداد</th>
                <th className="p-3 text-right font-medium">مبلغ</th>
                <th className="p-3 text-right font-medium">دلیل</th>
                <th className="p-3 text-right font-medium">تاریخ</th>
              </tr></thead>
              <tbody>
                {(data as RetRow[]).map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/4">
                    <td className="p-3">
                      <button
                        type="button"
                        dir="ltr"
                        className="cursor-pointer bg-transparent p-0 text-right font-mono text-xs text-amber-400 hover:underline"
                        onClick={() => setViewReturn(row)}
                        title="مشاهده جزئیات مرجوعی"
                      >
                        {row.returnId ?? "—"}
                      </button>
                    </td>
                    <td className="p-3 text-strong">
                      {row.productName ?? "—"}
                      {(row.color || row.size) ? (
                        <span className="block text-[11px] font-normal text-muted">
                          {[row.color, row.size].filter(Boolean).join(" / ")}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3 text-xs">
                      <p className="text-strong">{row.customerName || "—"}</p>
                      {row.customerPhone && <p className="font-mono text-muted" dir="ltr">{row.customerPhone}</p>}
                    </td>
                    <td className="p-3 text-center font-bold">{faNumber(row.quantity ?? 0)}</td>
                    <td className="p-3 font-bold text-rose-500">{toman(row.amount ?? 0)}</td>
                    <td className="p-3 text-muted">{row.reason || "—"}</td>
                    <td className="p-3 text-xs text-muted">{fmtDate(row.createdAt)}</td>
                  </tr>
                ))}
                {!data.length && <tr><td colSpan={7} className="py-12 text-center text-muted">داده‌ای یافت نشد</td></tr>}
              </tbody>
            </table>
          </div>
        ) : tab === "ledger" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-muted">
                <th className="p-3 text-right font-medium">زمان</th>
                <th className="p-3 text-right font-medium">نوع</th>
                <th className="p-3 text-right font-medium">محصول</th>
                <th className="p-3 text-right font-medium">بارکد</th>
                <th className="p-3 text-center font-medium">تعداد</th>
                <th className="p-3 text-right font-medium">مبدأ</th>
                <th className="p-3 text-right font-medium">مقصد</th>
                <th className="p-3 text-right font-medium">سند</th>
                <th className="p-3 text-right font-medium">اپراتور</th>
              </tr></thead>
              <tbody>
                {(data as LedgerRow[]).map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/4">
                    <td className="p-3 text-xs text-muted">{fmtDateTime(row.createdAt)}</td>
                    <td className="p-3"><Badge tone={(row.quantity ?? 0) > 0 ? "green" : "amber"}>{txnLabel[row.transactionType] ?? row.transactionType}</Badge></td>
                    <td className="p-3 text-xs text-strong">{row.productName}{row.color ? ` / ${row.color}` : ""}{row.size ? ` / ${row.size}` : ""}</td>
                    <td className="p-3 font-mono text-xs" dir="ltr">{row.barcode}</td>
                    <td className={`p-3 text-center font-bold ${(row.quantity ?? 0) > 0 ? "text-emerald-400" : "text-rose-400"}`}>{(row.quantity ?? 0) > 0 ? "+" : ""}{faNumber(row.quantity ?? 0)}</td>
                    <td className="p-3 text-xs text-muted">{row.sourceWarehouse?.name ?? "—"}</td>
                    <td className="p-3 text-xs text-muted">{row.destWarehouse?.name ?? "—"}</td>
                    <td className="p-3"><DocNumberButton number={row.documentNumber} onOpen={openTransferDoc} /></td>
                    <td className="p-3 text-xs">{row.operatorName ?? "—"}</td>
                  </tr>
                ))}
                {!data.length && <tr><td colSpan={9} className="py-12 text-center text-muted">حرکتی ثبت نشده</td></tr>}
              </tbody>
            </table>
          </div>
        ) : tab === "stock" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-muted">
                <th className="p-3 text-right font-medium">محصول</th>
                <th className="p-3 text-right font-medium">رنگ / سایز</th>
                <th className="p-3 text-right font-medium">انبار</th>
                <th className="p-3 text-center font-medium">موجودی</th>
              </tr></thead>
              <tbody>
                {(data as StockRow[]).map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/4">
                    <td className="p-3 text-strong">{row.product?.name ?? "—"}</td>
                    <td className="p-3 text-muted">{row.variation ? `${row.variation.color} / ${row.variation.size}` : "—"}</td>
                    <td className="p-3">{row.warehouse?.name ?? "—"}</td>
                    <td className="p-3 text-center font-extrabold">{faNumber(row.quantity ?? 0)}</td>
                  </tr>
                ))}
                {!data.length && <tr><td colSpan={4} className="py-12 text-center text-muted">موجودی‌ای یافت نشد</td></tr>}
              </tbody>
            </table>
          </div>
        ) : tab === "transfers" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-muted">
                <th className="p-3 text-right font-medium">شماره سند</th>
                <th className="p-3 text-right font-medium">نوع</th>
                <th className="p-3 text-right font-medium">مبدأ</th>
                <th className="p-3 text-right font-medium">مقصد</th>
                <th className="p-3 text-center font-medium">تعداد</th>
                <th className="p-3 text-right font-medium">اپراتور</th>
                <th className="p-3 text-right font-medium">تاریخ</th>
              </tr></thead>
              <tbody>
                {(data as DocRow[]).map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/4">
                    <td className="p-3"><DocNumberButton number={row.documentNumber} onOpen={openTransferDoc} /></td>
                    <td className="p-3"><Badge tone={row.type === "distribution" ? "brand" : "sky"}>{row.type === "distribution" ? "توزیع" : "انتقال"}</Badge></td>
                    <td className="p-3">{row.sourceWarehouse?.name ?? "—"}</td>
                    <td className="p-3">{row.destWarehouse?.name ?? "—"}</td>
                    <td className="p-3 text-center font-bold">{faNumber(row.totalQuantity ?? 0)}</td>
                    <td className="p-3 text-muted">{row.operatorName}</td>
                    <td className="p-3 text-xs text-muted">{fmtDate(row.createdAt)}</td>
                  </tr>
                ))}
                {!data.length && <tr><td colSpan={7} className="py-12 text-center text-muted">سندی یافت نشد</td></tr>}
              </tbody>
            </table>
          </div>
        ) : tab === "stocktake" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-muted">
                <th className="p-3 text-right font-medium">شماره جلسه</th>
                <th className="p-3 text-right font-medium">انبار</th>
                <th className="p-3 text-right font-medium">وضعیت</th>
                <th className="p-3 text-center font-medium">بررسی‌شده</th>
                <th className="p-3 text-center font-medium">سبز/زرد/قرمز</th>
                <th className="p-3 text-right font-medium">کسری / مازاد</th>
                <th className="p-3 text-right font-medium">اپراتور</th>
                <th className="p-3 text-right font-medium">تاریخ</th>
              </tr></thead>
              <tbody>
                {(data as StocktakeSessionRow[]).map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/4">
                    <td className="p-3">
                      <SessionNumberButton number={row.sessionNumber} onOpen={() => void openStocktakeSession(row)} />
                    </td>
                    <td className="p-3 text-strong">{row.warehouseName}</td>
                    <td className="p-3">
                      <Badge tone={row.status === "completed" ? "green" : row.status === "partial" ? "amber" : "sky"}>
                        {row.status === "completed" ? "کامل" : row.status === "partial" ? "ناقص" : "باز"}
                      </Badge>
                    </td>
                    <td className="p-3 text-center font-bold">
                      {faNumber(row.checkedProductCount ?? 0)}/{faNumber(row.expectedProductCount ?? 0)}
                    </td>
                    <td className="p-3 text-center text-xs">
                      <span className="text-emerald-500">{faNumber(row.matchCount ?? 0)}</span>
                      {" / "}
                      <span className="text-amber-500">{faNumber(row.partialCount ?? 0)}</span>
                      {" / "}
                      <span className="text-rose-500">{faNumber(row.mismatchCount ?? 0)}</span>
                    </td>
                    <td className="p-3 text-xs">
                      <span className="text-rose-500">−{faNumber(row.shortageQty ?? 0)}</span>
                      {" / "}
                      <span className="text-amber-500">+{faNumber(row.surplusQty ?? 0)}</span>
                    </td>
                    <td className="p-3 text-muted">{row.operatorName ?? "—"}</td>
                    <td className="p-3 text-xs text-muted">{fmtDate(row.completedAt ?? row.startedAt)}</td>
                  </tr>
                ))}
                {!data.length && <tr><td colSpan={8} className="py-12 text-center text-muted">انبارگردانی ثبت نشده</td></tr>}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-muted">
                <th className="p-3 text-right font-medium">کاربر</th>
                <th className="p-3 text-right font-medium">عملیات</th>
                <th className="p-3 text-right font-medium">جزئیات</th>
                <th className="p-3 text-right font-medium">زمان</th>
              </tr></thead>
              <tbody>
                {(data as AuditRow[]).map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/4">
                    <td className="p-3 font-semibold text-strong">{row.userName ?? "سیستم"}</td>
                    <td className="p-3"><Badge tone={row.kind === "success" ? "green" : row.kind === "error" ? "red" : "brand"}>{row.action}</Badge></td>
                    <td className="p-3 max-w-xs truncate text-xs text-muted">{row.detail || "—"}</td>
                    <td className="p-3 text-xs text-muted">{fmtDate(row.createdAt)}</td>
                  </tr>
                ))}
                {!data.length && <tr><td colSpan={4} className="py-12 text-center text-muted">داده‌ای یافت نشد</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Glass>
      )}

      <Modal open={!!drill} onClose={() => setDrill(null)} title={drill?.title ?? "جزئیات فروش و مرجوعی"} wide>
        <div className="mb-4 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "فروش ناخالص", value: toman(drillSummary.salesGross), tone: "text-emerald-500" },
              { label: "مرجوعی کسرشده", value: `−${toman(drillSummary.returnsTotal)}`, tone: "text-rose-500" },
              { label: "درآمد خالص", value: toman(drillSummary.total), tone: drillSummary.total < 0 ? "text-rose-500" : "text-strong" },
              { label: "تعداد", value: `${faNumber(drillSummary.count)} فاکتور · ${faNumber(drillSummary.returnCount)} مرجوعی`, tone: "text-strong" },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl glass-2 p-3">
                <p className="text-[11px] text-muted">{c.label}</p>
                <p className={`mt-1 text-sm font-extrabold ${c.tone}`}>{c.value}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Btn variant="soft" onClick={exportDrillExcel} disabled={!drillRows.length && !drillReturns.length}>
              <I.download width={14} /> Excel
            </Btn>
            <Btn variant="ghost" onClick={() => openPrintReport({
              title: drill?.title ?? "جزئیات فروش و مرجوعی",
              docLabel: "جزئیات دوره",
              headers: ["نوع", "شماره", "مشتری / محصول", "مبلغ", "تاریخ"],
              rows: [
                ...drillRows.map((r) => [
                  "فروش",
                  r.invoiceNumber,
                  r.customerName || "—",
                  toman(r.grandTotal ?? 0),
                  fmtDate(r.createdAt),
                ]),
                ...drillReturns.map((r) => [
                  "مرجوعی",
                  r.returnId,
                  `${r.productName}${r.customerName ? ` · ${r.customerName}` : ""}`,
                  `−${toman(r.amount ?? 0)}`,
                  fmtDate(r.createdAt),
                ]),
              ],
              summaryCards: [
                { label: "فروش ناخالص", value: toman(drillSummary.salesGross) },
                { label: "مرجوعی", value: `−${toman(drillSummary.returnsTotal)}` },
                { label: "درآمد خالص", value: toman(drillSummary.total) },
                { label: "تعداد فاکتور / مرجوعی", value: `${faNumber(drillSummary.count)} / ${faNumber(drillSummary.returnCount)}` },
              ],
              brand: brandOpts.brand,
              operatorName: brandOpts.operatorName,
            })} disabled={!drillRows.length && !drillReturns.length}>
              <I.printer width={14} /> PDF
            </Btn>
          </div>
        </div>
        {drillLoading ? (
          <div className="py-12 text-center"><I.refresh width={28} className="anim-spin-slow mx-auto text-muted" /></div>
        ) : (
          <div className="max-h-[60vh] space-y-5 overflow-auto">
            <div>
              <h4 className="mb-2 text-sm font-bold text-strong">فروش‌ها ({faNumber(drillRows.length)})</h4>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10 text-muted">
                  <th className="p-2 text-right font-medium">شماره فاکتور</th>
                  <th className="p-2 text-right font-medium">مشتری</th>
                  <th className="p-2 text-right font-medium">مبلغ</th>
                  <th className="p-2 text-right font-medium">روش فروش</th>
                  <th className="p-2 text-right font-medium">تاریخ</th>
                </tr></thead>
                <tbody>
                  {drillRows.map((r) => (
                    <tr key={r.id} className="border-b border-white/5">
                      <td className="p-2"><InvoiceNumberButton number={r.invoiceNumber} onOpen={openByNumber} /></td>
                      <td className="p-2">{r.customerName || "—"}</td>
                      <td className="p-2 font-bold text-emerald-500">{toman(r.grandTotal ?? 0)}</td>
                      <td className="p-2 text-xs">{salesMethodLabel(r.salesMethod)}</td>
                      <td className="p-2 text-xs text-muted">{fmtDate(r.createdAt)}</td>
                    </tr>
                  ))}
                  {!drillRows.length && <tr><td colSpan={5} className="py-8 text-center text-muted">فاکتوری در این بازه نیست</td></tr>}
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-bold text-strong">مرجوعی‌های کسرشده از درآمد ({faNumber(drillReturns.length)})</h4>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10 text-muted">
                  <th className="p-2 text-right font-medium">کد مرجوعی</th>
                  <th className="p-2 text-right font-medium">محصول</th>
                  <th className="p-2 text-right font-medium">مشتری</th>
                  <th className="p-2 text-right font-medium">مبلغ</th>
                  <th className="p-2 text-right font-medium">دلیل</th>
                  <th className="p-2 text-right font-medium">تاریخ</th>
                </tr></thead>
                <tbody>
                  {drillReturns.map((r) => (
                    <tr key={r.id} className="border-b border-white/5">
                      <td className="p-2">
                        <button
                          type="button"
                          dir="ltr"
                          className="cursor-pointer bg-transparent p-0 font-mono text-xs text-amber-400 hover:underline"
                          onClick={() => setViewReturn(r)}
                        >
                          {r.returnId}
                        </button>
                      </td>
                      <td className="p-2 text-xs">{r.productName}</td>
                      <td className="p-2 text-xs">
                        {r.customerName || "—"}
                        {r.customerPhone ? <span className="mt-0.5 block font-mono text-muted" dir="ltr">{r.customerPhone}</span> : null}
                      </td>
                      <td className="p-2 font-bold text-rose-500">−{toman(r.amount ?? 0)}</td>
                      <td className="p-2 text-xs text-muted">{r.reason || "—"}</td>
                      <td className="p-2 text-xs text-muted">{fmtDate(r.createdAt)}</td>
                    </tr>
                  ))}
                  {!drillReturns.length && <tr><td colSpan={6} className="py-8 text-center text-muted">مرجوعی‌ای در این بازه نیست</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={!!viewReturn}
        onClose={() => setViewReturn(null)}
        title={viewReturn ? `مرجوعی ${viewReturn.returnId}` : "جزئیات مرجوعی"}
        wide
      >
        {viewReturn && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                ["کد مرجوعی", viewReturn.returnId],
                ["محصول", viewReturn.productName],
                ["رنگ / سایز", [viewReturn.color, viewReturn.size].filter(Boolean).join(" / ") || "—"],
                ["بارکد", viewReturn.barcode || "—"],
                ["تعداد", faNumber(viewReturn.quantity)],
                ["قیمت واحد", toman(viewReturn.unitPrice ?? 0)],
                ["مبلغ مرجوعی", toman(viewReturn.amount ?? 0)],
                ["دلیل", viewReturn.reason || "—"],
                ["فاکتور مرتبط", viewReturn.invoiceNumber || "—"],
                ["نام مشتری", viewReturn.customerName || "—"],
                ["شماره مشتری", viewReturn.customerPhone || "—"],
                ["آدرس مشتری", viewReturn.customerAddress || "—"],
                ["فروشنده اصلی", viewReturn.originalSoldByName || "—"],
                ["ثبت‌کننده مرجوعی", viewReturn.returnedByName || "—"],
                ["انبار فروش", viewReturn.originalWarehouseName || "—"],
                ["انبار مرجوعی", viewReturn.returnWarehouseName || "—"],
                ["زمان ثبت", fmtDateTime(viewReturn.createdAt)],
                ["اثر روی درآمد", viewReturn.affectsSales === false ? "خیر (قبلاً در فاکتور لحاظ شده)" : "بله — از درآمد کسر می‌شود"],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl glass-2 p-3">
                  <p className="text-[11px] text-muted">{label}</p>
                  <p className="mt-1 break-words text-sm font-bold text-strong" dir={label === "بارکد" || label === "شماره مشتری" || label === "کد مرجوعی" || label === "فاکتور مرتبط" ? "ltr" : undefined}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {viewReturn.notes && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">توضیحات ثبت‌شده هنگام مرجوعی</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-strong">{viewReturn.notes}</p>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              {viewReturn.invoiceNumber && (
                <Btn variant="soft" onClick={() => openByNumber(viewReturn.invoiceNumber!)}>
                  <I.cart width={14} /> مشاهده فاکتور
                </Btn>
              )}
              <Btn variant="ghost" onClick={() => setViewReturn(null)}>بستن</Btn>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!viewDoc} onClose={() => setViewDoc(null)} title="حواله انبار / برگه تحویل" wide>
        {viewDoc && (
          <TransferDeliverySlip
            doc={viewDoc}
            brand={storeBrand}
            operatorFallback={user?.name}
            onClose={() => setViewDoc(null)}
          />
        )}
      </Modal>

      <Modal
        open={!!stReport || stLoading}
        onClose={() => { setStReport(null); setStItems([]); }}
        title={stReport ? `گزارش ${stReport.sessionNumber}` : "گزارش انبارگردانی"}
        wide
      >
        {stLoading ? (
          <div className="py-16 text-center text-sm text-muted">
            <I.refresh className="anim-spin-slow mx-auto mb-3" width={28} />
            در حال آماده‌سازی گزارش...
          </div>
        ) : stReport ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["انبار", stReport.warehouseName],
                ["وضعیت", stReport.status === "completed" ? "کامل" : stReport.status === "partial" ? "ناقص" : "باز"],
                ["بررسی‌شده", `${faNumber(stReport.checkedProductCount ?? stItems.length)} / ${faNumber(stReport.expectedProductCount ?? 0)}`],
                ["همخوانی", faNumber(stReport.matchCount ?? stItems.filter((i) => i.level === "match").length)],
                ["کسری تعداد", faNumber(stReport.shortageQty ?? 0)],
                ["مازاد تعداد", faNumber(stReport.surplusQty ?? 0)],
                ["مبلغ کسری", toman(stReport.shortageAmount ?? 0)],
                ["مبلغ مازاد", toman(stReport.surplusAmount ?? 0)],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-2xl glass-2 p-3">
                  <p className="text-[11px] text-muted">{label}</p>
                  <p className="mt-1 text-sm font-bold text-strong">{value}</p>
                </div>
              ))}
            </div>

            <div className="max-h-[360px] overflow-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-muted">
                    <th className="p-2 text-right">محصول</th>
                    <th className="p-2 text-right">سیستم</th>
                    <th className="p-2 text-right">اعلامی</th>
                    <th className="p-2 text-right">اختلاف</th>
                    <th className="p-2 text-right">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {stItems.map((it) => (
                    <tr key={it.productId} className="border-b border-white/5">
                      <td className="p-2">
                        <p className="font-semibold text-strong">{it.productName}</p>
                        <p className="font-mono text-[10px] text-muted" dir="ltr">{it.sku || it.barcode || "—"}</p>
                      </td>
                      <td className="p-2">{faNumber(it.systemQty)}</td>
                      <td className="p-2">{faNumber(it.declaredQty)}</td>
                      <td className={`p-2 font-bold ${it.qtyDiff === 0 ? "text-emerald-500" : it.qtyDiff < 0 ? "text-rose-500" : "text-amber-500"}`}>
                        {faNumber(it.qtyDiff)}
                      </td>
                      <td className="p-2 text-xs">
                        {it.level === "match" ? "همخوانی" : it.level === "partial" ? "اختلاف جزئی" : "تناقض"}
                      </td>
                    </tr>
                  ))}
                  {!stItems.length && (
                    <tr><td colSpan={5} className="p-8 text-center text-muted">موردی ثبت نشده</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Btn variant="soft" onClick={exportStocktakeSessionExcel} disabled={!stItems.length}>
                <I.download width={16} /> Excel
              </Btn>
              <Btn onClick={printStocktakeSession} disabled={!stItems.length}>
                <I.printer width={16} /> چاپ A4 / PDF
              </Btn>
              <Btn variant="ghost" onClick={() => { setStReport(null); setStItems([]); }}>بستن</Btn>
            </div>
          </div>
        ) : null}
      </Modal>

      {invoiceModal}
      {docLoading && (
        <div className="pointer-events-none fixed bottom-4 left-4 z-50 rounded-xl bg-black/70 px-3 py-2 text-xs text-white">
          در حال بارگذاری سند...
        </div>
      )}
    </div>
  );
}
