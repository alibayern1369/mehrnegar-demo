import { toman } from "@/lib/format";

export type ZebraLabelItem = {
  productName: string;
  color: string;
  size: string;
  barcode: string;
  price: number;
};

/**
 * ابعاد مطابق Label.nlbl کار کردهٔ کاربر:
 * Media 92×30mm · Element 45×30 · HorizontalCount=2 · HorizontalGap=1mm
 */
export const ZEBRA_PAPER = {
  dpi: 203,
  paperWmm: 92,
  labelWmm: 45,
  labelHmm: 30,
  gapXmm: 1,
  gapYmm: 3,
  marginXmm: 0.5, // (92 - 45 - 1 - 45) / 2
} as const;

function mmToDots(mm: number, dpi = ZEBRA_PAPER.dpi): number {
  return Math.round((mm * dpi) / 25.4);
}

function csvCell(value: string | number): string {
  const s = String(value ?? "").replace(/"/g, '""');
  return `"${s}"`;
}

function sizeMeta(item: ZebraLabelItem): string {
  return [item.size, item.color].map((x) => x?.trim()).filter(Boolean).join(" / ");
}

/** CSV با همان متن‌های طراحی لیبل اپ */
export function buildZebraCsv(labels: ZebraLabelItem[]): string {
  const header = [
    "productName",
    "sizeColor",
    "barcode",
    "color",
    "size",
    "price",
    "priceText",
  ];
  const lines = [header.map(csvCell).join(",")];
  for (const l of labels) {
    lines.push(
      [
        csvCell(l.productName),
        csvCell(sizeMeta(l)),
        csvCell(l.barcode),
        csvCell(l.color),
        csvCell(l.size),
        csvCell(l.price),
        csvCell(toman(l.price)),
      ].join(","),
    );
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function zplSafe(text: string): string {
  return text.replace(/[\^~\\]/g, " ").replace(/\r?\n/g, " ").trim();
}

function zplOneLabel(item: ZebraLabelItem, ox: number, oy: number): string {
  const w = mmToDots(ZEBRA_PAPER.labelWmm);
  const h = mmToDots(ZEBRA_PAPER.labelHmm);
  const pad = mmToDots(1.5);
  const title = zplSafe(item.productName);
  const meta = zplSafe(sizeMeta(item));
  const price = zplSafe(toman(item.price));
  const code = zplSafe(item.barcode);

  return [
    `^FO${ox},${oy}^GB${w},${h},2^FS`,
    `^FO${ox + pad},${oy + mmToDots(1.5)}^FB${w - pad * 2},1,0,C,0^A0N,22,22^FD${title}^FS`,
    `^FO${ox + pad},${oy + mmToDots(6)}^FB${w - pad * 2},1,0,C,0^A0N,18,18^FD${meta}^FS`,
    `^BY2,2,55`,
    `^FO${ox + pad},${oy + mmToDots(10)}^BCN,55,N,N,N^FD${code}^FS`,
    `^FO${ox + pad},${oy + mmToDots(20)}^FB${w - pad * 2},1,0,C,0^A0N,16,16^FD${code}^FS`,
    `^FO${ox + pad},${oy + mmToDots(24)}^FB${w - pad * 2},1,0,C,0^A0N,20,20^FD${price}^FS`,
  ].join("\n");
}

/** ZPL دو ستونه مطابق Media 92×30mm قالب nlbl */
export function buildZebraZpl(labels: ZebraLabelItem[]): string {
  const { paperWmm, labelHmm, labelWmm, gapXmm, marginXmm } = ZEBRA_PAPER;
  const pw = mmToDots(paperWmm);
  const ll = mmToDots(labelHmm);
  const x0 = mmToDots(marginXmm);
  const x1 = mmToDots(marginXmm + labelWmm + gapXmm);

  const parts: string[] = [];
  for (let i = 0; i < labels.length; i += 2) {
    const left = labels[i];
    const right = labels[i + 1];
    const body = [
      "^XA",
      "^CI28",
      `^PW${pw}`,
      `^LL${ll}`,
      "^LH0,0",
      "^LT0",
      "^LS0",
      zplOneLabel(left, x0, 0),
      right ? zplOneLabel(right, x1, 0) : "",
      "^XZ",
    ]
      .filter(Boolean)
      .join("\n");
    parts.push(body);
  }
  return parts.join("\n");
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadBinaryFile(filename: string, bytes: ArrayBuffer | Uint8Array, mime: string) {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
