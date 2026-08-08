"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Glass, Btn, Field, Input, Select, FullPagePanel, Modal } from "../ui";
import { I } from "../icons";
import { CameraBarcodeScanner } from "../CameraBarcodeScanner";
import { useApp } from "../context";
import { faNumber, toman, normalizeBarcode } from "@/lib/format";
import { SALES_METHODS } from "@/lib/sales-methods";
import { InvoiceReceipt, type ReceiptData } from "../InvoiceReceipt";

type UnitInfo = {
  barcode: string;
  unitId: number | null;
  status: string;
  returnable: boolean;
  credit: number;
};

type InvItem = {
  id: number;
  productName: string;
  color?: string | null;
  size?: string | null;
  quantity: number;
  unitPrice: number | null;
  lineTotal: number | null;
  units: UnitInfo[];
};

type InvoiceRow = {
  id: number;
  invoiceNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  grandTotal?: number | null;
  warehouseId?: number | null;
  warehouseName?: string | null;
  salesMethod?: string | null;
  createdAt?: string | Date | null;
  items: InvItem[];
};

type NewLine = {
  productId: number;
  variationId?: number;
  barcode: string;
  productName: string;
  color?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  itemDiscount: number;
  lineTotal: number;
  unitBarcodes: string[];
  isUnit: boolean;
};

type WHOption = { id: number; name: string; code: string; salesMethods?: string[] };

type Summary = {
  originalInvoice: string;
  customerName?: string | null;
  returnCredit: number;
  newPurchase: number;
  balance: number;
  status: string;
  message: string;
  newInvoiceNumber?: string | null;
};

export function EditOrderPage() {
  const { token, toast } = useApp();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<InvoiceRow[]>([]);
  const [invoice, setInvoice] = useState<InvoiceRow | null>(null);
  const [selectedReturns, setSelectedReturns] = useState<Set<string>>(new Set());
  const [newItems, setNewItems] = useState<NewLine[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [warehouses, setWarehouses] = useState<WHOption[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [allowedMethods, setAllowedMethods] = useState<string[]>(["normal"]);
  const [salesMethod, setSalesMethod] = useState("normal");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/users?forSale=1", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).then((d) => {
      if (d.ok) {
        const mainWhs = (d.warehouses as WHOption[]).filter((w) =>
          w.code !== "website" && w.code !== "digikala" && (w.salesMethods?.length ?? 0) > 0
        );
        setWarehouses(mainWhs);
        if (mainWhs.length) {
          setWarehouseId(mainWhs[0].id);
          setAllowedMethods(mainWhs[0].salesMethods ?? []);
          setSalesMethod(mainWhs[0].salesMethods?.[0] ?? "");
        } else {
          setWarehouseId("");
          setAllowedMethods([]);
          setSalesMethod("");
        }
      }
    });
  }, [token]);

  const loadRecent = useCallback(async () => {
    setSearching(true);
    try {
      const limit = typeof window !== "undefined" && window.innerWidth >= 768 ? 20 : 10;
      const res = await fetch(`/api/order-edit?recent=1&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!d.ok) return;
      setResults(d.invoices ?? []);
    } catch { /* ignore */ }
    finally { setSearching(false); }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void loadRecent();
  }, [token, loadRecent]);

  useEffect(() => {
    if (!warehouseId || !token) return;
    fetch(`/api/users?forSale=1&warehouseId=${warehouseId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        const methods: string[] = d.methods ?? [];
        setAllowedMethods(methods);
        setSalesMethod((prev) => (methods.includes(prev) ? prev : (methods[0] ?? "")));
      })
      .catch(() => {});
  }, [warehouseId, token]);

  const search = async () => {
    const q = query.trim();
    if (!q) {
      await loadRecent();
      return;
    }
    setSearching(true);
    setInvoice(null);
    setSelectedReturns(new Set());
    setNewItems([]);
    try {
      const res = await fetch(`/api/order-edit?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا", "error"); return; }
      setResults(d.invoices ?? []);
      if ((d.invoices ?? []).length === 1) selectInvoice(d.invoices[0]);
      else if (!(d.invoices ?? []).length) toast("سفارشی یافت نشد", "error");
    } catch { toast("خطا در جستجو", "error"); }
    finally { setSearching(false); }
  };

  const selectInvoice = (inv: InvoiceRow) => {
    setInvoice(inv);
    setSelectedReturns(new Set());
    setNewItems([]);
    if (inv.warehouseId && warehouses.some((warehouse) => warehouse.id === inv.warehouseId)) {
      setWarehouseId(inv.warehouseId);
    } else if (warehouses[0]) {
      setWarehouseId(warehouses[0].id);
    }
  };

  const toggleReturn = (barcode: string, returnable: boolean) => {
    if (!returnable) return;
    setSelectedReturns((prev) => {
      const next = new Set(prev);
      if (next.has(barcode)) next.delete(barcode);
      else next.add(barcode);
      return next;
    });
  };

  const returnCredit = useMemo(() => {
    if (!invoice) return 0;
    let sum = 0;
    for (const item of invoice.items) {
      for (const u of item.units) {
        if (selectedReturns.has(u.barcode)) sum += u.credit;
      }
    }
    return sum;
  }, [invoice, selectedReturns]);

  const newTotal = useMemo(() => newItems.reduce((a, i) => a + i.lineTotal, 0), [newItems]);
  const balance = newTotal - returnCredit;

  const lookupBarcode = useCallback(async (raw: string) => {
    const code = normalizeBarcode(raw);
    if (!code) return;
    if (!warehouseId) { toast("ابتدا انبار را انتخاب کنید", "error"); return; }
    setScanning(true);
    try {
      const bcRes = await fetch(`/api/barcodes?barcode=${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bc = await bcRes.json();
      if (bc.ok && bc.found && bc.type === "unit") {
        const unit = bc.unit;
        const p = bc.product;
        const v = bc.variation;
        if (!p || p.status !== "active") { toast("این محصول غیرفعال است", "error"); return; }
        if (unit.status !== "in_stock") { toast("این واحد موجود نیست", "error"); return; }
        if (unit.warehouseId !== Number(warehouseId)) {
          toast(`این بارکد در انبار انتخاب‌شده نیست`, "error");
          return;
        }
        if (newItems.some((i) => i.barcode === code || i.unitBarcodes.includes(code))) {
          toast("این بارکد قبلاً اضافه شده", "error");
          return;
        }
        const price = Number(v?.price ?? p.price ?? p.sellingPrice ?? 0);
        const label = `${p.name}${v ? ` — ${v.color} / ${v.size}` : ""}`;
        setNewItems((prev) => [...prev, {
          productId: p.id,
          variationId: unit.variationId,
          barcode: code,
          productName: label,
          color: v?.color,
          size: v?.size,
          quantity: 1,
          unitPrice: price,
          itemDiscount: 0,
          lineTotal: price,
          unitBarcodes: [code],
          isUnit: true,
        }]);
        setBarcodeInput("");
        toast(`«${p.name}» اضافه شد`);
        return;
      }
      toast("بارکد واحد موجود یافت نشد", "error");
    } catch { toast("خطا در جستجوی بارکد", "error"); }
    finally { setScanning(false); barcodeRef.current?.focus(); }
  }, [token, warehouseId, toast, newItems]);

  const submit = async () => {
    if (!invoice) return;
    if (!selectedReturns.size && !newItems.length) {
      toast("اقلام مرجوعی یا کالای جدید را مشخص کنید", "error");
      return;
    }
    if (newItems.length && !warehouseId) {
      toast("انبار را انتخاب کنید", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/order-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          invoiceId: invoice.id,
          returnBarcodes: [...selectedReturns],
          newItems,
          warehouseId: warehouseId || undefined,
          salesMethod,
          notes,
        }),
      });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا", "error"); return; }
      setSummary(d.summary);
      if (d.receipt) {
        setReceipt(d.receipt);
        setPreviewOpen(true);
      }
      setInvoice(null);
      setResults([]);
      setSelectedReturns(new Set());
      setNewItems([]);
      toast("ویرایش سفارش ثبت شد");
    } catch { toast("خطا در ثبت", "error"); }
    finally { setLoading(false); }
  };

  const methodOptions = SALES_METHODS.filter((m) => allowedMethods.includes(m.id));

  return (
    <div>
      <div className="mb-5 flex min-w-0 items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-cyan-500 text-white sm:h-11 sm:w-11"><I.edit /></div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold leading-snug text-strong sm:text-xl">ویرایش سفارش</h1>
          <p className="mt-0.5 text-xs leading-5 text-muted sm:text-sm">مرجوعی اقلام فاکتور + افزودن کالای جدید و محاسبه بدهکار / بستانکار</p>
        </div>
      </div>

      <Glass className="mb-5 p-4">
        <div className="flex flex-wrap gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="شماره فاکتور یا نام مشتری..."
            className="min-w-[220px] flex-1"
          />
          <Btn onClick={search} disabled={searching}>
            {searching ? <I.refresh className="anim-spin-slow" width={16} /> : <I.search width={16} />}
            جستجو
          </Btn>
        </div>
      </Glass>

      {!invoice && (
        <Glass className="mb-5 space-y-2 p-4">
          <p className="mb-2 text-sm font-bold text-strong">
            {query.trim() ? `${faNumber(results.length)} نتیجه جستجو` : `${faNumber(results.length)} سفارش اخیر`}
          </p>
          {searching && !results.length ? (
            <p className="text-sm text-muted">در حال بارگذاری...</p>
          ) : results.map((inv) => (
            <button
              key={inv.id}
              type="button"
              onClick={() => selectInvoice(inv)}
              className="press flex w-full flex-wrap items-center gap-3 rounded-2xl glass-2 px-4 py-3 text-right hover:bg-white/10"
            >
              <div className="min-w-[140px] flex-1">
                <p className="text-sm font-semibold text-strong" dir="ltr">{inv.invoiceNumber}</p>
                <p className="text-xs text-muted">{inv.customerName ?? "—"}{inv.customerPhone ? ` · ${inv.customerPhone}` : ""}</p>
              </div>
              <p className="text-sm font-bold grad-text">{toman(inv.grandTotal ?? 0)}</p>
            </button>
          ))}
          {!searching && !results.length && (
            <p className="py-6 text-center text-sm text-muted">سفارشی برای نمایش نیست</p>
          )}
        </Glass>
      )}

      {invoice && (
        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <Glass className="p-4">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted">فاکتور</p>
                  <p className="font-bold text-strong" dir="ltr">{invoice.invoiceNumber}</p>
                  <p className="mt-1 text-sm text-muted">{invoice.customerName} · {invoice.customerPhone}</p>
                </div>
                <Btn variant="ghost" onClick={() => { setInvoice(null); setSelectedReturns(new Set()); setNewItems([]); }}>تغییر فاکتور</Btn>
              </div>

              <p className="mb-2 text-sm font-bold text-strong">اقلام فاکتور — انتخاب برای مرجوعی</p>
              <div className="space-y-2">
                {invoice.items.map((item) => (
                  <div key={item.id} className="rounded-2xl glass-2 p-3">
                    <div className="mb-2 flex justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-strong">{item.productName}</p>
                        <p className="text-xs text-muted">{item.color} / {item.size} · {toman(item.lineTotal ?? 0)}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {item.units.map((u) => (
                        <label
                          key={u.barcode}
                          className={`flex flex-wrap items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                            u.returnable ? "cursor-pointer hover:bg-white/5" : "opacity-50"
                          } ${selectedReturns.has(u.barcode) ? "bg-amber-500/15 ring-1 ring-amber-500/30" : "glass-2"}`}
                        >
                          <input
                            type="checkbox"
                            disabled={!u.returnable}
                            checked={selectedReturns.has(u.barcode)}
                            onChange={() => toggleReturn(u.barcode, u.returnable)}
                            className="accent-amber-500"
                          />
                          <span className="font-mono text-xs text-strong" dir="ltr">{u.barcode}</span>
                          <span className="text-xs text-muted">{u.returnable ? "قابل مرجوعی" : "غیرقابل مرجوعی"}</span>
                          <span className="mr-auto text-xs font-bold text-amber-500">{toman(u.credit)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Glass>

            <Glass className="space-y-3 p-4">
              <h3 className="font-bold text-strong">افزودن کالای جدید (اسکن)</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="انبار فروش جدید">
                  <Select value={warehouseId} onChange={(e) => setWarehouseId(Number(e.target.value))}>
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </Select>
                </Field>
                <Field label="روش پرداخت">
                  <Select value={salesMethod} onChange={(e) => setSalesMethod(e.target.value)}>
                    {methodOptions.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="flex gap-2">
                <input
                  ref={barcodeRef}
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && lookupBarcode(barcodeInput)}
                  placeholder="بارکد کالای جدید را اسکن کنید..."
                  dir="ltr"
                  className="flex-1 rounded-2xl border border-white/20 bg-white/70 px-4 py-3 text-base text-strong outline-none focus:border-brand-400 dark:bg-white/8"
                />
                <Btn
                  variant="soft"
                  onClick={() => {
                    if (barcodeInput.trim()) lookupBarcode(barcodeInput);
                    else setCameraOpen(true);
                  }}
                  disabled={scanning}
                >
                  {scanning ? <I.refresh className="anim-spin-slow" width={16} /> : <I.scan width={16} />}
                </Btn>
              </div>
              {newItems.length > 0 && (
                <div className="space-y-2">
                  {newItems.map((it, idx) => (
                    <div key={it.barcode} className="flex items-center gap-3 rounded-2xl glass-2 px-3 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-strong">{it.productName}</p>
                        <p className="text-xs text-muted" dir="ltr">{it.barcode}</p>
                      </div>
                      <p className="text-sm font-bold text-strong">{toman(it.lineTotal)}</p>
                      <button type="button" onClick={() => setNewItems((p) => p.filter((_, i) => i !== idx))} className="text-rose-400">
                        <I.trash width={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Field label="یادداشت (اختیاری)">
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="توضیح تعویض..." />
              </Field>
            </Glass>
          </div>

          <Glass className="sticky top-24 h-fit space-y-4 p-5">
            <h3 className="font-bold text-strong">خلاصه تسویه</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">اعتبار مرجوعی</span><span className="font-bold text-amber-500">{toman(returnCredit)}</span></div>
              <div className="flex justify-between"><span className="text-muted">خرید جدید</span><span className="font-bold text-emerald-500">{toman(newTotal)}</span></div>
              <div className="flex items-center justify-between border-t border-white/10 pt-2">
                <span className="font-bold text-strong">مانده</span>
                <span className={`text-lg font-extrabold ${balance > 0 ? "text-rose-500" : balance < 0 ? "text-sky-500" : "text-emerald-500"}`}>
                  {toman(Math.abs(balance))}
                </span>
              </div>
              <p className={`rounded-2xl px-3 py-2 text-xs leading-6 ${
                balance > 0 ? "bg-rose-500/10 text-rose-500" : balance < 0 ? "bg-sky-500/10 text-sky-500" : "bg-emerald-500/10 text-emerald-500"
              }`}>
                {balance > 0
                  ? "مشتری بدهکار است — باید این مبلغ را بپردازد"
                  : balance < 0
                    ? "مشتری بستانکار است — باید این مبلغ را پس بگیرد"
                    : "حساب تسویه است"}
              </p>
            </div>
            <Btn className="w-full" onClick={submit} disabled={loading}>
              {loading ? "..." : <><I.check width={16} /> ثبت ویرایش سفارش</>}
            </Btn>
          </Glass>
        </div>
      )}

      <FullPagePanel
        open={!!summary}
        onClose={() => setSummary(null)}
        title="نتیجه ویرایش سفارش"
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            {receipt && (
              <Btn variant="soft" onClick={() => setPreviewOpen(true)}>
                <I.printer width={16} /> نمایش فاکتور کامل
              </Btn>
            )}
            <Btn onClick={() => setSummary(null)}>بستن</Btn>
          </div>
        }
      >
        {summary && (
          <div className="mx-auto max-w-lg space-y-4 text-center">
            <p className="text-5xl">{summary.balance > 0 ? "💳" : summary.balance < 0 ? "💰" : "✅"}</p>
            <p className="text-lg font-bold text-strong">{summary.message}</p>
            <div className="space-y-2 rounded-2xl glass-2 p-4 text-right text-sm">
              <div className="flex justify-between"><span className="text-muted">فاکتور اصلی</span><span dir="ltr">{summary.originalInvoice}</span></div>
              {summary.newInvoiceNumber && (
                <div className="flex justify-between"><span className="text-muted">فاکتور تعویض</span><span dir="ltr">{summary.newInvoiceNumber}</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted">اعتبار مرجوعی</span><span className="text-rose-500">{toman(summary.returnCredit)}</span></div>
              <div className="flex justify-between"><span className="text-muted">خرید جدید</span><span className="text-emerald-500">{toman(summary.newPurchase)}</span></div>
              <div className="flex justify-between font-bold"><span>مانده</span><span>{toman(Math.abs(summary.balance))}</span></div>
            </div>
          </div>
        )}
      </FullPagePanel>

      <Modal open={previewOpen && !!receipt} onClose={() => setPreviewOpen(false)} title="فاکتور کامل تعویض" wide>
        {receipt && <InvoiceReceipt data={receipt} onClose={() => setPreviewOpen(false)} />}
      </Modal>

      <CameraBarcodeScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onScan={(code) => {
          setBarcodeInput(code);
          void lookupBarcode(code);
        }}
      />
    </div>
  );
}
