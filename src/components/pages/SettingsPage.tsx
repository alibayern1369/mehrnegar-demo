"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Glass, SectionTitle, Btn, Toggle, Field, Input, Select, Modal } from "../ui";
import { I } from "../icons";
import { useApp } from "../context";
import { SmsSettingsPanel } from "./SmsSettingsPanel";
import { AppBrand } from "../AppBrand";
import { APP_VERSION_FA, DEFAULT_DEVELOPER_NAME, DEFAULT_DEVELOPER_URL } from "@/lib/version";
import { SOCIAL_NETWORKS, type SocialNetworkId } from "@/lib/social-networks";
import { RESET_CONFIRM_PHRASE } from "@/lib/reset-constants";

type InvSettings = {
  businessName?: string;
  businessLogo?: string | null;
  address?: string;
  phone?: string;
  website?: string;
  socialNetwork?: string | null;
  socialUrl?: string | null;
  taxId?: string;
  invoiceTitle?: string;
  invoicePrefix?: string;
  footerText?: string;
  returnPolicy?: string;
};

type DeviceStatus = "checking" | "ok" | "warn" | "error";

type DeviceCard = {
  id: string;
  title: string;
  status: DeviceStatus;
  detail: string;
  hint: string;
};

function statusTone(s: DeviceStatus) {
  if (s === "ok") return "bg-emerald-500";
  if (s === "warn") return "bg-amber-500";
  if (s === "error") return "bg-rose-500";
  return "bg-slate-400 animate-pulse";
}

function statusLabel(s: DeviceStatus) {
  if (s === "ok") return "متصل / آماده";
  if (s === "warn") return "نیاز به بررسی";
  if (s === "error") return "مشکل";
  return "در حال شناسایی...";
}

export function SettingsPage() {
  const { toast, theme, toggleTheme, token, branding, setBranding, user, refreshSession } = useApp();
  const [tab, setTab] = useState("branding");
  const [settings, setSettings] = useState<InvSettings>({});
  const [appName, setAppName] = useState(branding.appName);
  const [appLogo, setAppLogo] = useState<string | null>(branding.appLogo);
  const [developerUrl, setDeveloperUrl] = useState(branding.developerUrl || DEFAULT_DEVELOPER_URL);
  const [setupLoginPath, setSetupLoginPath] = useState<string | null>(null);
  const [setupBusy, setSetupBusy] = useState(false);
  const [origin, setOrigin] = useState("");
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedReport, setSeedReport] = useState<string>("");
  const [backingUp, setBackingUp] = useState(false);
  const [purgingTest, setPurgingTest] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetConfirm2, setResetConfirm2] = useState("");
  const [resetting, setResetting] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [devices, setDevices] = useState<DeviceCard[]>([]);
  const [scanTest, setScanTest] = useState("");
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  const scanBuf = useRef({ chars: "", t: 0 });

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/demo")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.ok && d.demo) setDemoMode(true);
      })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    fetch("/api/invoice-settings").then(r => r.json()).then(d => d.ok && d.settings && setSettings(d.settings));
  }, []);

  useEffect(() => {
    setAppName(branding.appName);
    setAppLogo(branding.appLogo);
    setDeveloperUrl(branding.developerUrl || DEFAULT_DEVELOPER_URL);
  }, [branding]);

  useEffect(() => {
    if (!token) return;
    fetch("/api/app-settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.settings?.setupLoginPath) setSetupLoginPath(d.settings.setupLoginPath);
        if (d.ok && d.settings?.developerUrl) setDeveloperUrl(d.settings.developerUrl);
      })
      .catch(() => {});
  }, [token]);

  const detectDevices = useCallback(async () => {
    const cards: DeviceCard[] = [];

    // Barcode scanner (HID keyboard wedge)
    const recent = lastScanAt && Date.now() - lastScanAt < 60_000;
    if (recent) {
      cards.push({
        id: "scanner",
        title: "اسکنر بارکد",
        status: "ok",
        detail: "اسکن اخیر شناسایی شد — دستگاه به صورت کیبورد متصل است",
        hint: "اسکنرهای USB معمولاً مثل کیبورد عمل می‌کنند و نیازی به درایور جدا ندارند.",
      });
    } else {
      cards.push({
        id: "scanner",
        title: "اسکنر بارکد",
        status: "warn",
        detail: "هنوز اسکنی شناسایی نشده",
        hint: "کابل USB را وصل کنید، فیلد تست پایین را فوکوس کنید و یک بارکد اسکن کنید. اگر کار نکرد: حالت کیبورد (HID) را در تنظیمات اسکنر فعال کنید و زبان صفحه‌کلید را انگلیسی بگذارید.",
      });
    }

    // Invoice printer via browser print
    try {
      if (typeof window.print === "function") {
        let usbPrinters = 0;
        const nav = navigator as Navigator & { usb?: { getDevices: () => Promise<{ deviceClass: number }[]> } };
        if (nav.usb?.getDevices) {
          try {
            const list = await nav.usb.getDevices();
            usbPrinters = list.filter((d) => d.deviceClass === 7).length;
          } catch { /* permission */ }
        }
        cards.push({
          id: "invoice-printer",
          title: "پرینتر چاپ فاکتور",
          status: usbPrinters > 0 ? "ok" : "warn",
          detail: usbPrinters > 0
            ? `${usbPrinters} پرینتر USB شناسایی شد — چاپ از طریق مرورگر آماده است`
            : "چاپ مرورگر در دسترس است؛ پرینتر USB اختصاصی شناسایی نشد",
          hint: usbPrinters > 0
            ? "در دیالوگ چاپ، پرینتر حرارتی ۸۰mm را انتخاب کنید."
            : "پرینتر را روشن و به USB وصل کنید. در ویندوز درایور را نصب کنید. سپس «چاپ آزمایشی فاکتور» را بزنید و پرینتر را از لیست انتخاب کنید. اگر دیالوگ چاپ باز نشد، پاپ‌آپ مرورگر را اجازه دهید.",
        });
      } else {
        cards.push({
          id: "invoice-printer",
          title: "پرینتر چاپ فاکتور",
          status: "error",
          detail: "مرورگر از چاپ پشتیبانی نمی‌کند",
          hint: "از Chrome یا Edge روی دسکتاپ استفاده کنید.",
        });
      }
    } catch {
      cards.push({
        id: "invoice-printer",
        title: "پرینتر چاپ فاکتور",
        status: "error",
        detail: "خطا در بررسی پرینتر",
        hint: "صفحه را رفرش کنید و دوباره تلاش کنید.",
      });
    }

    // Label printer — same print stack; separate card for UX
    cards.push({
      id: "label-printer",
      title: "پرینتر چاپ لیبل",
      status: typeof window.print === "function" ? "warn" : "error",
      detail: typeof window.print === "function"
        ? "آماده چاپ از طریق مرورگر — پرینتر لیبل را در دیالوگ چاپ انتخاب کنید"
        : "چاپ در این مرورگر در دسترس نیست",
      hint: "کاغذ لیبل را در پرینتر بگذارید، اندازه برچسب را در تنظیمات چاپ درست کنید، سپس از صفحه محصولات «چاپ برچسب» را بزنید. اگر لیبل خالی است، مقیاس چاپ را روی ۱۰۰٪ بگذارید و حاشیه را Minimal کنید.",
    });

    setDevices(cards);
  }, [lastScanAt]);

  useEffect(() => {
    if (tab === "devices") detectDevices();
  }, [tab, detectDevices]);

  // Global rapid-keystroke detection for wedge scanners
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = Date.now();
      const gap = t - scanBuf.current.t;
      if (gap > 80) scanBuf.current.chars = "";
      scanBuf.current.t = t;
      if (e.key.length === 1) scanBuf.current.chars += e.key;
      if (e.key === "Enter" && scanBuf.current.chars.length >= 6) {
        setLastScanAt(Date.now());
        setScanTest(scanBuf.current.chars);
        scanBuf.current.chars = "";
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const saveInvoice = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/invoice-settings", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(settings),
      });
      const d = await res.json();
      d.ok ? toast("تنظیمات فاکتور ذخیره شد") : toast(d.error ?? "خطا", "error");
    } catch { toast("خطا در ذخیره", "error"); }
    finally { setSaving(false); }
  };

  const saveBranding = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/app-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ appName, appLogo, developerUrl }),
      });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا", "error"); return; }
      setBranding({
        appName: d.settings.appName,
        appLogo: d.settings.appLogo,
        developerUrl: d.settings.developerUrl || DEFAULT_DEVELOPER_URL,
      });
      if (d.settings.setupLoginPath) setSetupLoginPath(d.settings.setupLoginPath);
      toast("لوگوی نرم‌افزار ذخیره شد");
    } catch { toast("خطا در ذخیره", "error"); }
    finally { setSaving(false); }
  };

  const regenerateSetupLink = async () => {
    setSetupBusy(true);
    try {
      const res = await fetch("/api/app-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "regenerate_setup_token" }),
      });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا", "error"); return; }
      setSetupLoginPath(d.settings.setupLoginPath ?? null);
      toast("لینک راه‌اندازی تازه‌سازی شد");
    } catch { toast("خطا در تازه‌سازی لینک", "error"); }
    finally { setSetupBusy(false); }
  };

  const copySetupLink = async () => {
    if (!setupLoginPath) return;
    const full = `${origin || window.location.origin}${setupLoginPath}`;
    try {
      await navigator.clipboard.writeText(full);
      toast("لینک کپی شد");
    } catch {
      toast(full, "info");
    }
  };

  const onAppLogoPick = (file: File | null) => {
    if (!file) return;
    const okType = ["image/png", "image/svg+xml", "image/jpeg", "image/webp"].includes(file.type)
      || /\.(png|svg|jpe?g|webp)$/i.test(file.name);
    if (!okType) { toast("فقط فایل PNG یا SVG (یا JPG/WebP) مجاز است", "error"); return; }
    if (file.size > 800_000) { toast("حجم لوگو حداکثر ۸۰۰ کیلوبایت باشد", "error"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      if (!dataUrl.startsWith("data:image/")) { toast("فایل تصویر نامعتبر است", "error"); return; }
      setAppLogo(dataUrl);
      toast("لوگو آماده ذخیره است — روی ذخیره بزنید");
    };
    reader.readAsDataURL(file);
  };

  const onBusinessLogoPick = (file: File | null) => {
    if (!file) return;
    const okType = ["image/png", "image/svg+xml", "image/jpeg", "image/webp"].includes(file.type)
      || /\.(png|svg|jpe?g|webp)$/i.test(file.name);
    if (!okType) { toast("فقط فایل PNG یا SVG (یا JPG/WebP) مجاز است", "error"); return; }
    if (file.size > 800_000) { toast("حجم لوگو حداکثر ۸۰۰ کیلوبایت باشد", "error"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      if (!dataUrl.startsWith("data:image/")) { toast("فایل تصویر نامعتبر است", "error"); return; }
      setSettings((s) => ({ ...s, businessLogo: dataUrl }));
      toast("لوگوی فروشگاه آماده ذخیره است — روی ذخیره بزنید");
    };
    reader.readAsDataURL(file);
  };

  const testInvoicePrint = () => {
    const w = window.open("", "_blank", "width=420,height=640");
    if (!w) {
      toast("پاپ‌آپ مسدود شد — اجازه پاپ‌آپ بدهید", "error");
      setDevices((prev) => prev.map((d) => d.id === "invoice-printer"
        ? { ...d, status: "error", detail: "پاپ‌آپ چاپ مسدود است", hint: "در نوار آدرس مرورگر روی آیکون پاپ‌آپ کلیک کنید و اجازه دهید." }
        : d));
      return;
    }
    w.document.write(`<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><title>تست چاپ فاکتور</title>
      <style>body{font-family:Tahoma,sans-serif;padding:16px;text-align:center} .box{border:1px dashed #333;padding:24px;margin-top:20px}</style></head>
      <body><h2>تست پرینتر فاکتور</h2><div class="box"><p>${appName || "مهرنگار"}</p><p>اگر این صفحه چاپ شد، پرینتر درست وصل است.</p></div></body></html>`);
    w.document.close();
    setTimeout(() => {
      try {
        w.print();
        setDevices((prev) => prev.map((d) => d.id === "invoice-printer"
          ? { ...d, status: "ok", detail: "دیالوگ چاپ باز شد — پرینتر را انتخاب و چاپ کنید" }
          : d));
        toast("دیالوگ چاپ باز شد");
      } catch {
        toast("خطا در چاپ", "error");
      }
    }, 300);
  };

  const testLabelPrint = () => {
    const w = window.open("", "_blank", "width=400,height=400");
    if (!w) {
      toast("پاپ‌آپ مسدود شد", "error");
      return;
    }
    w.document.write(`<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><title>تست لیبل</title>
      <style>
        @page{size:92mm 30mm;margin:0}
        *{box-sizing:border-box}
        body{font-family:Tahoma;margin:0;width:92mm;height:30mm;display:flex;padding:0 0.5mm;gap:1mm}
        .l{border:1px solid #000;width:45mm;height:30mm;display:grid;place-items:center;font-size:11px;text-align:center}
      </style></head>
      <body>
        <div class="l"><div><b>تست لیبل ۱</b><br/>${appName || "مهرنگار"}</div></div>
        <div class="l"><div><b>تست لیبل ۲</b><br/>دو ستونه ۴۵×۳۰</div></div>
      </body></html>`);
    w.document.close();
    setTimeout(() => {
      w.print();
      setDevices((prev) => prev.map((d) => d.id === "label-printer"
        ? { ...d, status: "ok", detail: "دیالوگ چاپ لیبل باز شد" }
        : d));
      toast("دیالوگ چاپ لیبل باز شد");
    }, 300);
  };

  const loadTestData = async () => {
    setSeeding(true);
    setSeedReport("");
    try {
      const res = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا در ساخت داده تست", "error"); setSeedReport(JSON.stringify(d, null, 2)); return; }
      const v = d.verification;
      toast(d.alreadySeeded ? "داده تست از قبل موجود بود" : "داده تست با موفقیت ساخته شد");
      setSeedReport(JSON.stringify({
        alreadySeeded: d.alreadySeeded,
        summary: d.summary,
        verification: v,
      }, null, 2));
      if (v && !v.ok) toast("هشدار: بررسی صحت مشکل دارد", "error");
    } catch { toast("خطا در اتصال", "error"); }
    finally { setSeeding(false); }
  };

  const verifyData = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا", "error"); return; }
      setSeedReport(JSON.stringify(d.verification, null, 2));
      toast(d.verification?.ok ? "صحت موجودی و بارکد تأیید شد" : "ناسازگاری پیدا شد", d.verification?.ok ? "info" : "error");
    } catch { toast("خطا", "error"); }
    finally { setSeeding(false); }
  };

  const purgeTestProducts = async () => {
    if (!confirm("آیا مطمئن هستید؟\nهمه محصولات تست (SKU با پیشوند TST-) به‌طور کامل حذف می‌شوند.")) return;
    setPurgingTest(true);
    try {
      const res = await fetch("/api/products?test=1", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا در حذف", "error"); return; }
      toast(d.deleted ? `${d.deleted} محصول تست حذف شد` : "محصول تستی یافت نشد");
      setSeedReport(JSON.stringify({ deletedTestProducts: d.deleted, products: d.products }, null, 2));
    } catch { toast("خطا در اتصال", "error"); }
    finally { setPurgingTest(false); }
  };

  const downloadBackup = async () => {
    setBackingUp(true);
    try {
      const res = await fetch("/api/backup", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast(d.error ?? "خطا در پشتیبان‌گیری", "error");
        return;
      }
      const blob = await res.blob();
      const disp = res.headers.get("Content-Disposition") ?? "";
      const match = /filename="?([^"]+)"?/i.exec(disp);
      const filename = match?.[1] || `mehrnegar-backup-${Date.now()}.json`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("فایل پشتیبان دانلود شد");
    } catch { toast("خطا در اتصال", "error"); }
    finally { setBackingUp(false); }
  };

  const openResetModal = () => {
    setResetStep(1);
    setResetConfirm("");
    setResetConfirm2("");
    setResetOpen(true);
  };

  const goResetStep2 = () => {
    if (resetConfirm.trim() !== RESET_CONFIRM_PHRASE) {
      toast(`عبارت «${RESET_CONFIRM_PHRASE}» را دقیقاً وارد کنید`, "error");
      return;
    }
    setResetStep(2);
  };

  const runFullReset = async () => {
    if (resetConfirm.trim() !== RESET_CONFIRM_PHRASE || resetConfirm2.trim() !== RESET_CONFIRM_PHRASE) {
      toast(`عبارت «${RESET_CONFIRM_PHRASE}» را در هر دو مرحله وارد کنید`, "error");
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/reset-data", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirm: resetConfirm.trim(),
          confirm2: resetConfirm2.trim(),
        }),
      });
      const d = await res.json();
      if (!d.ok) {
        toast(d.error ?? "خطا در ریست", "error");
        return;
      }
      setResetOpen(false);
      setResetStep(1);
      setResetConfirm("");
      setResetConfirm2("");
      setSeedReport("");
      toast(d.message ?? "نرم‌افزار صفر شد");
    } catch {
      toast("خطا در اتصال", "error");
    } finally {
      setResetting(false);
    }
  };

  const tabs = [
    { id: "branding",   label: "لوگوی نرم‌افزار",   icon: <I.tag width={15} /> },
    { id: "invoice",    label: "تنظیمات فاکتور",   icon: <I.printer width={15} /> },
    { id: "devices",    label: "سخت‌افزار",         icon: <I.scan width={15} /> },
    { id: "sms",        label: "پیامک ملی‌پیامک",   icon: <I.bell width={15} /> },
    { id: "appearance", label: "ظاهر برنامه",       icon: <I.sun width={15} /> },
    { id: "system",     label: "سیستم",             icon: <I.database width={15} /> },
  ];

  const f = (k: keyof InvSettings) => ({ value: settings[k] ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSettings({ ...settings, [k]: e.target.value }) });

  return (
    <div>
      <SectionTitle icon={<I.settings />} title="تنظیمات سامانه" sub="پیکربندی اختصاصی مدیران" />

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`press inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${tab === t.id ? "grad-brand text-white" : "glass-2 text-muted hover:text-strong"}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === "branding" && (
        <Glass className="p-6 space-y-5">
          <div>
            <h3 className="mb-1 font-bold text-strong">برندینگ نرم‌افزار حسابداری</h3>
            <p className="text-xs text-muted leading-6">
              این لوگو در سایدبار، صفحه ورود، فاویکن مرورگر و سراسر سامانه نمایش داده می‌شود — نه روی فاکتور فروشگاه.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-3xl border border-white/15 bg-white/80 p-2">
              {appLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={appLogo} alt="لوگو" className="max-h-full max-w-full object-contain" />
              ) : (
                <span className="text-3xl font-black text-brand-500">{(appName || "م").charAt(0)}</span>
              )}
            </div>
            <div className="space-y-3">
              <AppBrand logo={appLogo} name={appName || "مهرنگار"} sizeClass="h-10 w-10" subtitle="پیش‌نمایش سایدبار" />
              <AppBrand logo={appLogo} name={appName || "مهرنگار"} sizeClass="h-14 w-14" textClass="text-xl" subtitle="پیش‌نمایش ورود" />
              <div className="flex flex-wrap gap-2">
                <label className="press inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-brand-500/12 px-4 py-2.5 text-sm font-semibold text-brand-600 dark:text-brand-300 hover:bg-brand-500/20">
                  <I.upload width={16} /> انتخاب لوگو / فاویکن
                  <input
                    type="file"
                    accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => onAppLogoPick(e.target.files?.[0] ?? null)}
                  />
                </label>
                {appLogo && (
                  <Btn variant="ghost" onClick={() => setAppLogo(null)}>حذف لوگو</Btn>
                )}
              </div>
              <p className="text-[11px] text-muted">PNG مربعی (حداقل ۱۸۰×۱۸۰) برای آیکون Home Screen آیفون توصیه می‌شود — حداکثر ۸۰۰KB — بعد از ذخیره، آیکون قبلی را از Home Screen حذف و دوباره Add to Home Screen کنید</p>
            </div>
          </div>
          <Field label="نام نرم‌افزار">
            <Input value={appName} onChange={(e) => setAppName(e.target.value)} placeholder="مهرنگار" />
          </Field>
          <Field label={`لینک ${DEFAULT_DEVELOPER_NAME}`}>
            <Input
              value={developerUrl}
              onChange={(e) => setDeveloperUrl(e.target.value)}
              placeholder={DEFAULT_DEVELOPER_URL}
              dir="ltr"
            />
          </Field>
          <p className="text-[11px] text-muted -mt-2">این لینک در صفحه ورود زیر «طراحی و توسعه» نمایش داده می‌شود.</p>
          <div className="flex justify-end">
            <Btn onClick={saveBranding} disabled={saving}>
              {saving ? <I.refresh className="anim-spin-slow" /> : <I.check width={16} />} ذخیره برندینگ
            </Btn>
          </div>
        </Glass>
      )}

      {tab === "invoice" && (
        <Glass className="p-6">
          <h3 className="mb-1 font-bold text-strong">اطلاعات نمایش فروشگاه</h3>
          <p className="mb-4 text-xs text-muted">
            نام و مشخصات روی فاکتور حرارتی چاپ می‌شود. لوگوی فروشگاه روی حواله انبار / برگه تحویل (A4) نمایش داده می‌شود و سایز چاپ فاکتور و لیبل را تغییر نمی‌دهد.
          </p>

          <div className="mb-5 rounded-2xl glass-2 p-4">
            <p className="mb-3 text-sm font-bold text-strong">لوگوی فروشگاه</p>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                {settings.businessLogo ? (
                  <img src={settings.businessLogo} alt="لوگوی فروشگاه" className="max-h-full max-w-full object-contain" />
                ) : (
                  <span className="text-2xl font-black text-muted">{(settings.businessName || "ف").charAt(0)}</span>
                )}
              </div>
              <div className="space-y-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-500/15 px-3 py-2 text-sm font-semibold text-brand-300 hover:bg-brand-500/25">
                  <I.upload width={16} /> انتخاب لوگوی فروشگاه
                  <input
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg,image/webp,.png,.svg,.jpg,.jpeg,.webp"
                    className="hidden"
                    onChange={(e) => onBusinessLogoPick(e.target.files?.[0] ?? null)}
                  />
                </label>
                {settings.businessLogo && (
                  <div>
                    <Btn variant="ghost" onClick={() => setSettings({ ...settings, businessLogo: null })}>
                      حذف لوگوی فروشگاه
                    </Btn>
                  </div>
                )}
                <p className="text-[11px] text-muted">PNG / SVG / JPG — حداکثر ۸۰۰KB — فقط برای حواله و اسناد A4</p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نام فروشگاه"><Input {...f("businessName")} placeholder="کامفی فیتس" /></Field>
            <Field label="عنوان فاکتور"><Input {...f("invoiceTitle")} placeholder="فاکتور فروش" /></Field>
            <Field label="پیشوند شماره فاکتور"><Input {...f("invoicePrefix")} placeholder="CF" dir="ltr" /></Field>
            <Field label="شماره تلفن"><Input {...f("phone")} placeholder="021-..." dir="ltr" /></Field>
            <Field label="آدرس"><Input {...f("address")} placeholder="آدرس فروشگاه" /></Field>
            <Field label="وب‌سایت"><Input {...f("website")} placeholder="comfyfits.ir" dir="ltr" /></Field>
            <Field label="شبکه اجتماعی">
              <Select
                value={settings.socialNetwork || ""}
                onChange={(e) => setSettings({
                  ...settings,
                  socialNetwork: (e.target.value || null) as SocialNetworkId | null,
                })}
              >
                <option value="">انتخاب کنید...</option>
                {SOCIAL_NETWORKS.map((n) => (
                  <option key={n.id} value={n.id}>{n.label}</option>
                ))}
              </Select>
            </Field>
            <Field label="آدرس شبکه اجتماعی">
              <Input
                value={settings.socialUrl ?? ""}
                onChange={(e) => setSettings({ ...settings, socialUrl: e.target.value })}
                placeholder={
                  SOCIAL_NETWORKS.find((n) => n.id === settings.socialNetwork)?.placeholder
                  ?? "آدرس یا آیدی شبکه اجتماعی"
                }
                dir="ltr"
                disabled={!settings.socialNetwork}
              />
            </Field>
            <Field label="شناسه مالیاتی"><Input {...f("taxId")} dir="ltr" /></Field>
            <Field label="متن پاورقی"><Input {...f("footerText")} placeholder="از خرید شما متشکریم" /></Field>
            <Field label="شرایط مرجوعی" className="sm:col-span-2"><Input {...f("returnPolicy")} placeholder="کالا تا ۷ روز قابل مرجوع است" /></Field>
          </div>
          <div className="mt-5 flex justify-end">
            <Btn onClick={saveInvoice} disabled={saving}>
              {saving ? <I.refresh className="anim-spin-slow" /> : <I.check width={16} />} ذخیره تنظیمات فاکتور
            </Btn>
          </div>
        </Glass>
      )}

      {tab === "devices" && (
        <div className="space-y-4">
          <Glass className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-strong">شناسایی سخت‌افزار</h3>
                <p className="text-xs text-muted">وضعیت اسکنر و پرینترها به‌صورت خودکار بررسی می‌شود</p>
              </div>
              <Btn variant="soft" onClick={() => detectDevices()}><I.refresh width={14} /> بررسی مجدد</Btn>
            </div>
            <div className="space-y-3">
              {devices.map((d) => (
                <div key={d.id} className="rounded-2xl glass-2 p-4">
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${statusTone(d.status)}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-bold text-strong">{d.title}</p>
                        <span className="text-[11px] text-muted">{statusLabel(d.status)}</span>
                      </div>
                      <p className="mt-1 text-sm text-strong">{d.detail}</p>
                      {(d.status === "warn" || d.status === "error") && (
                        <p className="mt-2 text-xs leading-6 text-amber-600 dark:text-amber-300">{d.hint}</p>
                      )}
                      {d.status === "ok" && (
                        <p className="mt-2 text-xs leading-6 text-muted">{d.hint}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {!devices.length && (
                <p className="py-8 text-center text-muted">در حال شناسایی...</p>
              )}
            </div>
          </Glass>

          <Glass className="p-5 space-y-4">
            <h3 className="font-bold text-strong">تست اسکنر بارکد</h3>
            <p className="text-xs text-muted">این فیلد را انتخاب کنید و یک بارکد اسکن کنید — اگر مقدار پر شد، اسکنر درست کار می‌کند.</p>
            <Input
              value={scanTest}
              onChange={(e) => {
                setScanTest(e.target.value);
                if (e.target.value.length >= 6) setLastScanAt(Date.now());
              }}
              dir="ltr"
              placeholder="بارکد را اینجا اسکن کنید..."
              className="font-mono"
            />
            <div className="flex flex-wrap gap-2">
              <Btn variant="soft" onClick={testInvoicePrint}><I.printer width={14} /> چاپ آزمایشی فاکتور</Btn>
              <Btn variant="soft" onClick={testLabelPrint}><I.tag width={14} /> چاپ آزمایشی لیبل</Btn>
            </div>
          </Glass>
        </div>
      )}

      {tab === "sms" && <SmsSettingsPanel />}

      {tab === "appearance" && (
        <Glass className="p-6 space-y-4">
          <h3 className="font-bold text-strong">ظاهر برنامه</h3>
          <div className="flex items-center justify-between rounded-2xl glass-2 px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-strong">
              {theme === "dark" ? <I.moon width={18} /> : <I.sun width={18} />} حالت {theme === "dark" ? "تیره" : "روشن"}
            </span>
            <Toggle on={theme === "dark"} onChange={toggleTheme} />
          </div>
        </Glass>
      )}

      {tab === "system" && (
        <Glass className="p-6 space-y-4">
          <h3 className="font-bold text-strong">اطلاعات سیستم</h3>
          {[["نسخه", APP_VERSION_FA], ["پایگاه داده", "PostgreSQL"], ["وضعیت", "سالم"], ["طراحی و توسعه", DEFAULT_DEVELOPER_NAME]].map(([l, v]) => (
            <div key={l} className="flex justify-between rounded-2xl glass-2 px-4 py-3 text-sm">
              <span className="text-muted">{l}</span><span className="font-bold text-strong">{v}</span>
            </div>
          ))}

          <div className="rounded-2xl border border-brand-500/25 bg-brand-500/10 p-4 space-y-3">
            <h4 className="font-bold text-strong text-sm">لینک مخفی ورود راه‌اندازی</h4>
            <p className="text-xs text-muted leading-6">
              تب ورود با یوزر/پسورد فقط از طریق این لینک باز می‌شود. لینک را خصوصی نگه دارید؛ با تازه‌سازی، لینک قبلی باطل می‌شود.
            </p>
            <div className="rounded-xl bg-black/25 px-3 py-2 font-mono text-[11px] text-left dir-ltr text-brand-200 break-all">
              {setupLoginPath
                ? `${origin}${setupLoginPath}`
                : "در حال بارگذاری..."}
            </div>
            <div className="flex flex-wrap gap-2">
              <Btn variant="soft" onClick={copySetupLink} disabled={!setupLoginPath}>
                <I.check width={14} /> کپی لینک
              </Btn>
              <Btn onClick={regenerateSetupLink} disabled={setupBusy}>
                {setupBusy ? <I.refresh className="anim-spin-slow" /> : <I.refresh width={14} />}
                تازه‌سازی لینک
              </Btn>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 space-y-3">
            <h4 className="font-bold text-strong text-sm">داده تست داخل سامانه</h4>
            <p className="text-xs text-muted leading-6">
              ۱۰ محصول پوشاک با چند رنگ/سایز (شامل فری‌سایز)، صدها بارکد یکتا، دریافت به مرکزی،
              توزیع به سجاد/هاشمیه/بجنورد، انتقال بین شعب، فروش با دسترسی کانال، مرجوعی به مرکزی، فاکتور و اسناد انبار.
            </p>
            {demoMode && (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                در نسخه دمو حذف انبوه محصولات تست و صفر کردن نرم‌افزار قفل است.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Btn onClick={loadTestData} disabled={seeding || purgingTest}>
                {seeding ? <I.refresh className="anim-spin-slow" /> : <I.database width={16} />}
                {seeding ? "در حال ساخت..." : "ساخت داده تست کامل"}
              </Btn>
              <Btn variant="soft" onClick={verifyData} disabled={seeding || purgingTest}>
                <I.shield width={16} /> بررسی صحت موجودی/بارکد
              </Btn>
              <Btn variant="danger" onClick={purgeTestProducts} disabled={demoMode || seeding || purgingTest}>
                {purgingTest ? <I.refresh className="anim-spin-slow" /> : <I.trash width={16} />}
                {purgingTest ? "در حال حذف..." : "حذف همه محصولات تست"}
              </Btn>
            </div>
            {seedReport && (
              <pre className="mt-2 max-h-64 overflow-auto rounded-xl bg-black/30 p-3 text-[11px] text-left dir-ltr text-emerald-200 whitespace-pre-wrap">
                {seedReport}
              </pre>
            )}
          </div>

          <Btn variant="soft" onClick={downloadBackup} disabled={backingUp || resetting}>
            {backingUp ? <I.refresh className="anim-spin-slow" width={16} /> : <I.download width={16} />}
            {backingUp ? "در حال آماده‌سازی..." : "دانلود پشتیبان محصولات و تنظیمات"}
          </Btn>

          {user?.isBootstrap && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-3">
              <h4 className="font-bold text-rose-600 dark:text-rose-300 text-sm">صفر کردن نرم‌افزار</h4>
              <p className="text-xs text-muted leading-6">
                همه داده‌های عملیاتی پاک می‌شود: محصولات، موجودی، فاکتورها، مرجوعی‌ها، مشتریان، پیامک‌ها و گزارش‌ها.
                تنظیمات فاکتور/پیامک/برندینگ، کاربران و انبارها حفظ می‌مانند. این کار برگشت‌پذیر نیست —
                قبل از ادامه حتماً پشتیبان بگیرید. فقط کاربر راه‌اندازی به این بخش دسترسی دارد.
              </p>
              <Btn variant="danger" onClick={openResetModal} disabled={demoMode || resetting || seeding || purgingTest}>
                <I.trash width={16} /> {demoMode ? "در دمو غیرفعال است" : "صفر کردن و شروع از اول"}
              </Btn>
            </div>
          )}
        </Glass>
      )}

      <Modal
        open={resetOpen}
        onClose={() => {
          if (!resetting) {
            setResetOpen(false);
            setResetStep(1);
            setResetConfirm("");
            setResetConfirm2("");
          }
        }}
        title={resetStep === 1 ? "تأیید اول — صفر کردن" : "تأیید دوم — قفل نهایی"}
      >
        <div className="space-y-4">
          {resetStep === 1 ? (
            <>
              <p className="text-sm text-muted leading-7">
                مرحله ۱ از ۲: با ادامه، همه محصولات، موجودی، فروش‌ها، مرجوعی‌ها، مشتریان و تاریخچه گزارش‌ها حذف می‌شوند.
                تنظیمات، کاربران و انبارها باقی می‌مانند.
              </p>
              <Field label={`عبارت «${RESET_CONFIRM_PHRASE}» را تایپ کنید`}>
                <Input
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  placeholder={RESET_CONFIRM_PHRASE}
                  disabled={resetting}
                  autoComplete="off"
                />
              </Field>
              <div className="flex flex-wrap justify-end gap-2">
                <Btn
                  variant="ghost"
                  disabled={resetting}
                  onClick={() => {
                    setResetOpen(false);
                    setResetStep(1);
                    setResetConfirm("");
                    setResetConfirm2("");
                  }}
                >
                  انصراف
                </Btn>
                <Btn
                  variant="danger"
                  disabled={resetting || resetConfirm.trim() !== RESET_CONFIRM_PHRASE}
                  onClick={goResetStep2}
                >
                  ادامه به تأیید دوم
                </Btn>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-rose-600 dark:text-rose-300 leading-7 font-semibold">
                مرحله ۲ از ۲: این آخرین فرصت انصراف است. پس از تأیید، داده‌ها برای همیشه پاک می‌شوند.
              </p>
              <Field label={`دوباره عبارت «${RESET_CONFIRM_PHRASE}» را تایپ کنید`}>
                <Input
                  value={resetConfirm2}
                  onChange={(e) => setResetConfirm2(e.target.value)}
                  placeholder={RESET_CONFIRM_PHRASE}
                  disabled={resetting}
                  autoComplete="off"
                />
              </Field>
              <div className="flex flex-wrap justify-end gap-2">
                <Btn
                  variant="ghost"
                  disabled={resetting}
                  onClick={() => {
                    setResetStep(1);
                    setResetConfirm2("");
                  }}
                >
                  بازگشت
                </Btn>
                <Btn
                  variant="danger"
                  disabled={resetting || resetConfirm2.trim() !== RESET_CONFIRM_PHRASE}
                  onClick={runFullReset}
                >
                  {resetting ? <I.refresh className="anim-spin-slow" width={16} /> : <I.trash width={16} />}
                  {resetting ? "در حال پاک‌سازی..." : "بله، همه را پاک کن"}
                </Btn>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
