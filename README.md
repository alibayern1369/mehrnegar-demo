# مهرنگار — نسخه Demo

نسخه **مستقل و کامل** از نرم‌افزار حسابداری مهرنگار برای نمایش و تست.  
UI/UX تا حد ممکن 1:1 با پروژه اصلی است؛ Backend، Authentication و SMS کاملاً Mock هستند.

**نیازی به PostgreSQL، env variable یا سرویس خارجی نیست.**

---

## اجرای سریع

```bash
cd mehrnegar-demo
npm install
npm run dev
```

مرورگر: [http://localhost:3000](http://localhost:3000)

---

## حساب‌های Demo

| نقش | نام کاربری | رمز |
|-----|------------|-----|
| مدیر | `mehrnegaradmin` | `Admin@1234` |
| فروشنده | `mehrnegaruser` | `User@1234` |

### ورود

- **ورود سریع:** دکمه‌های روی صفحه Login
- **OTP:** پس از وارد کردن موبایل/نام کاربری و رمز → کد **`12345`** (بدون SMS واقعی)

---

## قابلیت‌ها

- Dashboard، محصولات، ثبت فروش، فاکتور، مرجوعی
- مشتریان، انبارها، انبارگردانی، توزیع
- گزارش‌ها (مالی، فروش، موجودی، ...)
- کاربران، تنظیمات، پیامک (Mock)
- RTL فارسی، Dark/Light، Responsive

---

## معماری Demo

```
src/
├── mock/          # In-memory store + seed data + inventory logic
├── components/    # UI (1:1 with main app)
├── app/api/       # Mock API routes
└── lib/           # Utilities (format, jalali, permissions, ...)
```

- داده‌ها در **حافظه** نگه‌داری می‌شوند (با restart سرور reset می‌شوند)
- هیچ Request واقعی به SMS، OTP یا Payment ارسال نمی‌شود

---

## تفاوت با پروژه اصلی

| | اصلی | Demo |
|---|------|------|
| Database | PostgreSQL | In-memory |
| SMS/OTP | Melipayamak | Mock |
| Deploy | نیاز به DB | فقط `npm run dev` |
| Reset data | فعال | غیرفعال (پیام Demo) |

---

## Build برای Production

```bash
npm run build
npm start
```

---

## دیپلoy روی Vercel

1. ریپو را به [Vercel](https://vercel.com) Import کنید (`alibayern1369/mehrnegar-demo`).
2. Framework: **Next.js** (خودکار تشخیص داده می‌شود).
3. **Environment Variables لازم نیست** — backend در حافظه است.
4. Deploy.

بعد از دیپلoy، URL عمومی (مثلاً `https://mehrnegar-demo.vercel.app`) را در README showcase قرار دهید.

> **نکته:** روی Vercel هر cold start داده in-memory از نو seed می‌شود؛ برای دمو عادی است.

---

## لایسنس

Demo — فقط برای نمایش. سورس کامل پروژه اصلی جداگانه است.
