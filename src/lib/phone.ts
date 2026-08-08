const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Convert Persian/Arabic digits to Latin 0-9 */
export function toLatinDigits(input: string): string {
  return String(input ?? "").replace(/[۰-۹٠-٩]/g, (ch) => {
    const fi = FA_DIGITS.indexOf(ch);
    if (fi >= 0) return String(fi);
    const ai = AR_DIGITS.indexOf(ch);
    return ai >= 0 ? String(ai) : ch;
  });
}

/** Normalize Iranian mobile to `09xxxxxxxxx` (11 digits) */
export function normalizePhone(phone: string): string {
  const digits = toLatinDigits(phone).replace(/\D/g, "");
  if (digits.startsWith("98") && digits.length >= 12) return "0" + digits.slice(2);
  if (digits.startsWith("9") && digits.length === 10) return "0" + digits;
  if (digits.startsWith("0") && digits.length === 11) return digits;
  return digits.startsWith("0") ? digits : digits.length ? digits : String(phone ?? "").trim();
}

export function isValidIranMobile(phone: string): boolean {
  return /^09\d{9}$/.test(normalizePhone(phone));
}

/** Split admin phone list (newline / comma / space) into normalized unique mobiles */
export function parsePhoneList(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  const parts = raw.split(/[\s,;|،]+/).map((p) => p.trim()).filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const p of parts) {
    const n = normalizePhone(p);
    if (isValidIranMobile(n) && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}
