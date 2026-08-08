const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const FA_TO_EN: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

export function toFa(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** Convert Persian/Arabic digits to ASCII 0-9 */
export function toEnDigits(input: string | number): string {
  return String(input).replace(/[۰-۹٠-٩]/g, (d) => FA_TO_EN[d] ?? d);
}

/** Normalize barcode from scanner / paste (Persian digits, spaces, ZWNJ, BOM) */
export function normalizeBarcode(input: string): string {
  return toEnDigits(input)
    .replace(/[\u200c\u200e\u200f\ufeff]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

export function faNumber(n: number | null | undefined): string {
  const v = Number(n ?? 0);
  if (!Number.isFinite(v)) return toFa("0");
  return toFa(v.toLocaleString("en-US"));
}

export function toman(n: number): string {
  return `${faNumber(n)} تومان`;
}

/** Signed amount for exchange receipts (+ / −) */
export function signedToman(n: number): string {
  if (n > 0) return `+${toman(n)}`;
  if (n < 0) return `−${toman(Math.abs(n))}`;
  return toman(0);
}

export function tomanShort(n: number): string {
  if (n >= 1_000_000_000) return `${toFa((n / 1_000_000_000).toFixed(1))} میلیارد`;
  if (n >= 1_000_000) return `${toFa(Math.round(n / 1_000_000))} میلیون`;
  if (n >= 1000) return `${toFa(Math.round(n / 1000))} هزار`;
  return faNumber(n);
}

export function faDate(d = new Date()): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  } catch {
    return "";
  }
}

export function faTime(d = new Date()): string {
  try {
    return new Intl.DateTimeFormat("fa-IR", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return "";
  }
}
