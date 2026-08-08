"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CameraBarcodeScanner } from "../CameraBarcodeScanner";
import { useApp } from "../context";
import { I } from "../icons";
import { Btn, Glass } from "../ui";
import { useStoreBrand } from "../TransferDeliverySlip";
import { faDate, faNumber, faTime, normalizeBarcode, toman } from "@/lib/format";

type TraceEvent = {
  id: number;
  transactionType: string;
  createdAt?: string | null;
  sourceWarehouseName?: string | null;
  destWarehouseName?: string | null;
  operatorName?: string | null;
  documentNumber?: string | null;
};

type TraceResult = {
  barcode: string;
  unit: { status?: string | null };
  product: {
    name: string;
    createdAt?: string | null;
    creatorName?: string | null;
    sellingPrice?: number | null;
  };
  variation?: { color?: string | null; size?: string | null } | null;
  warehouse?: { name?: string | null } | null;
  sale?: {
    invoiceNumber?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    salesMethodLabel?: string | null;
    soldAt?: string | null;
    warehouseName?: string | null;
    employeeName?: string | null;
  } | null;
  history: TraceEvent[];
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

const eventLabels: Record<string, string> = {
  receipt: "ایجاد و ورود به موجودی",
  distribution: "توزیع به انبار",
  transfer: "جابه‌جایی بین انبارها",
  sale: "فروش محصول",
  return: "مرجوعی محصول",
  adjustment: "اصلاح موجودی",
};

const statusLabels: Record<string, string> = {
  in_stock: "موجود در انبار",
  sold: "فروخته‌شده",
  in_transit: "در حال انتقال",
  adjusted_out: "خارج‌شده از موجودی",
};

function escapeHtml(value: unknown) {
  return String(value ?? "—")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

export function BarcodeTrackingPage() {
  const { token, toast, user } = useApp();
  const brand = useStoreBrand();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<TraceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState<RecentInvoice[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const lookup = async (raw: string) => {
    const barcode = normalizeBarcode(raw);
    if (!barcode) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch(`/api/barcodes?barcode=${encodeURIComponent(barcode)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!data.ok || !data.found) {
        toast(data.error ?? "بارکد یافت نشد", "error");
        return;
      }
      if (data.type !== "unit") {
        toast("برای رهگیری کامل، بارکد واحد کالا را وارد کنید", "error");
        return;
      }
      setInput(barcode);
      setResult({
        barcode,
        unit: data.unit ?? {},
        product: data.product,
        variation: data.variation,
        warehouse: data.warehouse,
        sale: data.sale,
        history: data.history ?? [],
      });
    } catch {
      toast("خطا در جستجوی بارکد", "error");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const buildPrintHtml = () => {
    if (!result) return "";
    const storeName = brand.businessName?.trim() || "فروشگاه";
    const logo = brand.businessLogo
      ? `<img class="logo" src="${escapeHtml(brand.businessLogo)}" alt="${escapeHtml(storeName)}"/>`
      : `<div class="logo-fallback">${escapeHtml(storeName.charAt(0))}</div>`;
    const rows = result.history.map((event, index) => {
      const route = event.sourceWarehouseName && event.destWarehouseName
        ? `${event.sourceWarehouseName} ← ${event.destWarehouseName}`
        : event.destWarehouseName ?? event.sourceWarehouseName ?? "—";
      return `<tr>
        <td class="center">${escapeHtml((index + 1).toLocaleString("fa-IR"))}</td>
        <td>${escapeHtml(event.createdAt ? new Date(event.createdAt).toLocaleString("fa-IR") : "—")}</td>
        <td><strong>${escapeHtml(eventLabels[event.transactionType] ?? event.transactionType)}</strong></td>
        <td>${escapeHtml(route)}</td>
        <td>${escapeHtml(event.operatorName)}</td>
        <td class="ltr">${escapeHtml(event.documentNumber)}</td>
      </tr>`;
    }).join("");
    const createdAt = result.product.createdAt ? new Date(result.product.createdAt) : null;
    return `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/>
      <title>رهگیری بارکد ${escapeHtml(result.barcode)}</title>
      <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet"/>
      <style>
        @page{size:A4 portrait;margin:11mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        html,body{margin:0;background:#fff;color:#111827;font:11px/1.65 Vazirmatn,Tahoma,sans-serif}.sheet{max-width:190mm;margin:auto}
        .head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:10px;border-bottom:2.5px solid #0f172a}
        .brand{display:flex;align-items:center;gap:11px}.logo,.logo-fallback{width:48px;height:48px;border-radius:9px;object-fit:contain}
        .logo-fallback{display:grid;place-items:center;background:#0f172a;color:#fff;font-size:21px;font-weight:900}.brand h2{margin:0;font-size:18px}.brand p{margin:1px 0;color:#64748b;font-size:9.5px}
        .stamp{direction:ltr;text-align:left;border:1.5px solid #0f172a;border-radius:9px;padding:7px 11px;font:700 12px ui-monospace,monospace}
        .hero{margin:12px 0;background:#0f172a;color:#fff;border-radius:11px;padding:13px 15px;display:flex;justify-content:space-between;align-items:center}
        .hero h1{margin:0;font-size:19px}.hero p{margin:3px 0 0;color:#cbd5e1}.generated{text-align:left;font-size:9.5px;color:#e2e8f0}
        .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:12px 0}.card{border:1px solid #dbe2ea;border-radius:8px;padding:8px;background:#f8fafc}
        .card small{display:block;color:#64748b;font-size:8.5px}.card b{display:block;margin-top:2px;font-size:10.5px}.ltr{direction:ltr;text-align:left}
        h3{font-size:12px;border-right:3px solid #0f172a;padding-right:7px;margin:15px 0 7px}table{width:100%;border-collapse:collapse}
        th,td{border:1px solid #cbd5e1;padding:6px 7px;text-align:right;vertical-align:middle}th{background:#0f172a;color:#fff;font-size:9.5px}
        td{font-size:9.7px}tbody tr:nth-child(even) td{background:#f8fafc}.center{text-align:center}.foot{margin-top:18px;padding-top:8px;border-top:1px solid #dbe2ea;color:#64748b;font-size:9px;display:flex;justify-content:space-between}
        @media screen{body{background:#e2e8f0;padding:18px}.sheet{background:#fff;padding:12mm;box-shadow:0 8px 28px #0f172a22}}
        @media print{.sheet{max-width:none}.no-print{display:none}}
      </style></head><body><main class="sheet">
        <header class="head"><div class="brand">${logo}<div><h2>${escapeHtml(storeName)}</h2><p>${escapeHtml(brand.address || "")}</p><p dir="ltr">${escapeHtml([brand.phone, brand.website].filter(Boolean).join(" · "))}</p></div></div><div class="stamp">${escapeHtml(result.barcode)}</div></header>
        <section class="hero"><div><h1>گزارش رهگیری و شناسنامه بارکد</h1><p>${escapeHtml(result.product.name)} · ${escapeHtml([result.variation?.color, result.variation?.size].filter(Boolean).join(" / "))}</p></div><div class="generated">تاریخ چاپ: ${escapeHtml(faDate())}<br/>ساعت: ${escapeHtml(faTime())}</div></section>
        <section class="meta">
          <div class="card"><small>وضعیت فعلی</small><b>${escapeHtml(statusLabels[result.unit.status ?? ""] ?? result.unit.status)}</b></div>
          <div class="card"><small>محل فعلی</small><b>${escapeHtml(result.warehouse?.name)}</b></div>
          <div class="card"><small>تاریخ ایجاد</small><b>${escapeHtml(createdAt?.toLocaleString("fa-IR"))}</b></div>
          <div class="card"><small>ایجادکننده</small><b>${escapeHtml(result.product.creatorName)}</b></div>
          <div class="card"><small>فاکتور فروش</small><b class="ltr">${escapeHtml(result.sale?.invoiceNumber)}</b></div>
          <div class="card"><small>مشتری</small><b>${escapeHtml(result.sale?.customerName)}</b></div>
          <div class="card"><small>روش فروش</small><b>${escapeHtml(result.sale?.salesMethodLabel)}</b></div>
          <div class="card"><small>فروشنده</small><b>${escapeHtml(result.sale?.employeeName)}</b></div>
        </section>
        <h3>تاریخچه کامل رویدادها</h3>
        <table><thead><tr><th class="center">ردیف</th><th>تاریخ و ساعت</th><th>رویداد</th><th>انبار / مسیر</th><th>انجام‌دهنده</th><th>شماره سند</th></tr></thead>
        <tbody>${rows || `<tr><td colspan="6" class="center">رویدادی ثبت نشده است</td></tr>`}</tbody></table>
        <footer class="foot"><span>این گزارش به‌صورت خودکار از دفتر گردش موجودی تولید شده است.</span><span>چاپ توسط: ${escapeHtml(user?.name)}</span></footer>
      </main></body></html>`;
  };

  const print = () => {
    if (!result) return;
    const popup = window.open("", "_blank", "width=920,height=1100");
    if (!popup) {
      toast("اجازه باز شدن پنجره چاپ را در مرورگر فعال کنید", "error");
      return;
    }
    popup.document.open();
    popup.document.write(buildPrintHtml());
    popup.document.close();
    setTimeout(() => {
      popup.focus();
      popup.print();
    }, 450);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-500 text-white"><I.scan /></div>
        <div>
          <h1 className="text-xl font-extrabold text-strong">رهگیری بارکد</h1>
          <p className="text-sm text-muted">تاریخچه کامل هر واحد کالا را از زمان ایجاد تا آخرین رویداد مشاهده کنید</p>
        </div>
      </div>

      <Glass className="p-5">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onPaste={(event) => {
              const value = normalizeBarcode(event.clipboardData.getData("text"));
              if (!value) return;
              event.preventDefault();
              setInput(value);
              void lookup(value);
            }}
            onKeyDown={(event) => event.key === "Enter" && void lookup(input)}
            dir="ltr"
            autoFocus
            placeholder="بارکد واحد را اسکن، تایپ یا پیست کنید..."
            className="min-w-0 flex-1 rounded-2xl border border-white/20 bg-white/70 px-4 py-3 text-base text-strong outline-none focus:border-sky-400 dark:bg-white/8"
          />
          <Btn onClick={() => input.trim() ? void lookup(input) : setCameraOpen(true)} disabled={loading}>
            {loading ? <I.refresh className="anim-spin-slow" width={17} /> : <I.scan width={17} />}
            {input.trim() ? "جستجو" : "دوربین"}
          </Btn>
        </div>
      </Glass>

      {!result && (
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
              <div key={inv.id} className="overflow-hidden rounded-2xl glass-2">
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
                          setInput(row.barcode);
                          void lookup(row.barcode);
                        }}
                        className="press flex w-full items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-2 text-right text-xs hover:bg-sky-500/10"
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

      {result && (
        <Glass className="space-y-5 p-5 anim-fade-up">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-strong">{result.product.name}</h2>
              <p className="text-xs text-muted">{[result.variation?.color, result.variation?.size].filter(Boolean).join(" / ") || "بدون تنوع"}</p>
              <p className="mt-1 font-mono text-sm text-strong" dir="ltr">{result.barcode}</p>
            </div>
            <Btn onClick={print}><I.printer width={16} /> چاپ A4 / PDF</Btn>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["وضعیت فعلی", statusLabels[result.unit.status ?? ""] ?? result.unit.status ?? "—"],
              ["محل فعلی", result.warehouse?.name ?? "—"],
              ["قیمت", toman(Number(result.product.sellingPrice ?? 0))],
              ["ایجادکننده", result.product.creatorName ?? "—"],
              ["فاکتور فروش", result.sale?.invoiceNumber ?? "—"],
              ["مشتری", result.sale?.customerName ?? "—"],
              ["روش فروش", result.sale?.salesMethodLabel ?? "—"],
              ["فروشنده", result.sale?.employeeName ?? "—"],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl glass-2 p-3">
                <p className="text-[11px] text-muted">{label}</p>
                <p className="mt-1 text-sm font-bold text-strong">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-sky-400/20 bg-sky-500/5 p-4">
            <p className="font-bold text-strong">تاریخچه کامل بارکد</p>
            <p className="mb-4 text-[11px] text-muted">تمام اتفاق‌های ثبت‌شده به ترتیب زمان</p>
            <div className="relative space-y-2 before:absolute before:bottom-2 before:right-[11px] before:top-2 before:w-px before:bg-sky-400/25">
              {result.history.map((event) => {
                const route = event.sourceWarehouseName && event.destWarehouseName
                  ? `${event.sourceWarehouseName} ← ${event.destWarehouseName}`
                  : event.destWarehouseName ?? event.sourceWarehouseName;
                return (
                  <div key={event.id} className="relative flex gap-3">
                    <span className="z-10 mt-1 h-6 w-6 shrink-0 rounded-full border-4 border-white bg-sky-500 dark:border-slate-900" />
                    <div className="min-w-0 flex-1 rounded-xl glass-2 px-3 py-2">
                      <div className="flex flex-wrap justify-between gap-1">
                        <p className="text-xs font-bold text-strong">{eventLabels[event.transactionType] ?? event.transactionType}</p>
                        <span className="text-[10px] text-muted">{event.createdAt ? new Date(event.createdAt).toLocaleString("fa-IR") : "—"}</span>
                      </div>
                      <p className="mt-1 text-[10px] text-muted">{[route, event.operatorName ? `توسط ${event.operatorName}` : null, event.documentNumber].filter(Boolean).join(" · ") || "جزئیات ثبت نشده"}</p>
                    </div>
                  </div>
                );
              })}
              {!result.history.length && <p className="py-6 text-center text-sm text-muted">رویدادی برای این بارکد ثبت نشده است</p>}
            </div>
          </div>
        </Glass>
      )}

      <CameraBarcodeScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onScan={(barcode) => {
          setInput(barcode);
          void lookup(barcode);
        }}
      />
    </div>
  );
}
