"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Glass, Btn, Field, Input, Modal, Select } from "../ui";
import { I } from "../icons";
import { CameraBarcodeScanner } from "../CameraBarcodeScanner";
import { useApp } from "../context";
import { faNumber, toman, faDate, normalizeBarcode } from "@/lib/format";

type SaleInfo = {
  invoiceNumber?: string;
  customerName?: string | null;
  customerPhone?: string | null;
  salesMethodLabel?: string;
  soldAt?: string;
  warehouseName?: string | null;
  employeeName?: string | null;
};

type FoundProduct = {
  id: number; name: string; barcode: string; sellingPrice: number;
  unitId?: number; variationId?: number; isUnit?: boolean;
  color?: string; size?: string;
  sale?: SaleInfo | null;
  createdAt?: string | null;
  creatorName?: string | null;
};
type WarehouseOption = { id: number; name: string; code: string; isActive?: boolean | null };
type TraceEvent = {
  id: number; transactionType: string; createdAt?: string | null;
  sourceWarehouseName?: string | null; destWarehouseName?: string | null;
  operatorName?: string | null; documentNumber?: string | null;
};

type RecentInvoice = {
  id: number;
  invoiceNumber: string;
  customerName?: string | null;
  customerPhone?: string | null;
  grandTotal?: number | null;
  createdAt?: string | Date | null;
  items: {
    productName: string;
    barcode: string;
    unitBarcodes?: string[] | null;
    color?: string | null;
    size?: string | null;
    lineTotal: number;
  }[];
};

const traceLabels: Record<string, string> = {
  receipt: "ایجاد و ورود به موجودی",
  distribution: "توزیع به انبار",
  transfer: "جابه‌جایی بین انبارها",
  sale: "فروش محصول",
  return: "مرجوعی محصول",
  adjustment: "اصلاح موجودی",
};

function invoiceBarcodes(inv: RecentInvoice) {
  const out: { barcode: string; productName: string; color?: string | null; size?: string | null }[] = [];
  for (const item of inv.items ?? []) {
    if (item.lineTotal < 0) continue;
    const codes = (item.unitBarcodes?.length ? item.unitBarcodes : [item.barcode]).filter(Boolean);
    for (const barcode of codes) {
      out.push({ barcode, productName: item.productName, color: item.color, size: item.size });
    }
  }
  return out;
}

export function ReturnPage() {
  const { token, user, toast } = useApp();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [found, setFound] = useState<FoundProduct | null>(null);
  const [trace, setTrace] = useState<TraceEvent[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
  const [returnWarehouseId, setReturnWarehouseId] = useState<number | "">("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [doneReturn, setDoneReturn] = useState<{ returnId: string } | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [history, setHistory] = useState<{
    returnId: string; productName: string; barcode: string; createdAt?: string;
    returnWarehouseName?: string | null;
  }[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentInvoice[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/warehouses")
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) return;
        const options = (data.warehouses as WarehouseOption[]).filter((warehouse) =>
          warehouse.isActive !== false && warehouse.code !== "website" && warehouse.code !== "digikala"
        );
        setWarehouses(options);
        const central = options.find((warehouse) => warehouse.code === "main") ?? options[0];
        if (central) setReturnWarehouseId(central.id);
      })
      .catch(() => {});
  }, []);

  const loadRecentOrders = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const limit = typeof window !== "undefined" && window.innerWidth >= 768 ? 20 : 10;
      const res = await fetch(`/api/invoices?recent=1&limit=${limit}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.ok) setRecentOrders(d.invoices ?? []);
    } catch { /* ignore */ }
    finally { setLoadingRecent(false); }
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void loadRecentOrders();
  }, [token, loadRecentOrders]);

  const loadHistory = () => {
    fetch("/api/returns", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.ok && setHistory((d.returns ?? []).slice(0, 20)))
      .catch(() => {});
  };

  const lookupBarcode = async (raw: string) => {
    const code = normalizeBarcode(raw);
    if (!code) return;
    setScanning(true); setFound(null); setTrace([]);
    try {
      const bcRes = await fetch(`/api/barcodes?barcode=${encodeURIComponent(code)}`, { headers: { Authorization: `Bearer ${token}` } });
      const bc = await bcRes.json();
      if (bc.ok && bc.found && bc.type === "unit") {
        const p = bc.product;
        const v = bc.variation;
        const price = Number(v?.price ?? p?.price ?? p?.sellingPrice ?? 0);
        if (bc.unit.status !== "sold") {
          toast("فقط واحدهای فروخته‌شده قابل مرجوعی هستند", "error");
          return;
        }
        setFound({
          id: p.id,
          name: p.name,
          barcode: code,
          sellingPrice: price,
          unitId: bc.unit.id,
          variationId: bc.unit.variationId,
          isUnit: true,
          color: v?.color,
          size: v?.size,
          sale: bc.sale ?? null,
          createdAt: p.createdAt ?? null,
          creatorName: p.creatorName ?? null,
        });
        setTrace(bc.history ?? []);
        setQuantity(1);
        toast(`واحد «${p.name}» شناسایی شد`);
        return;
      }

      toast("برای مرجوعی باید بارکد واحد فروخته‌شده اسکن شود", "error");
    } catch { toast("خطا در جستجو", "error"); }
    finally { setScanning(false); }
  };

  const confirmReturn = async () => {
    if (!found) return;
    if (!returnWarehouseId) {
      toast("انبار مقصد مرجوعی را انتخاب کنید", "error");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          barcode: found.barcode,
          quantity,
          reason,
          notes,
          returnWarehouseId,
        }),
      });
      const data = await res.json();
      if (!data.ok) { toast(data.error ?? "خطا در ثبت مرجوعی", "error"); return; }
      setDoneReturn({ returnId: data.return.returnId });
      setFound(null); setBarcodeInput(""); setReason(""); setNotes(""); setQuantity(1);
      setSuccessOpen(true);
      loadHistory();
    } catch { toast("خطا در اتصال", "error"); }
    finally { setLoading(false); }
  };

  const buildTraceHtml = () => {
    if (!found) return "";
    const escape = (value: unknown) => String(value ?? "—")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const rows = trace.map((event) => {
      const route = event.sourceWarehouseName && event.destWarehouseName
        ? `${event.sourceWarehouseName} ← ${event.destWarehouseName}`
        : event.destWarehouseName ?? event.sourceWarehouseName ?? "—";
      return `<tr><td>${escape(event.createdAt ? new Date(event.createdAt).toLocaleString("fa-IR") : "—")}</td><td>${escape(traceLabels[event.transactionType] ?? event.transactionType)}</td><td>${escape(route)}</td><td>${escape(event.operatorName)}</td><td dir="ltr">${escape(event.documentNumber)}</td></tr>`;
    }).join("");
    return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>گردش محصول ${escape(found.barcode)}</title><link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet"><style>
      @page{size:A4 portrait;margin:11mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;background:#f6f7fb;color:#172033;font:11px/1.65 Vazirmatn,Tahoma,sans-serif}.page{max-width:190mm;margin:18px auto;background:#fff;border-radius:12px;padding:12mm;box-shadow:0 18px 60px #17203318}.head{display:flex;justify-content:space-between;align-items:center;gap:20px;border-bottom:2.5px solid #172033;padding-bottom:12px}.head h1{font-size:19px;margin:8px 0 2px}.head p{margin:0;color:#64748b}.tag{display:inline-block;background:#172033;color:#fff;border-radius:999px;padding:4px 11px;font-size:9px;font-weight:700}.meta{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.card{background:#f8fafc;border:1px solid #dbe2ea;border-radius:8px;padding:8px}.card small{display:block;color:#64748b;margin-bottom:3px;font-size:8.5px}table{width:100%;border-collapse:collapse;font-size:9.5px}th{background:#172033;color:#fff;text-align:right;padding:7px;border:1px solid #172033}td{padding:7px;border:1px solid #cbd5e1}tr:nth-child(even){background:#f8fafc}.foot{text-align:center;color:#64748b;font-size:9px;margin-top:16px;padding-top:8px;border-top:1px solid #dbe2ea}@media(max-width:650px){.page{margin:0;border-radius:0;padding:18px}.head{display:block}.meta{grid-template-columns:1fr}table{font-size:9px}}@media print{body{background:#fff}.page{box-shadow:none;margin:0;max-width:none;padding:0}}
    </style></head><body><main class="page"><header class="head"><div><span class="tag">گزارش شناسنامه و گردش کالا</span><h1>${escape(found.name)}</h1><p>${escape([found.color, found.size].filter(Boolean).join(" / "))}</p></div><div dir="ltr"><strong>${escape(found.barcode)}</strong></div></header><section class="meta"><div class="card"><small>تاریخ ایجاد محصول</small><b>${escape(found.createdAt ? new Date(found.createdAt).toLocaleString("fa-IR") : "—")}</b></div><div class="card"><small>ایجادکننده</small><b>${escape(found.creatorName)}</b></div><div class="card"><small>فاکتور فروش</small><b>${escape(found.sale?.invoiceNumber)}</b></div></section><table><thead><tr><th>تاریخ</th><th>رویداد</th><th>انبار / شعبه</th><th>انجام‌دهنده</th><th>سند</th></tr></thead><tbody>${rows || "<tr><td colspan='5'>رویدادی ثبت نشده است</td></tr>"}</tbody></table><p class="foot">این گزارش به‌صورت خودکار از دفتر گردش موجودی تولید شده است.</p></main></body></html>`;
  };

  const exportTrace = (print = false) => {
    if (!found) return;
    const html = buildTraceHtml();
    if (print) {
      const popup = window.open("", "_blank", "width=1000,height=760");
      if (!popup) return;
      popup.document.write(html);
      popup.document.close();
      setTimeout(() => popup.print(), 300);
      return;
    }
    const url = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `product-trace-${found.barcode}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const reasons = ["تغییر سایز", "کیفیت نامناسب", "تغییر نظر مشتری", "اشتباه در سفارش", "آسیب‌دیدگی", "سایر"];

  return (
    <div>
      <div className="mb-5 flex min-w-0 items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-500 text-white sm:h-11 sm:w-11"><I.refresh /></div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold leading-snug text-strong sm:text-xl">ثبت مرجوعی</h1>
          <p className="mt-0.5 text-xs leading-5 text-muted sm:text-sm">با اسکن بارکد، شناسنامه و گردش کامل محصول نمایش داده می‌شود</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
        <div className="space-y-4">
          <Glass className="p-5">
            <h3 className="mb-3 font-bold text-strong">اسکن بارکد کالای مرجوعی</h3>
            <div className="flex gap-2">
              <input ref={inputRef} value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text");
                  if (!text) return;
                  e.preventDefault();
                  const normalized = normalizeBarcode(text);
                  setBarcodeInput(normalized);
                  if (normalized) setTimeout(() => lookupBarcode(normalized), 0);
                }}
                onKeyDown={(e) => e.key === "Enter" && lookupBarcode(barcodeInput)}
                onFocus={loadHistory}
                placeholder="بارکد را اسکن، تایپ یا پیست کنید..." dir="ltr" autoFocus
                className="flex-1 rounded-2xl border border-white/20 bg-white/70 dark:bg-white/8 px-4 py-3 text-base text-strong outline-none focus:border-amber-400" />
              <Btn
                variant="soft"
                onClick={() => {
                  if (barcodeInput.trim()) lookupBarcode(barcodeInput);
                  else setCameraOpen(true);
                }}
                disabled={scanning}
                className="!bg-amber-500/15 !text-amber-500"
              >
                {scanning ? <I.refresh className="anim-spin-slow" width={16} /> : <I.scan width={16} />}
              </Btn>
            </div>
          </Glass>

          {!found && (
            <Glass className="space-y-2 p-4">
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-strong">{faNumber(recentOrders.length)} سفارش اخیر</p>
                <Btn variant="ghost" onClick={() => void loadRecentOrders()} disabled={loadingRecent}>
                  <I.refresh width={14} className={loadingRecent ? "anim-spin-slow" : ""} />
                </Btn>
              </div>
              {loadingRecent && !recentOrders.length ? (
                <p className="py-4 text-center text-sm text-muted">در حال بارگذاری...</p>
              ) : recentOrders.map((inv) => {
                const barcodes = invoiceBarcodes(inv);
                const open = expandedOrderId === inv.id;
                return (
                  <div key={inv.id} className="rounded-2xl glass-2 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedOrderId(open ? null : inv.id)}
                      className="press flex w-full flex-wrap items-center gap-3 px-4 py-3 text-right hover:bg-white/5"
                    >
                      <div className="min-w-[140px] flex-1">
                        <p className="text-sm font-semibold text-strong" dir="ltr">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted">
                          {inv.customerName ?? "—"}
                          {inv.customerPhone ? ` · ${inv.customerPhone}` : ""}
                          {" · "}
                          {faNumber(barcodes.length)} بارکد
                        </p>
                      </div>
                      <p className="text-sm font-bold grad-text">{toman(inv.grandTotal ?? 0)}</p>
                    </button>
                    {open && (
                      <div className="space-y-1.5 border-t border-white/10 px-3 py-3">
                        {barcodes.length ? barcodes.map((row) => (
                          <button
                            key={row.barcode}
                            type="button"
                            onClick={() => {
                              setBarcodeInput(row.barcode);
                              void lookupBarcode(row.barcode);
                            }}
                            className="press flex w-full items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-right text-xs hover:bg-amber-500/10"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-semibold text-strong">{row.productName}</span>
                              <span className="text-muted">{[row.color, row.size].filter(Boolean).join(" / ")}</span>
                            </span>
                            <span className="shrink-0 font-mono text-brand-400" dir="ltr">{row.barcode}</span>
                          </button>
                        )) : (
                          <p className="py-2 text-center text-xs text-muted">بارکدی در این فاکتور نیست</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {!loadingRecent && !recentOrders.length && (
                <p className="py-6 text-center text-sm text-muted">سفارشی برای نمایش نیست</p>
              )}
            </Glass>
          )}

          {found && (
            <Glass className="p-5 anim-fade-up space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">👗</span>
                <div>
                  <h3 className="font-bold text-strong">{found.name}</h3>
                  <p className="text-xs text-muted">{found.color} / {found.size}</p>
                  <p className="text-xs text-muted" dir="ltr">{found.barcode}</p>
                  <p className="text-sm font-bold text-amber-500 mt-0.5">{toman(found.sellingPrice)}</p>
                </div>
              </div>

              <div className="rounded-2xl glass-2 p-4 space-y-2 text-sm">
                <p className="font-bold text-strong mb-2">اطلاعات فروش اصلی</p>
                {[
                  ["محصول", found.name],
                  ["ورییشن", `${found.color ?? "—"} / ${found.size ?? "—"}`],
                  ["انبار فروش", found.sale?.warehouseName ?? "—"],
                  ["روش فروش", found.sale?.salesMethodLabel ?? "—"],
                  ["فاکتور", found.sale?.invoiceNumber ?? "—"],
                  ["مشتری", found.sale?.customerName ?? "—"],
                  ["موبایل", found.sale?.customerPhone ?? "—"],
                  ["فروشنده", found.sale?.employeeName ?? "—"],
                  ["تاریخ فروش", found.sale?.soldAt ? new Date(found.sale.soldAt).toLocaleDateString("fa-IR") : "—"],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between gap-2 border-b border-white/5 pb-1.5 last:border-0">
                    <span className="text-muted">{l}</span>
                    <span className="font-semibold text-strong text-left" dir={l === "موبایل" || l === "فاکتور" ? "ltr" : undefined}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-sky-400/20 bg-sky-500/5 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-bold text-strong">خلاصه گردش این محصول</p>
                    <p className="text-[11px] text-muted">از زمان ایجاد تا فروش و مرجوعی</p>
                  </div>
                  <div className="flex gap-2">
                    <Btn variant="soft" onClick={() => exportTrace(false)}><I.download width={14} /> خروجی</Btn>
                    <Btn variant="ghost" onClick={() => exportTrace(true)}><I.printer width={14} /> چاپ</Btn>
                  </div>
                </div>
                <div className="relative space-y-2 before:absolute before:bottom-2 before:right-[11px] before:top-2 before:w-px before:bg-sky-400/25">
                  <div className="relative flex gap-3">
                    <span className="z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-white bg-sky-500 dark:border-slate-900" />
                    <div className="min-w-0 flex-1 rounded-xl glass-2 px-3 py-2">
                      <p className="text-xs font-bold text-strong">ایجاد محصول</p>
                      <p className="text-[10px] text-muted">
                        {found.createdAt ? new Date(found.createdAt).toLocaleString("fa-IR") : "تاریخ نامشخص"}
                        {found.creatorName ? ` · توسط ${found.creatorName}` : ""}
                      </p>
                    </div>
                  </div>
                  {trace.map((event) => {
                    const route = event.sourceWarehouseName && event.destWarehouseName
                      ? `${event.sourceWarehouseName} ← ${event.destWarehouseName}`
                      : event.destWarehouseName ?? event.sourceWarehouseName;
                    return (
                      <div key={event.id} className="relative flex gap-3">
                        <span className="z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-white bg-amber-500 dark:border-slate-900" />
                        <div className="min-w-0 flex-1 rounded-xl glass-2 px-3 py-2">
                          <div className="flex flex-wrap justify-between gap-1">
                            <p className="text-xs font-bold text-strong">{traceLabels[event.transactionType] ?? event.transactionType}</p>
                            <span className="text-[10px] text-muted">{event.createdAt ? new Date(event.createdAt).toLocaleString("fa-IR") : "—"}</span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-muted">
                            {[route, event.operatorName ? `توسط ${event.operatorName}` : null].filter(Boolean).join(" · ") || "جزئیات ثبت نشده"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Field label="تعداد مرجوعی">
                <span className="text-2xl font-extrabold text-strong">{faNumber(found.isUnit ? 1 : quantity)}</span>
              </Field>

              <Field label="انبار مقصد مرجوعی">
                <Select value={returnWarehouseId} onChange={(event) => setReturnWarehouseId(Number(event.target.value))}>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </Select>
              </Field>

              <Field label="دلیل مرجوعی">
                <div className="flex flex-wrap gap-2 mt-1">
                  {reasons.map((r) => (
                    <button key={r} onClick={() => setReason(r)} className={`press rounded-xl px-3 py-1.5 text-xs font-medium ${reason === r ? "bg-amber-500 text-white" : "glass-2 text-muted"}`}>{r}</button>
                  ))}
                </div>
              </Field>

              <Field label="توضیحات">
                <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="توضیحات بیشتر..." />
              </Field>

              <div className="rounded-2xl bg-amber-500/10 p-3 text-xs text-amber-600 border border-amber-500/20">
                کالا پس از تأیید مستقیماً وارد موجودی انبار انتخاب‌شده می‌شود.
              </div>

              <Btn onClick={confirmReturn} className="w-full !bg-amber-500 !py-3" disabled={loading}>
                {loading ? "..." : `تأیید مرجوعی به ${warehouses.find((warehouse) => warehouse.id === Number(returnWarehouseId))?.name ?? "انبار منتخب"}`}
              </Btn>
            </Glass>
          )}
        </div>

        <div className="space-y-4">
          <Glass className="p-5 h-fit">
            <h3 className="mb-4 font-bold text-strong">اطلاعات مرجوعی</h3>
            <div className="space-y-3 text-sm">
              {[
                ["تاریخ", faDate()],
                ["پردازش‌کننده", user?.name ?? "—"],
                ["مقصد", warehouses.find((warehouse) => warehouse.id === Number(returnWarehouseId))?.name ?? "—"],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between rounded-xl glass-2 px-3 py-2.5">
                  <span className="text-muted">{l}</span><span className="font-semibold text-strong">{v}</span>
                </div>
              ))}
            </div>
          </Glass>

          <Glass className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-strong">تاریخچه مرجوعی</h3>
              <Btn variant="ghost" onClick={loadHistory}><I.refresh width={14} /></Btn>
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {history.map((h) => (
                <div key={h.returnId} className="rounded-xl glass-2 px-3 py-2 text-xs">
                  <p className="font-semibold text-strong">{h.productName}</p>
                  <p className="text-muted" dir="ltr">{h.returnId} · {h.barcode}</p>
                  {h.returnWarehouseName && <p className="mt-0.5 text-amber-600">مقصد: {h.returnWarehouseName}</p>}
                </div>
              ))}
              {!history.length && <p className="text-xs text-muted text-center py-6">هنوز مرجوعی ثبت نشده</p>}
            </div>
          </Glass>
        </div>
      </div>

      <Modal open={successOpen} onClose={() => setSuccessOpen(false)} title="مرجوعی ثبت شد">
        <div className="text-center space-y-4">
          <div className="text-6xl">✅</div>
          <h3 className="text-xl font-extrabold text-amber-500">{doneReturn?.returnId}</h3>
          <p className="text-sm text-muted">کالا به انبار انتخاب‌شده برگشت و تاریخچه آن حفظ شد</p>
          <Btn variant="ghost" onClick={() => setSuccessOpen(false)} className="w-full">بستن</Btn>
        </div>
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
