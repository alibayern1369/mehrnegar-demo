import { DEMO_ACCOUNTS } from "@/lib/demo";

export const dynamic = "force-dynamic";

/** Public demo metadata for login UI / portfolio deploy. */
export async function GET() {
  return Response.json({
    ok: true,
    demo: true,
    title: "نسخه دمو مهرنگار",
    note: "داده آزمایشی است. سورس کامل خصوصی است؛ این محیط فقط برای نمایش رزومه است.",
    accounts: DEMO_ACCOUNTS.map((a) => ({
      username: a.username,
      password: a.password,
      label: a.label,
      role: a.role,
    })),
    tips: [
      "ورود سریع دمو بدون پیامک واقعی کار می‌کند",
      "ارسال پیامک واقعی و صفر کردن داده‌ها در دمو قفل است",
      "برای فروش و گزارش‌ها با حساب مدیر وارد شوید",
    ],
  });
}
