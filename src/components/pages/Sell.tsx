"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Glass, Btn, Field, Input, Select, Modal } from "../ui";
import { I } from "../icons";
import { Barcode } from "../barcode";
import { CameraBarcodeScanner } from "../CameraBarcodeScanner";
import { useApp } from "../context";
import { faNumber, toman, signedToman, faDate, faTime, normalizeBarcode } from "@/lib/format";
import { SALES_METHODS } from "@/lib/sales-methods";
import { isValidIranMobile } from "@/lib/phone";
import { InvoiceReceipt, type ReceiptData } from "../InvoiceReceipt";
import { JalaliDatePicker } from "../JalaliDatePicker";

type LineItem = {
  productId: number; variationId?: number; barcode: string; productName: string;
  color?: string; size?: string;
  quantity: number; unitPrice: number; itemDiscount: number; lineTotal: number;
  unitBarcodes?: string[]; isUnit?: boolean;
};
type WHOption = { id: number; name: string; code: string; isActive?: boolean | null; salesMethods?: string[] };
type ReturnLine = {
  productId: number; variationId: number; barcode: string; productName: string;
  color?: string; size?: string; unitPrice: number; returnWarehouseId: number;
};
type ProductSearchResult = {
  id: number; name: string; availableCount: number;
  units: { barcode: string; variationId: number; color?: string; size?: string; price: number }[];
};

export function SellPage() {
  const { token, user, toast } = useApp();
  const [warehouses, setWarehouses] = useState<WHOption[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [allowedMethods, setAllowedMethods] = useState<string[]>(["normal"]);
  const [salesMethod, setSalesMethod] = useState("normal");
  const [items, setItems] = useState<LineItem[]>([]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [returnItems, setReturnItems] = useState<ReturnLine[]>([]);
  const [returnBarcodeInput, setReturnBarcodeInput] = useState("");
  const [returnWarehouseId, setReturnWarehouseId] = useState<number | "">("");
  const [returnScanning, setReturnScanning] = useState(false);
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [customer, setCustomer] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerBirthDate, setCustomerBirthDate] = useState("");
  const [notes, setNotes] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<"sale" | "return">("sale");
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const barcodeRef = useRef<HTMLInputElement>(null);
  const returnBarcodeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/users?forSale=1", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).then((d) => {
      if (d.ok) {
        const mainWhs = (d.warehouses as WHOption[]).filter((w) =>
          w.isActive !== false && w.code !== "website" && w.code !== "digikala" && (w.salesMethods?.length ?? 0) > 0
        );
        setWarehouses(mainWhs);
        if (mainWhs.length) {
          setWarehouseId(mainWhs[0].id);
          setReturnWarehouseId(mainWhs[0].id);
          setAllowedMethods(mainWhs[0].salesMethods ?? []);
          setSalesMethod(mainWhs[0].salesMethods?.[0] ?? "");
        } else {
          setWarehouseId("");
          setReturnWarehouseId("");
          setAllowedMethods([]);
          setSalesMethod("");
        }
      }
    });
  }, [token]);

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

  const subtotal = items.reduce((a, i) => a + i.lineTotal, 0);
  const returnCredit = returnItems.reduce((a, i) => a + i.unitPrice, 0);
  const grandTotal = subtotal - returnCredit - discount;

  useEffect(() => {
    const query = barcodeInput.trim();
    if (query.length < 2 || !warehouseId) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchingProducts(true);
      try {
        const response = await fetch(
          `/api/products?q=${encodeURIComponent(query)}&warehouseId=${warehouseId}`,
          { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal },
        );
        const data = await response.json();
        if (data.ok) setSearchResults(data.products ?? []);
      } catch {
        if (!controller.signal.aborted) setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setSearchingProducts(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [barcodeInput, warehouseId, token]);

  const lookupBarcode = useCallback(async (raw: string) => {
    const code = normalizeBarcode(raw);
    if (!code) return;
    if (!warehouseId) { toast("ابتدا انبار را انتخاب کنید", "error"); return; }
    setScanning(true);
    try {
      const bcRes = await fetch(`/api/barcodes?barcode=${encodeURIComponent(code)}`, { headers: { Authorization: `Bearer ${token}` } });
      const bc = await bcRes.json();

      if (bc.ok && bc.found && bc.type === "unit") {
        const unit = bc.unit;
        const p = bc.product;
        const v = bc.variation;
        if (!p || p.status !== "active") { toast("این محصول غیرفعال است", "error"); return; }
        if (unit.status !== "in_stock") { toast("این واحد موجود نیست (فروخته‌شده یا انتقال‌یافته)", "error"); return; }
        if (unit.warehouseId !== Number(warehouseId)) {
          toast(`این بارکد در انبار انتخاب‌شده نیست (${bc.warehouse?.name ?? "—"})`, "error");
          return;
        }
        const already = items.some((i) => i.barcode === code || i.unitBarcodes?.includes(code));
        if (already) { toast("این بارکد قبلاً به فاکتور اضافه شده", "error"); return; }
        const price = Number(v?.price ?? p.price ?? p.sellingPrice ?? 0);
        const label = `${p.name}${v ? ` — ${v.color} / ${v.size}` : ""}`;
        setItems((prev) => [...prev, {
          productId: p.id, variationId: unit.variationId, barcode: code, productName: label,
          color: v?.color, size: v?.size,
          quantity: 1, unitPrice: price, itemDiscount: 0, lineTotal: price,
          unitBarcodes: [code], isUnit: true,
        }]);
        setBarcodeInput("");
        return;
      }

      const res = await fetch(`/api/products?barcode=${encodeURIComponent(code)}&warehouseId=${warehouseId}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!data.ok || !data.products?.length) { toast("بارکد یافت نشد", "error"); return; }
      const p = data.products[0];
      if (p.status !== "active") { toast("این محصول غیرفعال است", "error"); return; }

      if (data.lookupType === "unit" && p.unit) {
        if (p.unit.status !== "in_stock" || p.unit.warehouseId !== Number(warehouseId)) {
          toast("این بارکد در انبار انتخاب‌شده موجود نیست", "error");
          return;
        }
        const price = Number(p.variation?.price ?? p.price ?? p.sellingPrice ?? 0);
        const label = `${p.name}${p.variation ? ` — ${p.variation.color} / ${p.variation.size}` : ""}`;
        setItems((prev) => {
          if (prev.some((i) => i.barcode === code)) { toast("این بارکد قبلاً اضافه شده", "error"); return prev; }
          return [...prev, {
            productId: p.id, variationId: p.variationId, barcode: code, productName: label,
            color: p.variation?.color, size: p.variation?.size,
            quantity: 1, unitPrice: price, itemDiscount: 0, lineTotal: price,
            unitBarcodes: [code], isUnit: true,
          }];
        });
        setBarcodeInput("");
        return;
      }

      const whStock = (p.stock ?? []).find((s: { warehouseId: number; quantity: number }) => s.warehouseId === Number(warehouseId));
      const available = whStock?.quantity ?? 0;
      if (available < 1) { toast(`موجودی در ${warehouses.find((w) => w.id === Number(warehouseId))?.name ?? "انبار"} کافی نیست`, "error"); return; }

      const price = Number(p.price ?? p.sellingPrice ?? 0);
      const variationId = p.variations?.[0]?.id;
      setItems((prev) => {
        const existing = prev.findIndex((i) => !i.isUnit && i.productId === p.id && i.variationId === variationId);
        if (existing >= 0) {
          const updated = [...prev];
          if (updated[existing].quantity >= available) { toast("موجودی کافی نیست", "error"); return prev; }
          const q = updated[existing].quantity + 1;
          updated[existing] = { ...updated[existing], quantity: q, lineTotal: q * updated[existing].unitPrice - updated[existing].itemDiscount };
          return updated;
        }
        return [...prev, {
          productId: p.id, variationId, barcode: p.barcode, productName: p.name,
          quantity: 1, unitPrice: price, itemDiscount: 0, lineTotal: price, isUnit: false,
        }];
      });
      setBarcodeInput("");
    } catch { toast("خطا در جستجوی بارکد", "error"); }
    finally { setScanning(false); barcodeRef.current?.focus(); }
  }, [token, warehouseId, warehouses, toast, items]);

  const lookupReturnBarcode = useCallback(async (raw: string) => {
    const code = normalizeBarcode(raw);
    if (!code) return;
    if (!returnWarehouseId) {
      toast("ابتدا انبار مقصد مرجوعی را انتخاب کنید", "error");
      return;
    }
    if (returnItems.some((item) => item.barcode === code)) {
      toast("این بارکد قبلاً به مرجوعی اضافه شده", "error");
      return;
    }
    if (items.some((item) => item.barcode === code || item.unitBarcodes?.includes(code))) {
      toast("یک بارکد نمی‌تواند همزمان خرید و مرجوعی باشد", "error");
      return;
    }

    setReturnScanning(true);
    try {
      const response = await fetch(`/api/barcodes?barcode=${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!data.ok || !data.found || data.type !== "unit" || data.unit?.status !== "sold") {
        toast("فقط بارکد واحد فروخته‌شده قابل مرجوعی است", "error");
        return;
      }
      const product = data.product;
      const variation = data.variation;
      if (!product || !variation) {
        toast("اطلاعات محصول کامل نیست", "error");
        return;
      }
      setReturnItems((previous) => [...previous, {
        productId: product.id,
        variationId: variation.id,
        barcode: code,
        productName: product.name,
        color: variation.color,
        size: variation.size,
        unitPrice: Number(variation.price ?? product.price ?? product.sellingPrice ?? 0),
        returnWarehouseId: Number(returnWarehouseId),
      }]);
      setReturnBarcodeInput("");
    } catch {
      toast("خطا در جستجوی بارکد مرجوعی", "error");
    } finally {
      setReturnScanning(false);
      returnBarcodeRef.current?.focus();
    }
  }, [items, returnItems, returnWarehouseId, toast, token]);

  const removeItem = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));
  const updateQty = (idx: number, qty: number) => setItems((p) => p.map((it, i) => {
    if (i !== idx) return it;
    if (it.isUnit) return it;
    return { ...it, quantity: qty, lineTotal: qty * it.unitPrice - it.itemDiscount };
  }));

  const completeSale = async () => {
    if (!items.length && !returnItems.length) { toast("فاکتور خالی است", "error"); return; }
    if (!warehouseId) { toast("انبار را انتخاب کنید", "error"); return; }
    if (customerPhone.trim() && !isValidIranMobile(customerPhone)) {
      toast("موبایل مشتری نامعتبر است (09xxxxxxxxx)", "error");
      return;
    }
    if (!allowedMethods.includes(salesMethod)) { toast("روش پرداخت مجاز نیست", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          warehouseId,
          items,
          returnItems,
          customerName: customer,
          customerPhone,
          customerAddress,
          customerBirthDate,
          notes,
          discount,
          salesMethod,
        }),
      });
      const data = await res.json();
      if (!data.ok) { toast(data.error ?? "خطا در ثبت فروش", "error"); return; }
      const inv = data.invoice;
      const savedItems = (inv.items ?? []) as {
        productName: string; barcode: string; unitBarcodes?: string[]; color?: string; size?: string;
        quantity: number; unitPrice: number; discount?: number; lineTotal: number;
      }[];
      const savedReturnCredit = savedItems
        .filter((item) => item.lineTotal < 0)
        .reduce((sum, item) => sum + Math.abs(item.lineTotal), 0);
      const savedPurchases = savedItems
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
        sellerName: inv.sellerName ?? user?.name,
        notes: inv.notes,
        subtotal: inv.subtotal ?? 0,
        totalDiscount: inv.totalDiscount ?? 0,
        grandTotal: inv.grandTotal ?? 0,
        items: savedItems.map((it) => ({
          productName: it.productName,
          barcode: it.barcode,
          unitBarcodes: it.unitBarcodes,
          color: it.color,
          size: it.size,
          quantity: Math.abs(it.quantity),
          unitPrice: it.unitPrice ?? 0,
          discount: it.discount,
          lineTotal: Math.abs(it.lineTotal ?? 0),
          section: it.lineTotal < 0 ? "returned" : savedReturnCredit > 0 ? "added" : undefined,
        })),
        kind: savedReturnCredit > 0 ? "exchange" : "sale",
        settlement: savedReturnCredit > 0 ? {
          returnCredit: savedReturnCredit,
          newPurchase: savedPurchases,
          balance: inv.grandTotal ?? 0,
          status: (inv.grandTotal ?? 0) > 0 ? "debtor" : (inv.grandTotal ?? 0) < 0 ? "creditor" : "settled",
          message: "",
        } : null,
        business: inv.business ?? null,
      });
      setItems([]);
      setReturnItems([]);
      setReturnBarcodeInput("");
      setCustomer("");
      setCustomerPhone("");
      setCustomerAddress("");
      setCustomerBirthDate("");
      setNotes("");
      setDiscount(0);
      setPreviewOpen(true);
      if (data.smsSent) toast("پیامک تأیید فروش ارسال شد");
    } catch { toast("خطا در اتصال به سرور", "error"); }
    finally { setLoading(false); }
  };

  const methodOptions = SALES_METHODS.filter((m) => allowedMethods.includes(m.id));

  return (
    <div>
      <div className="mb-5 flex min-w-0 items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl grad-brand text-white sm:h-11 sm:w-11"><I.cart /></div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold leading-snug text-strong sm:text-xl">ثبت فروش</h1>
          <p className="mt-0.5 text-xs leading-5 text-muted sm:text-sm">اسکن بارکد، روش پرداخت و صدور فاکتور — مشخصات خریدار اختیاری است</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Glass className="p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="انتخاب انبار">
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
            <Field label="بارکد محصول" className="mt-3">
              <div className="flex gap-2">
                <input ref={barcodeRef} value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onPaste={(e) => {
                    const text = e.clipboardData.getData("text");
                    if (!text) return;
                    e.preventDefault();
                    const normalized = normalizeBarcode(text);
                    setBarcodeInput(normalized);
                    if (normalized) setTimeout(() => lookupBarcode(normalized), 0);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && lookupBarcode(barcodeInput)}
                  placeholder="بارکد را اسکن کنید یا نام محصول را بنویسید"
                  dir="auto" autoFocus
                  className="flex-1 rounded-2xl border border-white/20 bg-white/70 dark:bg-white/8 px-4 py-2.5 text-base text-strong outline-none transition placeholder:text-muted focus:border-brand-400" />
                <Btn
                  variant="soft"
                  onClick={() => {
                    if (barcodeInput.trim()) lookupBarcode(barcodeInput);
                    else {
                      setCameraTarget("sale");
                      setCameraOpen(true);
                    }
                  }}
                  disabled={scanning}
                >
                  {scanning ? <I.refresh width={16} className="anim-spin-slow" /> : <I.scan width={16} />}
                </Btn>
              </div>
              {(searchingProducts || searchResults.length > 0) && barcodeInput.trim().length >= 2 && (
                <div className="mt-2 max-h-80 overflow-y-auto rounded-2xl border border-brand-400/25 bg-white/95 p-2 shadow-xl backdrop-blur-xl dark:bg-slate-950/95">
                  {searchingProducts && (
                    <p className="px-3 py-4 text-center text-xs text-muted">در حال جستجوی محصولات...</p>
                  )}
                  {!searchingProducts && searchResults.map((product) => (
                    <div key={product.id} className="mb-2 rounded-xl glass-2 p-3 last:mb-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-strong">{product.name}</p>
                        <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                          {faNumber(product.availableCount)} بارکد موجود
                        </span>
                      </div>
                      {product.units.length > 0 ? (
                        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                          {product.units.map((unit) => (
                            <button
                              key={unit.barcode}
                              type="button"
                              onClick={() => void lookupBarcode(unit.barcode)}
                              className="press flex min-w-0 items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/50 px-3 py-2 text-right dark:bg-white/5"
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-semibold text-strong">
                                  {[unit.color, unit.size].filter(Boolean).join(" / ") || "مدل اصلی"}
                                </span>
                                <span className="block truncate font-mono text-[10px] text-muted" dir="ltr">{unit.barcode}</span>
                              </span>
                              <span className="shrink-0 text-[10px] font-bold text-brand-500">افزودن</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-rose-500">در انبار انتخاب‌شده بارکد آماده فروش ندارد</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Field>
          </Glass>

          <Glass className="border border-amber-400/20 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-strong">مرجوعی از فروش</h3>
                <p className="mt-0.5 text-xs text-muted">بارکد واحد فروخته‌شده را اسکن و انبار مقصد را تعیین کنید</p>
              </div>
              <span className="rounded-full bg-amber-500/12 px-2.5 py-1 text-xs font-bold text-amber-600">
                {faNumber(returnItems.length)} قلم
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_210px]">
              <div className="flex gap-2">
                <input
                  ref={returnBarcodeRef}
                  value={returnBarcodeInput}
                  onChange={(event) => setReturnBarcodeInput(event.target.value)}
                  onPaste={(event) => {
                    const text = event.clipboardData.getData("text");
                    if (!text) return;
                    event.preventDefault();
                    const normalized = normalizeBarcode(text);
                    setReturnBarcodeInput(normalized);
                    if (normalized) setTimeout(() => lookupReturnBarcode(normalized), 0);
                  }}
                  onKeyDown={(event) => event.key === "Enter" && lookupReturnBarcode(returnBarcodeInput)}
                  placeholder="اسکن بارکد کالای مرجوعی"
                  dir="ltr"
                  className="min-w-0 flex-1 rounded-2xl border border-amber-400/25 bg-white/70 px-4 py-2.5 text-base text-strong outline-none transition placeholder:text-muted focus:border-amber-400 dark:bg-white/8"
                />
                <Btn
                  variant="soft"
                  className="!bg-amber-500/12 !text-amber-600"
                  onClick={() => {
                    if (returnBarcodeInput.trim()) void lookupReturnBarcode(returnBarcodeInput);
                    else {
                      setCameraTarget("return");
                      setCameraOpen(true);
                    }
                  }}
                  disabled={returnScanning}
                >
                  {returnScanning ? <I.refresh width={16} className="anim-spin-slow" /> : <I.scan width={16} />}
                </Btn>
              </div>
              <Select value={returnWarehouseId} onChange={(event) => setReturnWarehouseId(Number(event.target.value))}>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>مقصد: {warehouse.name}</option>
                ))}
              </Select>
            </div>
            {returnItems.length > 0 && (
              <div className="mt-3 space-y-2">
                {returnItems.map((item, index) => (
                  <div key={item.barcode} className="grid gap-2 rounded-2xl bg-amber-500/7 p-3 sm:grid-cols-[1fr_190px_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-strong">{item.productName} — {item.color} / {item.size}</p>
                      <p className="font-mono text-[10px] text-muted" dir="ltr">{item.barcode}</p>
                      <p className="mt-0.5 text-xs font-bold text-rose-500" dir="ltr">− {toman(item.unitPrice)}</p>
                    </div>
                    <Select
                      value={item.returnWarehouseId}
                      onChange={(event) => setReturnItems((previous) => previous.map((line, lineIndex) =>
                        lineIndex === index ? { ...line, returnWarehouseId: Number(event.target.value) } : line
                      ))}
                    >
                      {warehouses.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                      ))}
                    </Select>
                    <button
                      type="button"
                      onClick={() => setReturnItems((previous) => previous.filter((_, lineIndex) => lineIndex !== index))}
                      className="press justify-self-end rounded-xl p-2 text-rose-400"
                    >
                      <I.trash width={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Glass>

          <Glass className="p-0 overflow-hidden">
            <div className="border-b border-white/10 px-5 py-3 flex items-center justify-between">
              <h3 className="font-bold text-strong">اقلام فاکتور</h3>
              <span className="text-xs text-muted">{faNumber(items.length)} قلم</span>
            </div>
            {items.length === 0 ? (
              <div className="py-16 text-center">
                <span className="text-5xl">🛒</span>
                <p className="mt-3 text-muted text-sm">هنوز محصولی اسکن نشده</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-white/8 text-muted">
                    <th className="p-3 text-right font-medium">محصول / ورییشن</th>
                    <th className="p-3 text-center font-medium">تعداد</th>
                    <th className="p-3 text-right font-medium">قیمت</th>
                    <th className="p-3 text-right font-medium">جمع</th>
                    <th className="p-3 w-10"></th>
                  </tr></thead>
                  <tbody>
                    {items.map((it, idx) => (
                      <tr key={idx} className="border-b border-white/5">
                        <td className="p-3">
                          <p className="font-semibold text-strong">{it.productName}</p>
                          <p className="text-xs text-muted" dir="ltr">{it.barcode}</p>
                        </td>
                        <td className="p-3">
                          {it.isUnit ? (
                            <span className="block text-center font-bold text-strong">{faNumber(1)}</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => updateQty(idx, Math.max(1, it.quantity - 1))} className="press h-7 w-7 rounded-lg glass-2">−</button>
                              <span className="w-8 text-center font-bold">{faNumber(it.quantity)}</span>
                              <button onClick={() => updateQty(idx, it.quantity + 1)} className="press h-7 w-7 rounded-lg grad-brand text-white">+</button>
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-muted">{toman(it.unitPrice)}</td>
                        <td className="p-3 font-bold grad-text">{toman(it.lineTotal)}</td>
                        <td className="p-3"><button onClick={() => removeItem(idx)} className="press rounded-xl p-1.5 text-rose-400"><I.trash width={15} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Glass>

          <Glass className="p-4">
            <p className="mb-3 text-xs text-muted">مشخصات خریدار (همه اختیاری — در صورت خالی بودن، «خریدار محترم» ثبت می‌شود)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="نام خریدار"><Input value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="اختیاری" /></Field>
              <Field label="شماره تلفن"><Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="09xxxxxxxxx" dir="ltr" /></Field>
              <Field label="آدرس کامل" className="sm:col-span-2"><Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="اختیاری" /></Field>
              <JalaliDatePicker
                label="تاریخ تولد"
                allowEmpty
                value={customerBirthDate}
                onChange={setCustomerBirthDate}
                className="sm:col-span-2"
              />
              <Field label="یادداشت" className="sm:col-span-2"><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="توضیحات" /></Field>
            </div>
          </Glass>
        </div>

        <div className="space-y-4">
          <Glass className="p-5">
            <div className="mb-4 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="grid h-8 w-8 place-items-center rounded-xl grad-brand text-white text-xs font-black">CF</div>
                <div><p className="text-sm font-bold text-strong">کامفی فیتس</p><p className="text-xs text-muted">فاکتور فروش</p></div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-muted">
                <span>فروشنده: <span className="text-strong font-medium">{user?.name}</span></span>
                <span>تاریخ: <span className="text-strong font-medium">{faDate()}</span></span>
                <span>ساعت: <span className="text-strong font-medium">{faTime()}</span></span>
                <span>انبار: <span className="text-strong font-medium">{warehouses.find((w) => w.id === Number(warehouseId))?.name ?? "—"}</span></span>
                <span className="col-span-2">روش پرداخت: <span className="text-strong font-medium">{SALES_METHODS.find((m) => m.id === salesMethod)?.label}</span></span>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted">جمع کل</span><span className="font-bold text-strong">{toman(subtotal)}</span></div>
              {!!returnItems.length && (
                <div className="flex justify-between text-rose-500">
                  <span>اعتبار مرجوعی</span><span className="font-bold" dir="ltr">{signedToman(-returnCredit)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-muted shrink-0">تخفیف</span>
                <input type="number" value={discount || ""} onChange={(e) => setDiscount(Number(e.target.value))}
                  placeholder="۰" dir="ltr"
                  className="flex-1 rounded-xl border border-white/15 bg-white/40 dark:bg-white/5 px-2 py-1 text-base text-right text-rose-400 outline-none" />
              </div>
              <div className="border-t border-white/10 pt-2 flex justify-between">
                <span className="font-bold text-strong">مانده نهایی</span>
                <span className={`text-xl font-extrabold ${grandTotal < 0 ? "text-rose-500" : "text-emerald-600"}`} dir="ltr">
                  {signedToman(grandTotal)}
                </span>
              </div>
            </div>

            <Btn onClick={completeSale} className="mt-5 w-full !py-3.5 text-base" disabled={loading || (!items.length && !returnItems.length)}>
              {loading ? <I.refresh className="anim-spin-slow" /> : <I.check />}
              {loading ? "در حال ثبت..." : "ثبت و صدور فاکتور"}
            </Btn>
          </Glass>

          {items.length > 0 && (
            <Glass className="p-4">
              <p className="text-xs text-muted mb-2">آخرین بارکد</p>
              <Barcode value={items[items.length - 1].barcode} />
            </Glass>
          )}
        </div>
      </div>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="فاکتور فروش" wide>
        {receipt && <InvoiceReceipt data={receipt} onClose={() => setPreviewOpen(false)} />}
      </Modal>

      <CameraBarcodeScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onScan={(code) => {
          if (cameraTarget === "return") {
            setReturnBarcodeInput(code);
            void lookupReturnBarcode(code);
          } else {
            setBarcodeInput(code);
            void lookupBarcode(code);
          }
        }}
      />
    </div>
  );
}
