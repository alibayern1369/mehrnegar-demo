"use client";

import { useState, useEffect, useCallback } from "react";
import { Glass, Btn, Input, Modal, SectionTitle, Badge } from "../ui";
import { I } from "../icons";
import { useApp } from "../context";
import { faNumber, toman, faDate } from "@/lib/format";
import { InvoiceReceipt, type ReceiptData } from "../InvoiceReceipt";
import { salesMethodLabel } from "@/lib/sales-methods";

type InvRow = {
  id: number;
  invoiceNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  customerBirthDate?: string | null;
  grandTotal?: number | null;
  salesMethod?: string | null;
  warehouseName?: string | null;
  sellerName?: string | null;
  notes?: string | null;
  subtotal?: number | null;
  totalDiscount?: number | null;
  createdAt?: string | Date | null;
  business?: ReceiptData["business"];
  items: {
    productName: string;
    barcode: string;
    unitBarcodes?: string[];
    color?: string | null;
    size?: string | null;
    quantity: number;
    unitPrice: number;
    discount?: number;
    lineTotal: number;
  }[];
};

export function ReprintInvoicePage() {
  const { token, toast } = useApp();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<InvRow[]>([]);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [showingRecent, setShowingRecent] = useState(true);

  const loadRecent = useCallback(async () => {
    setSearching(true);
    try {
      const limit = typeof window !== "undefined" && window.innerWidth >= 768 ? 20 : 10;
      const res = await fetch(`/api/invoices?recent=1&reprint=1&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.ok) return;
      setResults(data.invoices ?? []);
      setShowingRecent(true);
    } catch { /* ignore */ }
    finally { setSearching(false); }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void loadRecent();
  }, [token, loadRecent]);

  const search = async () => {
    const q = query.trim();
    if (!q) {
      await loadRecent();
      return;
    }
    setSearching(true);
    setResults([]);
    try {
      const res = await fetch(`/api/invoices?q=${encodeURIComponent(q)}&reprint=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.ok) {
        toast(data.error ?? "خطا در جستجو", "error");
        return;
      }
      setResults(data.invoices ?? []);
      setShowingRecent(false);
      if (!(data.invoices ?? []).length) toast("فاکتوری یافت نشد", "info");
    } catch {
      toast("خطا در اتصال به سرور", "error");
    } finally {
      setSearching(false);
    }
  };

  const openReprint = (inv: InvRow) => {
    const returnCredit = (inv.items ?? [])
      .filter((item) => item.lineTotal < 0)
      .reduce((sum, item) => sum + Math.abs(item.lineTotal), 0);
    const newPurchase = (inv.items ?? [])
      .filter((item) => item.lineTotal >= 0)
      .reduce((sum, item) => sum + item.lineTotal, 0);
    setReceipt({
      invoiceNumber: inv.invoiceNumber,
      createdAt: inv.createdAt,
      customerName: inv.customerName,
      customerPhone: inv.customerPhone,
      customerAddress: inv.customerAddress,
      customerBirthDate: inv.customerBirthDate,
      salesMethod: inv.salesMethod,
      warehouseName: inv.warehouseName,
      sellerName: inv.sellerName,
      notes: inv.notes,
      subtotal: inv.subtotal ?? 0,
      totalDiscount: inv.totalDiscount ?? 0,
      grandTotal: inv.grandTotal ?? 0,
      items: (inv.items ?? []).map((it) => ({
        productName: it.productName,
        barcode: it.barcode,
        unitBarcodes: it.unitBarcodes,
        color: it.color,
        size: it.size,
        quantity: Math.abs(it.quantity),
        unitPrice: it.unitPrice ?? 0,
        discount: it.discount,
        lineTotal: Math.abs(it.lineTotal ?? 0),
        section: it.lineTotal < 0 ? "returned" : returnCredit > 0 ? "added" : undefined,
      })),
      kind: returnCredit > 0 ? "exchange" : "sale",
      settlement: returnCredit > 0 ? {
        returnCredit,
        newPurchase,
        balance: inv.grandTotal ?? 0,
        status: (inv.grandTotal ?? 0) > 0 ? "debtor" : (inv.grandTotal ?? 0) < 0 ? "creditor" : "settled",
        message: "",
      } : null,
      business: inv.business ?? null,
    });
    setPreviewOpen(true);
  };

  return (
    <div>
      <SectionTitle
        icon={<I.printer />}
        title="چاپ مجدد فاکتور"
        sub="جستجو با نام خریدار یا شماره فاکتور و چاپ دوباره"
      />

      <Glass className="mb-4 p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="نام خریدار یا شماره فاکتور..."
            className="flex-1"
            autoFocus
          />
          <Btn onClick={search} disabled={searching}>
            {searching ? <I.refresh width={16} className="anim-spin-slow" /> : <I.search width={16} />}
            جستجو
          </Btn>
        </div>
      </Glass>

      <Glass className="overflow-hidden p-0">
        <div className="border-b border-white/10 px-4 py-3">
          <p className="text-sm font-bold text-strong">
            {showingRecent
              ? `${faNumber(results.length)} سفارش اخیر`
              : `${faNumber(results.length)} نتیجه جستجو`}
          </p>
        </div>
        {results.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">
            {searching ? "در حال بارگذاری..." : showingRecent ? "سفارشی برای نمایش نیست" : "فاکتوری یافت نشد"}
          </div>
        ) : (
          <div className="divide-y divide-white/8">
            {results.map((inv) => (
              <div key={inv.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-mono text-sm font-bold text-strong" dir="ltr">{inv.invoiceNumber}</p>
                    {inv.salesMethod && (
                      <Badge tone="sky">{salesMethodLabel(inv.salesMethod)}</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-semibold text-strong">{inv.customerName || "خریدار محترم"}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                    {inv.customerPhone && <span dir="ltr">{inv.customerPhone}</span>}
                    {inv.createdAt && <span>{faDate(new Date(inv.createdAt))}</span>}
                    {inv.warehouseName && <span>{inv.warehouseName}</span>}
                    {inv.sellerName && <span>فروشنده: {inv.sellerName}</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                  <p className="text-sm font-bold grad-text">{toman(inv.grandTotal ?? 0)}</p>
                  <Btn variant="soft" onClick={() => openReprint(inv)}>
                    <I.printer width={15} /> چاپ مجدد
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Glass>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="چاپ مجدد فاکتور" wide>
        {receipt && <InvoiceReceipt data={receipt} onClose={() => setPreviewOpen(false)} />}
      </Modal>
    </div>
  );
}
