/** Melipayamak / Payamak-panel common result codes → Persian messages */
const ERROR_MAP: Record<number, string> = {
  [-10]: "متن پیام حاوی لینک است و ارسال الگویی مجاز نیست",
  [-7]:  "متن حاوی کلمات فیلترشده است",
  [-6]:  "پیام خارج از بازه زمانی مجاز ارسال است",
  [-5]:  "تعداد یا ترتیب متغیرهای الگو با الگوی تأییدشده ناسازگار است",
  [-4]:  "شناسه الگو (bodyId) نامعتبر یا تأییدنشده است",
  [-3]:  "خط ارسال‌کننده معتبر نیست",
  [-2]:  "محدودیت ارسال روزانه/ساعتی",
  [-1]:  "وب‌سرویس غیرفعال است",
  [0]:   "نام کاربری یا رمز عبور اشتباه است",
  [2]:   "اعتبار پنل کافی نیست",
  [6]:   "پیام خالی است",
  [7]:   "زمان ارسال گذشته است",
  [10]:  "کاربر یافت نشد یا غیرفعال است",
  [11]:  "طول پیام بیش از حد مجاز است",
  [12]:  "شماره گیرنده نامعتبر است",
  [13]:  "شماره فرستنده نامعتبر است",
  [14]:  "متن پیام خالی است",
  [15]:  "کاربر مجوز ارسال ندارد",
  [16]:  "حساب کاربری منقضی شده است",
  [35]:  "سیستم در حال به‌روزرسانی است",
  [108]: "آی‌پی سرور در پنل ملی‌پیامک مجاز نیست",
  [109]: "آی‌پی سرور در پنل ملی‌پیامک مجاز نیست",
  [110]: "تعداد درخواست بیش از حد مجاز است",
};

export function melipayamakErrorMessage(code: number | string | null | undefined): string {
  const n = typeof code === "string" ? Number(code.trim()) : Number(code);
  if (!Number.isFinite(n)) return `پاسخ نامعتبر از ملی‌پیامک: ${String(code)}`;
  if (ERROR_MAP[n]) return ERROR_MAP[n];
  if (n > 0) return "ارسال موفق";
  return `خطای ملی‌پیامک (کد ${n})`;
}

/** Positive numeric recId / Value means success for Melipayamak send APIs */
export function isMelipayamakSuccess(value: unknown): boolean {
  if (value == null) return false;
  const s = String(value).trim();
  if (!/^-?\d+$/.test(s)) return false;
  const n = Number(s);
  return Number.isFinite(n) && n > 0;
}
