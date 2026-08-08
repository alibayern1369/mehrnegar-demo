"use client";

import { useState, useCallback } from "react";
import { Modal } from "./ui";
import { InvoiceReceipt, type ReceiptData } from "./InvoiceReceipt";
import { useApp } from "./context";

type InvApiRow = {
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
  items?: {
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

function toReceipt(inv: InvApiRow): ReceiptData {
  return {
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
      quantity: it.quantity,
      unitPrice: it.unitPrice ?? 0,
      discount: it.discount,
      lineTotal: it.lineTotal ?? 0,
    })),
    business: inv.business ?? null,
  };
}

/** Load invoice by number and show printable receipt modal. */
export function useInvoicePreview() {
  const { token, toast } = useApp();
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const openByNumber = useCallback(
    async (invoiceNumber: string | null | undefined) => {
      const q = String(invoiceNumber ?? "").trim();
      if (!q || q === "—") return;
      setLoading(true);
      try {
        const res = await fetch(`/api/invoices?q=${encodeURIComponent(q)}&reprint=1`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!data.ok) {
          toast(data.error ?? "خطا در دریافت فاکتور", "error");
          return;
        }
        const list = (data.invoices ?? []) as InvApiRow[];
        const exact = list.find((inv) => inv.invoiceNumber === q) ?? list[0];
        if (!exact) {
          toast("فاکتوری یافت نشد", "info");
          return;
        }
        setReceipt(toReceipt(exact));
        setOpen(true);
      } catch {
        toast("خطا در اتصال به سرور", "error");
      } finally {
        setLoading(false);
      }
    },
    [token, toast],
  );

  const close = useCallback(() => {
    setOpen(false);
    setReceipt(null);
  }, []);

  const modal = (
    <Modal open={open} onClose={close} title="چاپ مجدد فاکتور" wide>
      {receipt && <InvoiceReceipt data={receipt} onClose={close} />}
    </Modal>
  );

  return { openByNumber, loading, modal };
}

/** Clickable invoice number that opens the printable receipt. */
export function InvoiceNumberButton({
  number,
  onOpen,
  className = "font-mono text-xs text-brand-400 hover:underline",
}: {
  number: string | null | undefined;
  onOpen: (n: string) => void;
  className?: string;
}) {
  const n = String(number ?? "").trim();
  if (!n || n === "—") return <span className="text-xs text-muted">—</span>;
  return (
    <button
      type="button"
      dir="ltr"
      className={`${className} cursor-pointer bg-transparent p-0 text-right`}
      onClick={() => onOpen(n)}
      title="مشاهده و چاپ فاکتور"
    >
      {n}
    </button>
  );
}
