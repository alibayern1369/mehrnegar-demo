"use client";

import { Fragment, useRef } from "react";
import { Btn } from "./ui";
import { I } from "./icons";
import { faNumber, toman, signedToman, faDate, faTime } from "@/lib/format";
import { salesMethodLabel } from "@/lib/sales-methods";
import { formatJalaliDisplay } from "@/lib/jalali";
import { formatSocialLine } from "@/lib/social-networks";

export type ReceiptItemSection = "original" | "returned" | "added";

export type ReceiptItem = {
  productName: string;
  barcode?: string | null;
  unitBarcodes?: string[] | null;
  color?: string | null;
  size?: string | null;
  quantity: number;
  unitPrice: number;
  discount?: number | null;
  lineTotal: number;
  /** For exchange invoices: which block this row belongs to */
  section?: ReceiptItemSection;
};

export type ReceiptSettlement = {
  returnCredit: number;
  newPurchase: number;
  balance: number;
  status: "debtor" | "creditor" | "settled" | string;
  message: string;
};

export type ReceiptData = {
  invoiceNumber: string;
  createdAt?: string | Date | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  customerBirthDate?: string | null;
  salesMethod?: string | null;
  warehouseName?: string | null;
  sellerName?: string | null;
  notes?: string | null;
  subtotal: number;
  totalDiscount?: number | null;
  grandTotal: number;
  items: ReceiptItem[];
  /** sale = normal; exchange = edit-order composite receipt */
  kind?: "sale" | "exchange";
  originalInvoiceNumber?: string | null;
  settlement?: ReceiptSettlement | null;
  business?: {
    businessName?: string;
    businessLogo?: string | null;
    address?: string;
    phone?: string;
    website?: string;
    socialNetwork?: string;
    socialUrl?: string;
    taxId?: string;
    invoiceTitle?: string;
    footerText?: string;
    returnPolicy?: string;
  } | null;
};

function itemBarcodes(it: ReceiptItem): string[] {
  if (it.unitBarcodes?.length) return it.unitBarcodes;
  return it.barcode ? [it.barcode] : [];
}

function sectionLabel(s: ReceiptItemSection): string {
  if (s === "original") return "اقلام فاکتور قبلی";
  if (s === "returned") return "اقلام مرجوعی";
  return "اقلام جدید (افزوده‌شده)";
}

function groupBySection(items: ReceiptItem[]): { key: ReceiptItemSection | "plain"; items: ReceiptItem[] }[] {
  const hasSections = items.some((it) => it.section);
  if (!hasSections) return [{ key: "plain", items }];

  const order: ReceiptItemSection[] = ["original", "returned", "added"];
  const map = new Map<ReceiptItemSection, ReceiptItem[]>();
  for (const s of order) map.set(s, []);
  for (const it of items) {
    const s = it.section ?? "added";
    map.get(s)!.push(it);
  }
  return order
    .filter((s) => (map.get(s)?.length ?? 0) > 0)
    .map((s) => ({ key: s, items: map.get(s)! }));
}

function amountHtml(n: number, signed: boolean): string {
  const text = signed ? signedToman(n) : toman(n);
  const cls = n < 0 ? "neg" : n > 0 && signed ? "pos" : "";
  return `<span class="${cls}">${escapeHtml(text)}</span>`;
}

function receiptHtml(data: ReceiptData): string {
  const biz = data.business ?? {};
  const isExchange = data.kind === "exchange" || !!data.settlement;
  const title = biz.invoiceTitle || (isExchange ? "فاکتور تعویض / ویرایش سفارش" : "فاکتور فروش");
  const name = biz.businessName || "کامفی فیتس";
  const when = data.createdAt ? new Date(data.createdAt) : new Date();
  const groups = groupBySection(data.items);
  let rowIndex = 0;

  const bodyRows = groups.map((g) => {
    const head = g.key !== "plain"
      ? `<tr class="sec"><td colspan="5">${escapeHtml(sectionLabel(g.key))}</td></tr>`
      : "";
    const signed = g.key === "returned" || g.key === "added";
    const rows = g.items.map((it) => {
      rowIndex += 1;
      const bcs = itemBarcodes(it);
      const meta = [it.color, it.size].filter(Boolean).join(" / ");
      const qty = g.key === "returned" ? -Math.abs(it.quantity) : it.quantity;
      const total = g.key === "returned" ? -Math.abs(it.lineTotal) : it.lineTotal;
      return `<tr>
      <td class="c">${faNumber(rowIndex)}</td>
      <td>
        <div class="n">${escapeHtml(it.productName)}</div>
        ${meta ? `<div class="m">${escapeHtml(meta)}</div>` : ""}
        ${bcs.map((b) => `<div class="bc" dir="ltr">${escapeHtml(b)}</div>`).join("")}
      </td>
      <td class="c">${faNumber(qty)}</td>
      <td class="l">${escapeHtml(toman(it.unitPrice))}</td>
      <td class="l">${amountHtml(total, signed || g.key === "original" && isExchange)}</td>
    </tr>`;
    }).join("");
    return head + rows;
  }).join("");

  const settle = data.settlement;
  const settleBlock = settle ? `
    <hr class="dash"/>
    <div class="row"><span>اعتبار مرجوعی</span><span class="neg">${escapeHtml(signedToman(-Math.abs(settle.returnCredit)))}</span></div>
    <div class="row"><span>خرید جدید</span><span class="pos">${escapeHtml(signedToman(Math.abs(settle.newPurchase)))}</span></div>
    <div class="row tot"><span>مانده نهایی</span><span>${escapeHtml(signedToman(settle.balance))}</span></div>
  ` : `
    <hr class="dash"/>
    <div class="row"><span>جمع کل</span><span>${escapeHtml(toman(data.subtotal))}</span></div>
    ${data.totalDiscount ? `<div class="row"><span>تخفیف</span><span>${escapeHtml(toman(data.totalDiscount))}</span></div>` : ""}
    <div class="row tot"><span>قابل پرداخت</span><span>${escapeHtml(toman(data.grandTotal))}</span></div>
  `;

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8"/>
<title>${escapeHtml(data.invoiceNumber)}</title>
<link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet"/>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0; padding: 0;
    font-family: Vazirmatn, Tahoma, sans-serif;
    background: #fff; color: #111;
  }
  .ticket {
    width: 80mm; max-width: 100%;
    margin: 0 auto; padding: 4mm 3mm 6mm;
    font-size: 11px; line-height: 1.45;
  }
  .center { text-align: center; }
  .brand { font-size: 16px; font-weight: 900; margin: 0 0 2px; }
  .title { font-size: 12px; font-weight: 700; margin: 0 0 6px; }
  .logo { max-width: 42mm; max-height: 18mm; margin: 0 auto 4px; display: block; object-fit: contain; }
  .muted { color: #444; font-size: 10px; }
  .dash { border: none; border-top: 1px dashed #222; margin: 8px 0; }
  .row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
  .row span:last-child { font-weight: 600; text-align: left; direction: ltr; }
  table { width: 100%; border-collapse: collapse; margin: 4px 0; }
  th, td { padding: 3px 2px; vertical-align: top; font-size: 10px; }
  th { border-bottom: 1px solid #222; font-weight: 700; text-align: right; }
  td.c, th.c { text-align: center; }
  td.l, th.l { text-align: left; direction: ltr; white-space: nowrap; }
  tr.sec td { padding-top: 8px; font-weight: 800; font-size: 10px; border-bottom: 1px dotted #999; }
  .n { font-weight: 700; }
  .m { color: #555; font-size: 9px; }
  .bc { font-family: ui-monospace, monospace; font-size: 9px; letter-spacing: 0.3px; color: #333; }
  .tot { font-size: 13px; font-weight: 900; }
  .pos { color: #047857; }
  .neg { color: #b91c1c; }
  .footer { margin-top: 8px; text-align: center; font-size: 9px; color: #333; }
  .inv { font-family: ui-monospace, monospace; font-weight: 800; letter-spacing: 0.5px; direction: ltr; }
  @media screen {
    body { background: #e8e8e8; padding: 16px; }
    .ticket { background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.12); }
  }
</style>
</head>
<body>
  <div class="ticket">
    <div class="center">
      <p class="brand">${escapeHtml(name)}</p>
      <p class="title">${escapeHtml(title)}</p>
      ${biz.address ? `<p class="muted">${escapeHtml(biz.address)}</p>` : ""}
      ${biz.phone ? `<p class="muted" dir="ltr">${escapeHtml(biz.phone)}</p>` : ""}
      ${biz.taxId ? `<p class="muted">شناسه مالیاتی: ${escapeHtml(biz.taxId)}</p>` : ""}
    </div>
    <hr class="dash"/>
    <div class="row"><span>شماره فاکتور</span><span class="inv">${escapeHtml(data.invoiceNumber)}</span></div>
    ${data.originalInvoiceNumber ? `<div class="row"><span>فاکتور قبلی</span><span class="inv">${escapeHtml(data.originalInvoiceNumber)}</span></div>` : ""}
    <div class="row"><span>تاریخ</span><span>${faDate(when)} — ${faTime(when)}</span></div>
    ${data.sellerName ? `<div class="row"><span>فروشنده</span><span>${escapeHtml(data.sellerName)}</span></div>` : ""}
    ${data.warehouseName ? `<div class="row"><span>انبار</span><span>${escapeHtml(data.warehouseName)}</span></div>` : ""}
    ${data.salesMethod ? `<div class="row"><span>روش پرداخت</span><span>${escapeHtml(salesMethodLabel(data.salesMethod))}</span></div>` : ""}
    ${data.customerName ? `<div class="row"><span>مشتری</span><span>${escapeHtml(data.customerName)}</span></div>` : ""}
    ${data.customerPhone ? `<div class="row"><span>موبایل</span><span dir="ltr">${escapeHtml(data.customerPhone)}</span></div>` : ""}
    ${data.customerAddress ? `<div class="row"><span>آدرس</span><span>${escapeHtml(data.customerAddress)}</span></div>` : ""}
    ${data.customerBirthDate ? `<div class="row"><span>تاریخ تولد</span><span>${escapeHtml(formatJalaliDisplay(data.customerBirthDate))}</span></div>` : ""}
    <hr class="dash"/>
    <table>
      <thead>
        <tr>
          <th class="c">#</th>
          <th>قلم</th>
          <th class="c">تعداد</th>
          <th class="l">فی</th>
          <th class="l">جمع</th>
        </tr>
      </thead>
      <tbody>${bodyRows}</tbody>
    </table>
    ${settleBlock}
    ${data.notes ? `<hr class="dash"/><p class="muted">یادداشت: ${escapeHtml(data.notes)}</p>` : ""}
    <hr class="dash"/>
    <div class="footer">
      ${biz.returnPolicy ? `<p>${escapeHtml(biz.returnPolicy)}</p>` : ""}
      ${biz.footerText ? `<p>${escapeHtml(biz.footerText)}</p>` : "<p>از خرید شما سپاسگزاریم</p>"}
      ${biz.website ? `<p dir="ltr">${escapeHtml(biz.website)}</p>` : ""}
      ${formatSocialLine(biz.socialNetwork, biz.socialUrl) ? `<p dir="ltr">${escapeHtml(formatSocialLine(biz.socialNetwork, biz.socialUrl))}</p>` : ""}
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function InvoiceReceipt({
  data,
  onClose,
}: {
  data: ReceiptData;
  onClose?: () => void;
}) {
  const previewRef = useRef<HTMLDivElement>(null);

  const openPrint = () => {
    const w = window.open("", "_blank", "width=420,height=720");
    if (!w) return;
    w.document.write(receiptHtml(data));
    w.document.close();
    setTimeout(() => w.print(), 350);
  };

  const saveFile = () => {
    const blob = new Blob([receiptHtml(data)], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.invoiceNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const biz = data.business ?? {};
  const when = data.createdAt ? new Date(data.createdAt) : new Date();
  const isExchange = data.kind === "exchange" || !!data.settlement;
  const title = biz.invoiceTitle || (isExchange ? "فاکتور تعویض / ویرایش سفارش" : "فاکتور فروش");
  const groups = groupBySection(data.items);
  const settle = data.settlement;

  return (
    <div className="space-y-4">
      <div
        ref={previewRef}
        className="mx-auto max-w-[320px] rounded-xl bg-white p-4 text-[#111] shadow-lg"
        style={{ fontFamily: "Vazirmatn, Tahoma, sans-serif" }}
      >
        <div className="text-center">
          <p className="text-base font-black">{biz.businessName || "کامفی فیتس"}</p>
          <p className="text-xs font-bold">{title}</p>
          {biz.address && <p className="mt-1 text-[10px] text-neutral-600">{biz.address}</p>}
          {biz.phone && <p className="text-[10px] text-neutral-600" dir="ltr">{biz.phone}</p>}
        </div>
        <div className="my-3 border-t border-dashed border-neutral-400" />
        <div className="space-y-1 text-[11px]">
          <div className="flex justify-between gap-2"><span>شماره</span><span className="font-mono font-bold" dir="ltr">{data.invoiceNumber}</span></div>
          {data.originalInvoiceNumber && (
            <div className="flex justify-between gap-2"><span>فاکتور قبلی</span><span className="font-mono font-bold" dir="ltr">{data.originalInvoiceNumber}</span></div>
          )}
          <div className="flex justify-between gap-2"><span>تاریخ</span><span>{faDate(when)} — {faTime(when)}</span></div>
          {data.sellerName && <div className="flex justify-between gap-2"><span>فروشنده</span><span>{data.sellerName}</span></div>}
          {data.warehouseName && <div className="flex justify-between gap-2"><span>انبار</span><span>{data.warehouseName}</span></div>}
          {data.salesMethod && <div className="flex justify-between gap-2"><span>روش پرداخت</span><span>{salesMethodLabel(data.salesMethod)}</span></div>}
          {data.customerName && <div className="flex justify-between gap-2"><span>مشتری</span><span>{data.customerName}</span></div>}
          {data.customerPhone && <div className="flex justify-between gap-2"><span>موبایل</span><span dir="ltr">{data.customerPhone}</span></div>}
          {data.customerAddress && <div className="flex justify-between gap-2"><span>آدرس</span><span className="text-left">{data.customerAddress}</span></div>}
          {data.customerBirthDate && <div className="flex justify-between gap-2"><span>تاریخ تولد</span><span>{formatJalaliDisplay(data.customerBirthDate)}</span></div>}
        </div>
        <div className="my-3 border-t border-dashed border-neutral-400" />
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-neutral-300 text-right">
              <th className="py-1 font-bold">قلم</th>
              <th className="py-1 text-center font-bold">تعداد</th>
              <th className="py-1 text-left font-bold">جمع</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.key}>
                {g.key !== "plain" && (
                  <tr>
                    <td colSpan={3} className="pb-1 pt-3 text-[10px] font-black text-neutral-700">
                      {sectionLabel(g.key)}
                    </td>
                  </tr>
                )}
                {g.items.map((it, i) => {
                  const signed = g.key === "returned" || g.key === "added";
                  const qty = g.key === "returned" ? -Math.abs(it.quantity) : it.quantity;
                  const total = g.key === "returned" ? -Math.abs(it.lineTotal) : it.lineTotal;
                  return (
                    <tr key={`${g.key}-${i}`} className="border-b border-neutral-100 align-top">
                      <td className="py-1.5">
                        <p className="font-bold leading-snug">{it.productName}</p>
                        {(it.color || it.size) && (
                          <p className="text-neutral-500">{[it.color, it.size].filter(Boolean).join(" / ")}</p>
                        )}
                        {itemBarcodes(it).map((b) => (
                          <p key={b} className="font-mono text-[9px] text-neutral-600" dir="ltr">{b}</p>
                        ))}
                      </td>
                      <td className="py-1.5 text-center font-bold">{faNumber(qty)}</td>
                      <td
                        className={`py-1.5 text-left font-semibold ${total < 0 ? "text-rose-600" : signed && total > 0 ? "text-emerald-700" : ""}`}
                        dir="ltr"
                      >
                        {signed || (isExchange && g.key === "original") ? signedToman(total) : toman(total)}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
        <div className="my-3 border-t border-dashed border-neutral-400" />
        {settle ? (
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between text-rose-600">
              <span>اعتبار مرجوعی</span>
              <span dir="ltr">{signedToman(-Math.abs(settle.returnCredit))}</span>
            </div>
            <div className="flex justify-between text-emerald-700">
              <span>خرید جدید</span>
              <span dir="ltr">{signedToman(Math.abs(settle.newPurchase))}</span>
            </div>
            <div className="flex justify-between text-sm font-black">
              <span>مانده نهایی</span>
              <span dir="ltr">{signedToman(settle.balance)}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between"><span>جمع کل</span><span>{toman(data.subtotal)}</span></div>
            {!!data.totalDiscount && (
              <div className="flex justify-between text-rose-600"><span>تخفیف</span><span>{toman(data.totalDiscount)}</span></div>
            )}
            <div className="flex justify-between text-sm font-black">
              <span>قابل پرداخت</span><span>{toman(data.grandTotal)}</span>
            </div>
          </div>
        )}
        <div className="mt-3 border-t border-dashed border-neutral-400 pt-2 text-center text-[9px] text-neutral-600">
          <p>{biz.footerText || "از خرید شما سپاسگزاریم"}</p>
          {biz.website && <p dir="ltr">{biz.website}</p>}
          {formatSocialLine(biz.socialNetwork, biz.socialUrl) && (
            <p dir="ltr">{formatSocialLine(biz.socialNetwork, biz.socialUrl)}</p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Btn onClick={openPrint}><I.printer width={16} /> چاپ فاکتور</Btn>
        <Btn variant="soft" onClick={saveFile}><I.download width={16} /> ذخیره فایل</Btn>
        {onClose && <Btn variant="ghost" onClick={onClose}>بستن</Btn>}
      </div>
    </div>
  );
}
