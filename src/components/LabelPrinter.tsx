"use client";

import { useEffect, useMemo, useRef } from "react";
import JsBarcode from "jsbarcode";
import { Modal, Btn } from "./ui";
import { I } from "./icons";
import { toman, faNumber } from "@/lib/format";
import { useApp } from "./context";
import {
  buildZebraCsv,
  buildZebraZpl,
  downloadTextFile,
  downloadBinaryFile,
  ZEBRA_PAPER,
} from "@/lib/zebraLabels";

export type LabelItem = {
  productName: string;
  color: string;
  size: string;
  barcode: string;
  price: number;
};

/** مطابق Label.nlbl کار کرده */
const PAPER_W = ZEBRA_PAPER.paperWmm;
const LABEL_W = ZEBRA_PAPER.labelWmm;
const LABEL_H = ZEBRA_PAPER.labelHmm;
const GAP_X = ZEBRA_PAPER.gapXmm;
const GAP_Y = ZEBRA_PAPER.gapYmm;
const MARGIN_X = ZEBRA_PAPER.marginXmm;

function fitTitle(el: HTMLElement | null) {
  if (!el) return;
  let size = 10;
  el.style.fontSize = `${size}pt`;
  el.style.whiteSpace = "nowrap";
  while (size > 5.5 && el.scrollWidth > el.clientWidth) {
    size -= 0.5;
    el.style.fontSize = `${size}pt`;
  }
}

function chunkPairs<T>(items: T[]): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }
  return rows;
}

function LabelCard({ item }: { item: LabelItem }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;
    try {
      JsBarcode(svgRef.current, item.barcode, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        width: 1.05,
        height: 18,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch { /* ignore invalid */ }
  }, [item.barcode]);

  useEffect(() => {
    fitTitle(titleRef.current);
  }, [item.productName]);

  return (
    <div
      className="label-card"
      style={{
        width: `${LABEL_W}mm`,
        height: `${LABEL_H}mm`,
        background: "#fff",
        color: "#000",
        border: "none",
        boxSizing: "border-box",
        padding: "2mm",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        overflow: "hidden",
        fontFamily: "Vazirmatn, IRANSans, IRANYekan, Peyda, Tahoma, sans-serif",
        pageBreakInside: "avoid",
        flexShrink: 0,
      }}
    >
      <div
        ref={titleRef}
        data-title
        style={{
          width: "100%",
          textAlign: "center",
          fontWeight: 800,
          fontSize: "10pt",
          lineHeight: 1.1,
          overflow: "hidden",
        }}
      >
        {item.productName}
      </div>
      <div style={{ width: "100%", textAlign: "center", fontSize: "7pt", fontWeight: 600 }}>
        {item.size} / {item.color}
      </div>
      <svg ref={svgRef} style={{ maxWidth: "100%", height: "auto" }} />
      <div style={{ fontSize: "6.5pt", letterSpacing: "0.5px", direction: "ltr" }}>{item.barcode}</div>
      <div style={{ fontSize: "7.5pt", fontWeight: 800 }}>{toman(item.price)}</div>
    </div>
  );
}

function LabelRow({ items }: { items: LabelItem[] }) {
  return (
    <div
      className="label-row"
      style={{
        width: `${PAPER_W}mm`,
        height: `${LABEL_H}mm`,
        display: "flex",
        flexDirection: "row",
        alignItems: "stretch",
        paddingLeft: `${MARGIN_X}mm`,
        paddingRight: `${MARGIN_X}mm`,
        boxSizing: "border-box",
        gap: `${GAP_X}mm`,
        pageBreakAfter: "always",
        breakAfter: "page",
      }}
    >
      {items.map((item, i) => (
        <LabelCard key={`${item.barcode}-${i}`} item={item} />
      ))}
    </div>
  );
}

export function LabelPrinter({
  open,
  onClose,
  labels,
  title = "چاپ برچسب محصولات",
}: {
  open: boolean;
  onClose: () => void;
  labels: LabelItem[];
  title?: string;
}) {
  const { token, toast } = useApp();
  const printRef = useRef<HTMLDivElement>(null);
  const count = labels.length;
  const rows = useMemo(() => chunkPairs(labels), [labels]);

  const previewStyle = useMemo(() => ({
    display: "flex",
    flexDirection: "column" as const,
    gap: `${GAP_Y}mm`,
    padding: `${GAP_Y}mm 0`,
    background: "#d4d0c8",
    width: `${PAPER_W}mm`,
    maxWidth: "100%",
    margin: "0 auto",
  }), []);

  const print = () => {
    const node = printRef.current;
    if (!node) return;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/>
      <title>برچسب‌ها</title>
      <link href="https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css" rel="stylesheet"/>
      <style>
        @page { size: ${PAPER_W}mm ${LABEL_H}mm; margin: 0; }
        * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        html, body { margin: 0; padding: 0; background: #fff;
          font-family: Vazirmatn, IRANSans, IRANYekan, Peyda, Tahoma, sans-serif; }
        .sheet { display: block; width: ${PAPER_W}mm; }
        .label-row {
          width: ${PAPER_W}mm; height: ${LABEL_H}mm;
          display: flex; flex-direction: row; align-items: stretch;
          padding-left: ${MARGIN_X}mm; padding-right: ${MARGIN_X}mm;
          gap: ${GAP_X}mm;
          break-after: page; page-break-after: always;
        }
        .label-row:last-child { break-after: auto; page-break-after: auto; }
        .label-card {
          width: ${LABEL_W}mm; height: ${LABEL_H}mm;
          background: #fff; color: #000; border: none;
          padding: 2mm;
          display: flex; flex-direction: column; align-items: center; justify-content: space-between;
          overflow: hidden; flex-shrink: 0;
        }
      </style></head><body><div class="sheet">${node.innerHTML}</div>
      <script>
        document.querySelectorAll('.label-card [data-title]').forEach(function(el){
          var size=10; el.style.fontSize=size+'pt'; el.style.whiteSpace='nowrap';
          while(size>5.5 && el.scrollWidth>el.clientWidth){ size-=0.5; el.style.fontSize=size+'pt'; }
        });
        setTimeout(function(){ window.print(); }, 400);
      </script></body></html>`);
    w.document.close();
  };

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadTextFile(
      `zebra-labels-${stamp}.csv`,
      buildZebraCsv(labels),
      "text/csv;charset=utf-8",
    );
  };

  const exportZpl = () => {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadTextFile(
      `zebra-labels-${stamp}.zpl`,
      buildZebraZpl(labels),
      "application/octet-stream",
    );
  };

  const exportNlbl = async () => {
    if (!token) {
      toast("وارد حساب کاربری شوید", "error");
      return;
    }
    try {
      const res = await fetch("/api/labels/nlbl", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ labels }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        toast(j?.error ?? "خطا در ساخت فایل nlbl", "error");
        return;
      }
      const dispo = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="([^"]+)"/.exec(dispo);
      const filename = match?.[1] ?? "Label.nlbl";
      const buf = await res.arrayBuffer();
      downloadBinaryFile(filename, buf, res.headers.get("Content-Type") ?? "application/octet-stream");
      toast("فایل NLBL دانلود شد");
    } catch {
      toast("خطا در دریافت فایل nlbl", "error");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} wide>
      <div className="space-y-4">
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-xs text-emerald-300">
          {faNumber(count)} برچسب — شیت دو ستونه {faNumber(LABEL_W)}×{faNumber(LABEL_H)}mm روی کاغذ {faNumber(PAPER_W)}mm
          (مطابق Label.nlbl). در چاپ مرورگر حاشیه None و مقیاس ۱۰۰٪.
        </div>
        <div className="rounded-2xl bg-sky-500/10 border border-sky-500/20 px-4 py-3 text-xs text-sky-200/90 space-y-1.5">
          <p className="font-semibold text-sky-100">Zebra Designer:</p>
          <p>
            خروجی NLBL همان قالب Label.nlbl شماست؛ فقط نام، سایز/رنگ، قیمت تومان و بارکد
            (مثل پیش‌نمایش همین صفحه) داخلش قرار می‌گیرد — فونت و چیدمان قالب دست نمی‌خورد.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Btn onClick={print} disabled={!count}><I.printer width={16} /> چاپ برچسب‌ها</Btn>
          <Btn variant="soft" onClick={exportNlbl} disabled={!count}>خروجی NLBL برای Zebra</Btn>
          <Btn variant="ghost" onClick={exportCsv} disabled={!count}>خروجی CSV</Btn>
          <Btn variant="ghost" onClick={exportZpl} disabled={!count}>خروجی ZPL</Btn>
          <p className="text-[11px] text-muted">
            حاشیه کناری {faNumber(MARGIN_X)}mm · فاصله افقی {faNumber(GAP_X)}mm
          </p>
        </div>
        <div className="max-h-[420px] overflow-auto rounded-2xl bg-black/20 p-3">
          <div ref={printRef} style={previewStyle}>
            {rows.map((row, ri) => (
              <LabelRow key={ri} items={row} />
            ))}
            {!labels.length && (
              <p className="w-full py-10 text-center text-sm text-muted">برچسبی برای چاپ وجود ندارد</p>
            )}
          </div>
        </div>
        <div className="flex justify-end">
          <Btn variant="ghost" onClick={onClose}>بستن</Btn>
        </div>
      </div>
    </Modal>
  );
}
