"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Btn } from "./ui";
import { I } from "./icons";
import { faNumber, faDate, faTime } from "@/lib/format";
import { formatSocialLine } from "@/lib/social-networks";
import { useApp } from "./context";

export type TransferDocItem = {
  id: number;
  productName: string;
  color: string | null;
  size: string | null;
  quantity: number;
  barcodeStart: string | null;
  barcodeEnd: string | null;
  barcodes?: string[];
};

export type TransferDoc = {
  id: number;
  documentNumber: string;
  type: string;
  status: string | null;
  notes: string | null;
  totalItems: number | null;
  totalQuantity: number | null;
  operatorName: string | null;
  createdAt: string | Date | null;
  sourceWarehouse: { name: string; code?: string } | null;
  destWarehouse: { name: string; code?: string } | null;
  items?: TransferDocItem[];
};

export type StoreBrand = {
  businessName?: string | null;
  businessLogo?: string | null;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  socialNetwork?: string | null;
  socialUrl?: string | null;
  taxId?: string | null;
  footerText?: string | null;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function typeLabel(type: string) {
  return type === "distribution" ? "توزیع از انبار مرکزی" : "انتقال بین انبارها";
}

function flatBarcodes(items: TransferDocItem[]) {
  const out: { barcode: string; productName: string; color: string | null; size: string | null; itemId: number }[] = [];
  for (const it of items) {
    const list = (it.barcodes ?? []).filter(Boolean);
    if (list.length) {
      for (const barcode of list) {
        out.push({
          barcode,
          productName: it.productName,
          color: it.color,
          size: it.size,
          itemId: it.id,
        });
      }
    } else if (it.barcodeStart) {
      // fallback single range endpoints if unit list missing
      out.push({
        barcode: it.barcodeStart,
        productName: it.productName,
        color: it.color,
        size: it.size,
        itemId: it.id,
      });
      if (it.barcodeEnd && it.barcodeEnd !== it.barcodeStart) {
        out.push({
          barcode: it.barcodeEnd,
          productName: it.productName,
          color: it.color,
          size: it.size,
          itemId: it.id,
        });
      }
    }
  }
  return out;
}

function renderBarcodeSvg(code: string): string {
  if (typeof document === "undefined" || !code) {
    return `<div class="bc-code">${escapeHtml(code)}</div>`;
  }
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(svg, code, {
      format: "CODE128",
      displayValue: false,
      margin: 0,
      width: 1.15,
      height: 28,
      background: "#ffffff",
      lineColor: "#000000",
    });
  } catch {
    return `<div class="bc-code">${escapeHtml(code)}</div>`;
  }
  svg.setAttribute("class", "bc-svg");
  svg.setAttribute("style", "width:100%;height:28px;display:block");
  return svg.outerHTML;
}

function buildPrintHtml(doc: TransferDoc, brand: StoreBrand, operatorFallback?: string) {
  const name = brand.businessName?.trim() || "فروشگاه";
  const when = doc.createdAt ? new Date(doc.createdAt) : new Date();
  const items = doc.items ?? [];
  const barcodes = flatBarcodes(items);
  const status = doc.status === "completed" ? "تکمیل‌شده" : (doc.status ?? "—");

  const itemRows = items.map((it, i) => {
    const range =
      !it.barcodeStart ? "—"
        : it.barcodeStart === it.barcodeEnd ? escapeHtml(it.barcodeStart)
          : `${escapeHtml(it.barcodeStart ?? "")} … ${escapeHtml(it.barcodeEnd ?? "")}`;
    return `<tr>
      <td class="c">${escapeHtml(faNumber(i + 1))}</td>
      <td><strong>${escapeHtml(it.productName)}</strong></td>
      <td>${escapeHtml(it.color || "—")}</td>
      <td>${escapeHtml(it.size || "—")}</td>
      <td class="c n">${escapeHtml(faNumber(it.quantity))}</td>
      <td class="ltr mono">${range}</td>
    </tr>`;
  }).join("");

  const barcodeCards = barcodes.map((b, i) => {
    const meta = [b.color, b.size].filter(Boolean).join(" / ") || "—";
    return `<div class="bc-card">
      <div class="bc-meta">
        <span class="bc-idx">${escapeHtml(faNumber(i + 1))}</span>
        <span class="bc-name">${escapeHtml(b.productName)}</span>
        <span class="bc-var">${escapeHtml(meta)}</span>
      </div>
      ${renderBarcodeSvg(b.barcode)}
      <div class="bc-code">${escapeHtml(b.barcode)}</div>
    </div>`;
  }).join("");

  const logoSrc = brand.businessLogo?.trim();
  const logo = logoSrc
    ? `<img class="logo" src="${escapeHtml(logoSrc)}" alt="${escapeHtml(name)}" />`
    : `<div class="logo-fallback">${escapeHtml(name.charAt(0))}</div>`;

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>حواله ${escapeHtml(doc.documentNumber)}</title>
<link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet"/>
<style>
  @page { size: A4 portrait; margin: 10mm 11mm 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  html, body {
    margin: 0; padding: 0;
    font-family: Vazirmatn, Tahoma, sans-serif;
    color: #111; background: #fff;
    font-size: 11px; line-height: 1.45;
  }
  .sheet { width: 100%; max-width: 190mm; margin: 0 auto; background: #fff; color: #111; }

  /* —— Letterhead —— */
  .letterhead {
    display: flex; align-items: center; justify-content: space-between; gap: 12px;
    padding-bottom: 10px;
    border-bottom: 2.5px solid #0f172a;
  }
  .brand-block { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .logo { width: 52px; height: 52px; object-fit: contain; border-radius: 8px; }
  .logo-fallback {
    width: 52px; height: 52px; border-radius: 10px;
    background: #0f172a; color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 22px; font-weight: 900;
  }
  .brand-name { font-size: 18px; font-weight: 900; margin: 0; letter-spacing: -0.02em; }
  .brand-sub { margin: 2px 0 0; color: #475569; font-size: 10px; }
  .brand-contact { margin: 0; color: #64748b; font-size: 9.5px; direction: ltr; text-align: right; }
  .doc-stamp {
    text-align: left; flex-shrink: 0;
    border: 1.5px solid #0f172a; border-radius: 10px; padding: 8px 12px; min-width: 140px;
  }
  .doc-stamp .label { font-size: 9px; color: #64748b; margin: 0; }
  .doc-stamp .num { font-family: ui-monospace, monospace; font-size: 13px; font-weight: 800; margin: 2px 0 0; direction: ltr; }

  /* —— Hero —— */
  .hero {
    margin-top: 12px;
    background: #0f172a;
    color: #fff; border-radius: 12px; padding: 14px 16px;
    display: flex; justify-content: space-between; align-items: flex-end; gap: 12px;
  }
  .hero h1 { margin: 0; font-size: 20px; font-weight: 900; letter-spacing: -0.03em; color: #fff; }
  .hero .tag {
    display: inline-block; margin-top: 6px;
    background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.25);
    border-radius: 999px; padding: 2px 10px; font-size: 10px; font-weight: 700; color: #fff;
  }
  .hero-meta { text-align: left; font-size: 10px; color: #e2e8f0; line-height: 1.7; }
  .hero-meta strong { font-weight: 800; color: #fff; }

  /* —— Route —— */
  .route {
    display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: stretch;
    margin: 14px 0 12px;
  }
  .route-box {
    border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px;
    background: #f8fafc;
  }
  .route-box .k { font-size: 9px; color: #64748b; margin: 0 0 4px; font-weight: 700; }
  .route-box .v { font-size: 14px; font-weight: 900; margin: 0; color: #0f172a; }
  .route-arrow {
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; font-weight: 900; color: #0f172a;
  }

  .meta-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
    margin-bottom: 14px;
  }
  .meta-card {
    border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; background: #fff;
  }
  .meta-card .k { font-size: 9px; color: #64748b; margin: 0; }
  .meta-card .v { font-size: 12px; font-weight: 800; margin: 2px 0 0; color: #0f172a; }

  h2.sec {
    margin: 16px 0 8px; font-size: 12px; font-weight: 900; color: #0f172a;
    border-right: 3px solid #0f172a; padding-right: 8px;
  }
  table.items { width: 100%; border-collapse: collapse; }
  table.items th, table.items td {
    border: 1px solid #cbd5e1; padding: 7px 8px; text-align: right; vertical-align: middle;
  }
  table.items th {
    background: #0f172a; color: #fff; font-size: 10px; font-weight: 700;
  }
  table.items td { font-size: 10.5px; color: #111; background: #fff; }
  table.items tr:nth-child(even) td { background: #f8fafc; }
  .c { text-align: center !important; }
  .n { font-weight: 800; }
  .mono { font-family: ui-monospace, Menlo, monospace; font-size: 9.5px; }
  .ltr { direction: ltr; text-align: left !important; }

  .totals {
    display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap;
    margin-top: 10px; padding: 10px 12px;
    background: #f1f5f9; border-radius: 10px; border: 1px solid #e2e8f0;
    font-size: 12px; font-weight: 700; color: #0f172a;
  }
  .notes {
    margin-top: 10px; padding: 10px 12px;
    border: 1px dashed #94a3b8; border-radius: 10px; font-size: 10.5px; color: #334155;
  }

  .signs {
    display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;
    margin-top: 22px; page-break-inside: avoid;
  }
  .sign {
    border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; min-height: 78px;
    background: #fff;
  }
  .sign .t { font-size: 10px; font-weight: 800; margin: 0 0 28px; color: #0f172a; }
  .sign .l { font-size: 9px; color: #94a3b8; margin: 0; border-top: 1px solid #e2e8f0; padding-top: 6px; }

  .bc-section {
    margin-top: 22px;
    padding-top: 14px;
    border-top: 2px solid #0f172a;
  }
  .bc-head {
    display: flex; justify-content: space-between; align-items: flex-end; gap: 10px;
    margin-bottom: 10px;
  }
  .bc-head h2 { margin: 0; font-size: 13px; font-weight: 900; color: #0f172a; }
  .bc-head p { margin: 0; font-size: 9.5px; color: #64748b; }
  .bc-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 5mm 4mm;
  }
  .bc-card {
    border: 1.2px solid #1e293b;
    border-radius: 6px;
    padding: 2.5mm 2.8mm 2mm;
    background: #fff;
    break-inside: avoid;
    page-break-inside: avoid;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 1.5mm;
    min-height: 22mm;
  }
  .bc-meta {
    display: flex; align-items: baseline; gap: 4px; min-width: 0;
    font-size: 8px; line-height: 1.2;
  }
  .bc-idx {
    flex-shrink: 0; font-weight: 900; color: #64748b;
    font-variant-numeric: tabular-nums;
  }
  .bc-name {
    font-weight: 800; color: #0f172a;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
  }
  .bc-var {
    margin-right: auto; color: #64748b; flex-shrink: 0;
    direction: ltr; unicode-bidi: plaintext;
  }
  .bc-svg { width: 100%; height: 28px; display: block; }
  .bc-code {
    text-align: center; direction: ltr;
    font-family: ui-monospace, Menlo, monospace;
    font-size: 8.5px; font-weight: 700; letter-spacing: 0.4px;
    color: #111;
  }

  .foot {
    margin-top: 16px; padding-top: 8px;
    border-top: 1px solid #e2e8f0;
    display: flex; justify-content: space-between; gap: 10px;
    font-size: 9px; color: #64748b;
  }

  @media screen {
    body { background: #e2e8f0; padding: 18px; }
    .sheet {
      background: #fff; padding: 14mm 12mm;
      box-shadow: 0 8px 30px rgba(15,23,42,.12);
      border-radius: 4px; min-height: 277mm;
    }
  }
  @media print {
    html, body { background: #fff !important; padding: 0 !important; margin: 0 !important; }
    .sheet { max-width: none; box-shadow: none; padding: 0; min-height: 0; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <header class="letterhead">
      <div class="brand-block">
        ${logo}
        <div>
          <p class="brand-name">${escapeHtml(name)}</p>
          ${brand.address ? `<p class="brand-sub">${escapeHtml(brand.address)}</p>` : ""}
          <p class="brand-contact">
            ${[brand.phone, brand.website, formatSocialLine(brand.socialNetwork, brand.socialUrl), brand.taxId ? `شناسه مالیاتی: ${brand.taxId}` : ""]
              .filter(Boolean).map((x) => escapeHtml(String(x))).join("  ·  ")}
          </p>
        </div>
      </div>
      <div class="doc-stamp">
        <p class="label">شماره سند</p>
        <p class="num">${escapeHtml(doc.documentNumber)}</p>
      </div>
    </header>

    <section class="hero">
      <div>
        <h1>حواله انبار / برگه تحویل</h1>
        <span class="tag">${escapeHtml(typeLabel(doc.type))}</span>
      </div>
      <div class="hero-meta">
        <div>تاریخ: <strong>${escapeHtml(faDate(when))}</strong></div>
        <div>ساعت: <strong>${escapeHtml(faTime(when))}</strong></div>
        <div>وضعیت: <strong>${escapeHtml(status)}</strong></div>
      </div>
    </section>

    <div class="route">
      <div class="route-box">
        <p class="k">انبار مبدأ</p>
        <p class="v">${escapeHtml(doc.sourceWarehouse?.name ?? "—")}</p>
      </div>
      <div class="route-arrow">←</div>
      <div class="route-box">
        <p class="k">انبار مقصد / تحویل‌گیرنده</p>
        <p class="v">${escapeHtml(doc.destWarehouse?.name ?? "—")}</p>
      </div>
    </div>

    <div class="meta-grid">
      <div class="meta-card"><p class="k">اپراتور</p><p class="v">${escapeHtml(doc.operatorName || operatorFallback || "—")}</p></div>
      <div class="meta-card"><p class="k">تعداد اقلام</p><p class="v">${escapeHtml(faNumber(doc.totalItems ?? items.length))}</p></div>
      <div class="meta-card"><p class="k">جمع تعداد</p><p class="v">${escapeHtml(faNumber(doc.totalQuantity ?? 0))}</p></div>
      <div class="meta-card"><p class="k">تعداد بارکد واحد</p><p class="v">${escapeHtml(faNumber(barcodes.length))}</p></div>
    </div>

    <h2 class="sec">فهرست اقلام تحویلی</h2>
    <table class="items">
      <thead>
        <tr>
          <th class="c" style="width:28px">#</th>
          <th>محصول</th>
          <th style="width:70px">رنگ</th>
          <th style="width:60px">سایز</th>
          <th class="c" style="width:50px">تعداد</th>
          <th style="width:150px">بازه بارکد</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows || `<tr><td colspan="6" class="c">بدون قلم</td></tr>`}
      </tbody>
    </table>

    <div class="totals">
      <span>جمع اقلام: ${escapeHtml(faNumber(doc.totalItems ?? items.length))}</span>
      <span>جمع تعداد واحد: ${escapeHtml(faNumber(doc.totalQuantity ?? 0))}</span>
      <span>بارکدهای پیوست: ${escapeHtml(faNumber(barcodes.length))}</span>
    </div>
    ${doc.notes ? `<div class="notes"><strong>یادداشت:</strong> ${escapeHtml(doc.notes)}</div>` : ""}

    <section class="bc-section">
      <div class="bc-head">
        <div>
          <h2>چک‌لیست بارکد واحدها</h2>
          <p>هر باکس یک واحد تحویلی است — تحویل‌گیرنده می‌تواند بارکدها را با کالای دریافتی مطابقت دهد.</p>
        </div>
        <p>پیوست سند ${escapeHtml(doc.documentNumber)}</p>
      </div>
      ${barcodes.length
        ? `<div class="bc-grid">${barcodeCards}</div>`
        : `<p style="color:#64748b;font-size:11px">بارکد واحدی برای این سند ثبت نشده است.</p>`}
    </section>

    <div class="signs">
      <div class="sign"><p class="t">تحویل‌دهنده</p><p class="l">نام و امضا</p></div>
      <div class="sign"><p class="t">تحویل‌گیرنده</p><p class="l">نام و امضا</p></div>
      <div class="sign"><p class="t">تأیید انبار / مدیر</p><p class="l">نام و امضا</p></div>
    </div>

    <footer class="foot">
      <span>${escapeHtml(brand.footerText || "این برگه سند رسمی انتقال کالا بین انبارهاست.")}</span>
      <span dir="ltr">${escapeHtml(doc.documentNumber)}</span>
    </footer>
  </div>
</body>
</html>`;
}

/** Tiny on-screen barcode for modal preview */
function PreviewBarcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, value, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        width: 1,
        height: 24,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch { /* ignore */ }
  }, [value]);
  return <svg ref={ref} className="h-6 w-full" />;
}

export function TransferDeliverySlip({
  doc,
  brand,
  operatorFallback,
  onClose,
}: {
  doc: TransferDoc;
  brand: StoreBrand;
  operatorFallback?: string;
  onClose: () => void;
}) {
  const { toast } = useApp();
  const items = doc.items ?? [];
  const barcodes = useMemo(() => flatBarcodes(items), [items]);
  const when = doc.createdAt ? new Date(doc.createdAt) : new Date();
  const storeName = brand.businessName?.trim() || "فروشگاه";

  const print = () => {
    // Same reliable pattern as InvoiceReceipt — no noopener (returns null in Chrome)
    const w = window.open("", "_blank", "width=920,height=1100");
    if (!w) {
      toast("پاپ‌آپ مسدود شد — اجازه پاپ‌آپ مرورگر را بدهید", "error");
      return;
    }
    const html = buildPrintHtml(doc, brand, operatorFallback);
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch {
        toast("خطا در باز کردن دیالوگ چاپ", "error");
      }
    }, 400);
  };

  return (
    <div className="space-y-4">
      {/* Screen preview — compact A4-inspired layout */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white text-slate-900 shadow-xl">
        <div className="border-b-2 border-slate-900 px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {brand.businessLogo ? (
                <img src={brand.businessLogo} alt="" className="h-12 w-12 rounded-lg object-contain" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-lg font-black text-white">
                  {storeName.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-base font-black">{storeName}</p>
                {brand.address && <p className="truncate text-[11px] text-slate-500">{brand.address}</p>}
                <p className="truncate text-[10px] text-slate-400" dir="ltr">
                  {[brand.phone, brand.website, formatSocialLine(brand.socialNetwork, brand.socialUrl)].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
            <div className="shrink-0 rounded-xl border border-slate-900 px-3 py-2 text-left">
              <p className="text-[10px] text-slate-500">شماره سند</p>
              <p className="font-mono text-sm font-extrabold" dir="ltr">{doc.documentNumber}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-l from-slate-800 to-slate-950 px-5 py-4 text-white">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">حواله انبار / برگه تحویل</h2>
              <span className="mt-1 inline-block rounded-full border border-white/25 bg-white/10 px-2.5 py-0.5 text-[11px] font-bold">
                {typeLabel(doc.type)}
              </span>
            </div>
            <div className="text-left text-[11px] leading-relaxed text-white/85">
              <div>تاریخ: <strong>{faDate(when)}</strong></div>
              <div>ساعت: <strong>{faTime(when)}</strong></div>
              <div>اپراتور: <strong>{doc.operatorName || operatorFallback || "—"}</strong></div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-5 py-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-bold text-slate-500">مبدأ</p>
            <p className="font-black text-slate-900">{doc.sourceWarehouse?.name ?? "—"}</p>
          </div>
          <span className="text-lg font-black text-slate-800">←</span>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-bold text-slate-500">مقصد</p>
            <p className="font-black text-slate-900">{doc.destWarehouse?.name ?? "—"}</p>
          </div>
        </div>

        <div className="px-5 pb-2">
          <p className="mb-2 border-r-2 border-slate-900 pr-2 text-xs font-black text-slate-800">فهرست اقلام</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="p-2 text-right font-medium">محصول</th>
                  <th className="p-2 text-right font-medium">رنگ</th>
                  <th className="p-2 text-right font-medium">سایز</th>
                  <th className="p-2 text-center font-medium">تعداد</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-t border-slate-100 odd:bg-slate-50">
                    <td className="p-2 font-semibold">{it.productName}</td>
                    <td className="p-2">{it.color || "—"}</td>
                    <td className="p-2">{it.size || "—"}</td>
                    <td className="p-2 text-center font-bold">{faNumber(it.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
            <span>اقلام: {faNumber(doc.totalItems ?? items.length)}</span>
            <span>تعداد: {faNumber(doc.totalQuantity ?? 0)}</span>
            <span>بارکد: {faNumber(barcodes.length)}</span>
          </div>
          {doc.notes && (
            <p className="mt-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-600">
              یادداشت: {doc.notes}
            </p>
          )}
        </div>

        <div className="border-t border-slate-200 px-5 py-4">
          <div className="mb-3 flex items-end justify-between gap-2">
            <div>
              <p className="text-xs font-black text-slate-900">چک‌لیست بارکد واحدها</p>
              <p className="text-[10px] text-slate-500">باکس‌های افقی برای کنترل تحویل — در چاپ A4 صفحه‌بندی می‌شود</p>
            </div>
            <span className="text-[10px] text-slate-400">{faNumber(barcodes.length)} واحد</span>
          </div>
          {barcodes.length ? (
            <div className="grid max-h-64 grid-cols-2 gap-2 overflow-auto sm:grid-cols-3">
              {barcodes.map((b, i) => (
                <div
                  key={`${b.barcode}-${i}`}
                  className="flex flex-col gap-1 rounded-lg border border-slate-800 bg-white p-2"
                >
                  <div className="flex items-baseline gap-1 truncate text-[9px]">
                    <span className="font-bold text-slate-400">{faNumber(i + 1)}</span>
                    <span className="truncate font-bold text-slate-900">{b.productName}</span>
                    <span className="mr-auto shrink-0 text-slate-500" dir="ltr">
                      {[b.color, b.size].filter(Boolean).join("/") || "—"}
                    </span>
                  </div>
                  <PreviewBarcode value={b.barcode} />
                  <p className="text-center font-mono text-[9px] font-bold tracking-wide" dir="ltr">{b.barcode}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-slate-400">بارکد واحدی ثبت نشده</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>بستن</Btn>
        <Btn onClick={print}><I.printer width={16} /> چاپ A4 / PDF</Btn>
      </div>
    </div>
  );
}

/** Hook to load store branding for delivery slips */
export function useStoreBrand() {
  const [brand, setBrand] = useState<StoreBrand>({});
  useEffect(() => {
    fetch("/api/invoice-settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.settings) {
          setBrand({
            businessName: d.settings.businessName,
            businessLogo: d.settings.businessLogo,
            address: d.settings.address,
            phone: d.settings.phone,
            website: d.settings.website,
            socialNetwork: d.settings.socialNetwork,
            socialUrl: d.settings.socialUrl,
            taxId: d.settings.taxId,
            footerText: d.settings.footerText,
          });
        }
      })
      .catch(() => {});
  }, []);
  return brand;
}
