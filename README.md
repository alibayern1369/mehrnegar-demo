# مهرنگار — Marketing + Demo

وب‌سایت معرفی **مهرنگار** (نرم‌افزار حسابداری و مدیریت فروش) به‌همراه نسخه نمایشی نرم‌افزار.

- لندینگ حرفه‌ای فارسی/RTL در مسیر `/`
- دموی نرم‌افزار (بدون تغییر هسته) در مسیر `/demo`
- پنل مدیریت محتوای لندینگ در مسیر `/admin`

## اجرا

```bash
npm install
cp .env.example .env.local
npm run dev
```

- سایت معرفی: [http://localhost:3000](http://localhost:3000)
- دموی نرم‌افزار: [http://localhost:3000/demo](http://localhost:3000/demo)
- ادمین محتوا: [http://localhost:3000/admin](http://localhost:3000/admin)

### حساب‌های ورود دمو

| نقش | نام کاربری | رمز |
|-----|------------|-----|
| مدیر | `mehrnegaradmin` | `Admin@1234` |
| فروشنده | `mehrnegaruser` | `User@1234` |

OTP دمو: `12345`

### ادمین لندینگ

رمز پیش‌فرض توسعه: `mehrnegar-admin`  
از طریق `MARKETING_ADMIN_PASSWORD` در `.env.local` تنظیم کنید.

## متغیرهای محیطی

نگاه کنید به `.env.example`:

- `NEXT_PUBLIC_SITE_URL` — آدرس canonical و sitemap
- `GOOGLE_SITE_VERIFICATION` — تأیید Search Console
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` / `RECAPTCHA_SECRET_KEY`
- `MARKETING_ADMIN_PASSWORD` / `MARKETING_ADMIN_SECRET`

کلیدها را در کد هاردکد نکنید؛ از env یا پنل ادمین استفاده کنید.

## تکنولوژی

- Next.js 16 · React 19 · TypeScript · Tailwind CSS 4
- Backend دمو: in-memory mock (بدون PostgreSQL)

## Build

```bash
npm run build
npm start
```
