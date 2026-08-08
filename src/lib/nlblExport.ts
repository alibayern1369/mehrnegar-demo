import { TextReader, ZipWriter, Uint8ArrayWriter, Uint8ArrayReader } from "@zip.js/zip.js";
import { toman } from "@/lib/format";
import type { ZebraLabelItem } from "./zebraLabels";

/** رمز استاندارد فایل‌های ZebraDesigner / NiceLabel (.nlbl) */
export const NLBL_PASSWORD = ",^_A5Fus&!?j='Epiq*e";

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** همان متن‌های LabelCard — بدون دست‌کاری فونت/چیدمان قالب */
function labelTexts(item: ZebraLabelItem) {
  return {
    title: item.productName?.trim() || "",
    meta: [item.size, item.color].map((x) => x?.trim()).filter(Boolean).join(" / "),
    price: toman(item.price),
    barcode: String(item.barcode ?? "").trim(),
  };
}

/** جایگزینی محتوای یک Item بر اساس MergeName (مثل قالب Label.nlbl) */
export function replaceMergeItem(
  xml: string,
  mergeName: string,
  value: string,
  opts?: { base64?: boolean; fit?: boolean; asGraphics?: boolean },
): string {
  const marker = `<MergeName>${mergeName}</MergeName>`;
  const idx = xml.indexOf(marker);
  if (idx < 0) return xml;
  const start = xml.lastIndexOf("<Item ", idx);
  if (start < 0) return xml;
  const end = idx + marker.length;
  let block = xml.slice(start, end);
  if (opts?.base64) {
    const b64 = Buffer.from(`${value}\r\n`, "utf8").toString("base64");
    block = block.replace(
      /<FixedContents\b[^>]*>[\s\S]*?<\/FixedContents>/,
      `<FixedContents Base64Encoded="true">${b64}</FixedContents>`,
    );
  } else {
    const esc = xmlEscape(value);
    block = block.replace(
      /<FixedContents\b[^>]*>[\s\S]*?<\/FixedContents>/,
      `<FixedContents>${esc}</FixedContents>`,
    );
    // فقط StringValue داخل Contents — فونت و بقیهٔ قالب دست نخورده می‌ماند
    block = block.replace(
      /(<Contents\b[\s\S]*?<StringValue>)[\s\S]*?(<\/StringValue>)/,
      `$1${esc}$2`,
    );
  }
  // متن فارسی را به‌صورت گرافیک چاپ کن تا فونت قالب درست بیاید
  if (opts?.asGraphics) {
    block = block.replace(
      /<PrintAsGraphics>False<\/PrintAsGraphics>/,
      "<PrintAsGraphics>True</PrintAsGraphics>",
    );
  }
  // اگر متن بلند است (مثل قیمت تومان) ScaleFactor برای جا شدن داخل کادر
  if (opts?.fit && !/<ScaleFactor>/.test(block)) {
    block = block.replace(
      /(<\/BestFitMaximumFontSize>)/,
      `$1\n          <ScaleFactor>50</ScaleFactor>`,
    );
  }
  return xml.slice(0, start) + block + xml.slice(end);
}

/** پر کردن قالب دو ستونهٔ Label.nlbl با همان محتوای طراحی لیبل اپ */
export function fillNlblFormatXml(
  templateXml: string,
  left: ZebraLabelItem,
  right?: ZebraLabelItem | null,
): string {
  let xml = templateXml;
  const L = labelTexts(left);
  const textOpts = { asGraphics: true as const };
  const priceOpts = { asGraphics: true as const, fit: true as const };
  xml = replaceMergeItem(xml, "Text", L.title, textOpts);
  xml = replaceMergeItem(xml, "Text_1", L.meta, textOpts);
  xml = replaceMergeItem(xml, "Text_2", L.price, priceOpts);
  xml = replaceMergeItem(xml, "Barcode_2", L.barcode, { base64: true });

  if (right) {
    const R = labelTexts(right);
    xml = replaceMergeItem(xml, "Text_3", R.title, textOpts);
    xml = replaceMergeItem(xml, "Text_1_1", R.meta, textOpts);
    xml = replaceMergeItem(xml, "Text_2_1", R.price, priceOpts);
    xml = replaceMergeItem(xml, "Barcode_1", R.barcode);
  } else {
    xml = replaceMergeItem(xml, "Text_3", "", textOpts);
    xml = replaceMergeItem(xml, "Text_1_1", "", textOpts);
    xml = replaceMergeItem(xml, "Text_2_1", "", priceOpts);
    xml = replaceMergeItem(xml, "Barcode_1", "");
  }
  return xml;
}

async function packNlbl(formatXml: string, slnxXml: string): Promise<Uint8Array> {
  const u8writer = new Uint8ArrayWriter();
  const zipWriter = new ZipWriter(u8writer, {
    password: NLBL_PASSWORD,
    encryptionStrength: 3,
    bufferedWrite: true,
  });
  await zipWriter.add("Formats/Label", new TextReader(formatXml), {
    password: NLBL_PASSWORD,
    encryptionStrength: 3,
  });
  await zipWriter.add("Label.slnx", new TextReader(slnxXml), {
    password: NLBL_PASSWORD,
    encryptionStrength: 3,
  });
  await zipWriter.close();
  return u8writer.getData();
}

export type NlblBuildResult =
  | { kind: "nlbl"; filename: string; bytes: Uint8Array }
  | { kind: "zip"; filename: string; bytes: Uint8Array };

/** ساخت یک یا چند فایل .nlbl بر اساس قالب کار کردهٔ کاربر */
export async function buildNlblExport(
  labels: ZebraLabelItem[],
  templateXml: string,
  slnxXml: string,
): Promise<NlblBuildResult> {
  const pairs: { left: ZebraLabelItem; right?: ZebraLabelItem }[] = [];
  for (let i = 0; i < labels.length; i += 2) {
    pairs.push({ left: labels[i], right: labels[i + 1] });
  }

  if (pairs.length === 1) {
    const xml = fillNlblFormatXml(templateXml, pairs[0].left, pairs[0].right);
    const bytes = await packNlbl(xml, slnxXml);
    return { kind: "nlbl", filename: "Label.nlbl", bytes };
  }

  const outer = new Uint8ArrayWriter();
  const zipWriter = new ZipWriter(outer, { bufferedWrite: true });
  for (let i = 0; i < pairs.length; i++) {
    const xml = fillNlblFormatXml(templateXml, pairs[i].left, pairs[i].right);
    const nlbl = await packNlbl(xml, slnxXml);
    const name = `Label-${String(i + 1).padStart(3, "0")}.nlbl`;
    await zipWriter.add(name, new Uint8ArrayReader(nlbl));
  }
  await zipWriter.close();
  return { kind: "zip", filename: "Labels-nlbl.zip", bytes: await outer.getData() };
}
