/** Jalali (Persian) calendar — month lengths, leap years, parse/format */

export const FA_MONTHS_FULL = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
] as const;

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
  1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
];

function div(a: number, b: number) {
  return Math.trunc(a / b);
}

function mod(a: number, b: number) {
  return a - Math.trunc(a / b) * b;
}

/** Returns leap (0 = leap year) for Jalali year — jalaali-js algorithm */
function jalCal(jy: number) {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;
  let jm = 0;
  let n = 0;
  let i = 1;

  if (jy < jp || jy >= BREAKS[bl - 1]) {
    throw new Error(`Invalid Jalali year ${jy}`);
  }

  for (; i < bl; i += 1) {
    jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }
  n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) {
    n = n - jump + div(jump + 4, 33) * 33;
  }
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;

  return { leap, gy, march };
}

export function isJalaliLeap(jy: number): boolean {
  try {
    return jalCal(jy).leap === 0;
  } catch {
    return false;
  }
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm < 1 || jm > 12) return 0;
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeap(jy) ? 30 : 29;
}

export function todayJalali(): { jy: number; jm: number; jd: number } {
  try {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(new Date());
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
    return { jy: get("year"), jm: get("month"), jd: get("day") };
  } catch {
    return { jy: 1404, jm: 1, jd: 1 };
  }
}

function jalaliPartsForDate(date: Date): { jy: number; jm: number; jd: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
      timeZone: "UTC",
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).formatToParts(date);
    const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    const result = { jy: get("year"), jm: get("month"), jd: get("day") };
    return isValidJalaliDate(result.jy, result.jm, result.jd) ? result : null;
  } catch {
    return null;
  }
}

/** Convert an ISO Gregorian date (YYYY-MM-DD) to Jalali parts. */
export function gregorianIsoToJalali(value: string | null | undefined): { jy: number; jm: number; jd: number } | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return jalaliPartsForDate(date);
}

/** Convert a Jalali date to the Gregorian YYYY-MM-DD format used by APIs. */
export function jalaliToGregorianIso(jy: number, jm: number, jd: number): string | null {
  if (!isValidJalaliDate(jy, jm, jd)) return null;

  const daysBeforeMonth = jm <= 7 ? (jm - 1) * 31 : 186 + (jm - 7) * 30;
  const estimate = Date.UTC(jy + 621, 2, 20 + daysBeforeMonth + jd - 1);

  // Persian New Year can fall on March 20 or 21; check a small window around the estimate.
  for (let offset = -3; offset <= 3; offset += 1) {
    const date = new Date(estimate + offset * 86_400_000);
    const parts = jalaliPartsForDate(date);
    if (parts?.jy === jy && parts.jm === jm && parts.jd === jd) {
      return date.toISOString().slice(0, 10);
    }
  }
  return null;
}

/** Format as YYYY/MM/DD */
export function formatJalali(jy: number, jm: number, jd: number): string {
  return `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`;
}

/** Parse YYYY/MM/DD or YYYY-MM-DD */
export function parseJalali(value: string | null | undefined): { jy: number; jm: number; jd: number } | null {
  if (!value) return null;
  const m = String(value).trim().match(/^(\d{3,4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (!m) return null;
  const jy = Number(m[1]);
  const jm = Number(m[2]);
  const jd = Number(m[3]);
  if (!isValidJalaliDate(jy, jm, jd)) return null;
  return { jy, jm, jd };
}

export function isValidJalaliDate(jy: number, jm: number, jd: number): boolean {
  if (!Number.isInteger(jy) || !Number.isInteger(jm) || !Number.isInteger(jd)) return false;
  if (jy < 1200 || jy > 1500) return false;
  if (jm < 1 || jm > 12) return false;
  if (jd < 1 || jd > jalaliMonthLength(jy, jm)) return false;
  return true;
}

export function formatJalaliDisplay(value: string | null | undefined): string {
  const p = parseJalali(value);
  if (!p) return value?.trim() || "—";
  return `${p.jd} ${FA_MONTHS_FULL[p.jm - 1]} ${p.jy}`;
}

/** Weekday for Jalali date: 0=شنبه … 6=جمعه */
export function jalaliWeekday(jy: number, jm: number, jd: number): number | null {
  const iso = jalaliToGregorianIso(jy, jm, jd);
  if (!iso) return null;
  const dow = new Date(`${iso}T12:00:00.000Z`).getUTCDay(); // 0=Sun
  return (dow + 1) % 7;
}

export function shiftJalaliMonth(jy: number, jm: number, delta: number): { jy: number; jm: number } {
  const total = jy * 12 + (jm - 1) + delta;
  return { jy: Math.floor(total / 12), jm: (total % 12) + 1 };
}

export const FA_WEEKDAYS_SHORT = ["ش", "ی", "د", "س", "چ", "پ", "ج"] as const;
