"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { MarketingContent, MarketingScreenshot } from "@/lib/marketing/types";
import "../marketing.css";

type AdminContent = Omit<MarketingContent, "recaptchaSecretKey"> & {
  recaptchaSecretKey?: string;
  hasRecaptchaSecret?: boolean;
};

const FIELD_GROUPS: {
  id: string;
  title: string;
  fields: { key: keyof MarketingContent; label: string; type?: "text" | "textarea" | "password" }[];
}[] = [
  {
    id: "hero",
    title: "هیرو",
    fields: [
      { key: "heroEyebrow", label: "برچسب بالای عنوان" },
      { key: "heroTitle", label: "عنوان اصلی" },
      { key: "heroSubtitle", label: "توضیح کوتاه", type: "textarea" },
      { key: "primaryCtaText", label: "متن دکمه اصلی" },
      { key: "primaryCtaHref", label: "لینک دکمه اصلی" },
      { key: "secondaryCtaText", label: "متن دکمه ثانویه" },
      { key: "secondaryCtaHref", label: "لینک دکمه ثانویه" },
    ],
  },
  {
    id: "about",
    title: "معرفی",
    fields: [
      { key: "aboutTitle", label: "عنوان معرفی" },
      { key: "aboutBody", label: "متن معرفی", type: "textarea" },
      { key: "aboutProductTitle", label: "عنوان کارت محصول" },
      { key: "aboutProductBody", label: "متن کارت محصول", type: "textarea" },
      { key: "aboutAudienceTitle", label: "عنوان مخاطبان" },
      { key: "aboutAudienceBody", label: "متن مخاطبان", type: "textarea" },
    ],
  },
  {
    id: "seo",
    title: "سئو و شبکه‌های اجتماعی",
    fields: [
      { key: "seoTitle", label: "Title" },
      { key: "seoDescription", label: "Meta Description", type: "textarea" },
      { key: "seoKeywords", label: "Keywords" },
      { key: "ogTitle", label: "OG Title" },
      { key: "ogDescription", label: "OG Description", type: "textarea" },
      { key: "twitterTitle", label: "Twitter Title" },
      { key: "twitterDescription", label: "Twitter Description", type: "textarea" },
      { key: "siteUrl", label: "Canonical / Site URL" },
    ],
  },
  {
    id: "brand",
    title: "برند",
    fields: [
      { key: "brandName", label: "نام برند" },
      { key: "screenshotsTitle", label: "عنوان بخش اسکرین‌شات" },
      { key: "screenshotsSubtitle", label: "توضیح بخش اسکرین‌شات", type: "textarea" },
      { key: "screensCtaTitle", label: "عنوان CTA اسکرین‌شات" },
      { key: "screensCtaBody", label: "متن CTA اسکرین‌شات", type: "textarea" },
    ],
  },
  {
    id: "cta",
    title: "CTA نهایی و فوتر",
    fields: [
      { key: "finalCtaTitle", label: "عنوان CTA نهایی" },
      { key: "finalCtaSubtitle", label: "توضیح CTA نهایی", type: "textarea" },
      { key: "finalCtaPrimaryText", label: "متن دکمه اصلی نهایی" },
      { key: "finalCtaSecondaryText", label: "متن دکمه ثانویه نهایی" },
      { key: "footerTagline", label: "شعار فوتر", type: "textarea" },
      { key: "footerDeveloperName", label: "نام توسعه‌دهنده" },
      { key: "footerDeveloperUrl", label: "لینک توسعه‌دهنده" },
      { key: "footerCopyright", label: "کپی‌رایت" },
    ],
  },
  {
    id: "contact",
    title: "تماس و کلیدها",
    fields: [
      { key: "contactTitle", label: "عنوان تماس" },
      { key: "contactLead", label: "متن معرفی تماس", type: "textarea" },
      { key: "contactEmail", label: "ایمیل" },
      { key: "contactPhone", label: "تلفن" },
      { key: "contactWhatsapp", label: "واتساپ" },
      { key: "contactAddress", label: "آدرس", type: "textarea" },
      { key: "googleSiteVerification", label: "Google Search Console Verification" },
      { key: "recaptchaSiteKey", label: "reCAPTCHA Site Key" },
      { key: "recaptchaSecretKey", label: "reCAPTCHA Secret Key", type: "password" },
    ],
  },
];

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "textarea" | "password";
}) {
  return (
    <label className="block space-y-1.5 text-sm font-bold">
      <span>{label}</span>
      {type === "textarea" ? (
        <textarea className="m-textarea" value={value} onChange={(e) => onChange(e.target.value)} rows={4} />
      ) : (
        <input
          className="m-input"
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          dir="auto"
        />
      )}
    </label>
  );
}

function ImageUploadCard({
  label,
  hint,
  value,
  slot,
  uploading,
  onUploadStart,
  onUploaded,
  onUploadEnd,
  onClear,
}: {
  label: string;
  hint?: string;
  value: string;
  slot: string;
  uploading: boolean;
  onUploadStart: () => void;
  onUploaded: (url: string) => void;
  onUploadEnd: () => void;
  onClear?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  async function onPick(file: File | null) {
    setError("");
    if (!file) return;
    onUploadStart();
    const form = new FormData();
    form.append("file", file);
    form.append("slot", slot);
    try {
      const res = await fetch("/api/marketing/upload", { method: "POST", body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const map: Record<string, string> = {
          unauthorized: "نشست منقضی شده؛ دوباره وارد شوید.",
          file_too_large: "حجم فایل حداکثر ۱٫۵ مگابایت باشد.",
          invalid_type: "فقط PNG، JPG، WebP، SVG یا ICO مجاز است.",
          save_failed: "ذخیره فایل روی سرور ناموفق بود.",
        };
        setError(map[data.error] || "آپلود ناموفق بود.");
        return;
      }
      onUploaded(String(data.url));
    } catch {
      setError("خطا در ارتباط با سرور.");
    } finally {
      onUploadEnd();
    }
  }

  return (
    <div className="m-upload-card">
      <div className="m-upload-preview">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={label} />
        ) : (
          <span className="m-upload-empty">بدون تصویر</span>
        )}
      </div>
      <div className="m-upload-meta">
        <p className="m-upload-label">{label}</p>
        {hint && <p className="m-upload-hint">{hint}</p>}
        {value && (
          <p className="m-upload-path" dir="ltr" title={value}>
            {value}
          </p>
        )}
        <div className="m-upload-actions">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,.ico"
            className="sr-only"
            onChange={(e) => {
              void onPick(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="m-btn m-btn-primary"
            style={{ padding: "0.55rem 0.95rem" }}
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "در حال آپلود..." : "انتخاب از سیستم"}
          </button>
          {onClear && value && (
            <button
              type="button"
              className="m-btn m-btn-secondary"
              style={{ padding: "0.55rem 0.95rem" }}
              onClick={onClear}
            >
              حذف
            </button>
          )}
        </div>
        {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
      </div>
    </div>
  );
}

export function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [content, setContent] = useState<AdminContent | null>(null);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [tab, setTab] = useState(FIELD_GROUPS[0].id);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const load = useCallback(async () => {
    setChecking(true);
    try {
      const res = await fetch("/api/marketing/admin");
      if (res.status === 401) {
        setAuthed(false);
        setContent(null);
        return;
      }
      const data = await res.json();
      if (data.ok) {
        setAuthed(true);
        setContent(data.content);
        setJsonText(JSON.stringify(data.content, null, 2));
      }
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function login(e: FormEvent) {
    e.preventDefault();
    setStatus("");
    const res = await fetch("/api/marketing/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "login", password }),
    });
    if (!res.ok) {
      setStatus("رمز عبور نادرست است.");
      return;
    }
    setPassword("");
    await load();
  }

  async function logout() {
    await fetch("/api/marketing/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    setAuthed(false);
    setContent(null);
  }

  async function save(patch: Partial<MarketingContent>) {
    setSaving(true);
    setStatus("");
    try {
      const res = await fetch("/api/marketing/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", content: patch }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("ذخیره ناموفق بود.");
        return;
      }
      setContent(data.content);
      setJsonText(JSON.stringify(data.content, null, 2));
      setStatus("تغییرات ذخیره شد.");
    } finally {
      setSaving(false);
    }
  }

  async function saveForm() {
    if (!content) return;
    await save(content as Partial<MarketingContent>);
  }

  async function saveJson() {
    try {
      const parsed = JSON.parse(jsonText) as Partial<MarketingContent>;
      await save(parsed);
      setJsonMode(false);
    } catch {
      setStatus("JSON نامعتبر است.");
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPasswordStatus("");
    if (newPassword.length < 8) {
      setPasswordStatus("رمز جدید باید حداقل ۸ کاراکتر باشد.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordStatus("تکرار رمز جدید مطابقت ندارد.");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch("/api/marketing/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "change-password",
          currentPassword,
          newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || data.error === "invalid_password") {
        setPasswordStatus("رمز فعلی نادرست است.");
        return;
      }
      if (data.error === "weak_password") {
        setPasswordStatus("رمز جدید باید حداقل ۸ کاراکتر باشد.");
        return;
      }
      if (data.error === "same_password") {
        setPasswordStatus("رمز جدید نباید با رمز فعلی یکسان باشد.");
        return;
      }
      if (!res.ok || !data.ok) {
        setPasswordStatus("تغییر رمز ناموفق بود.");
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordStatus("رمز عبور پنل با موفقیت تغییر کرد.");
    } finally {
      setChangingPassword(false);
    }
  }

  const activeGroup = useMemo(() => FIELD_GROUPS.find((g) => g.id === tab) || FIELD_GROUPS[0], [tab]);

  const navItems = useMemo(
    () => [
      ...FIELD_GROUPS,
      { id: "images", title: "لوگو و تصاویر" },
      { id: "security", title: "امنیت و رمز عبور" },
      { id: "lists", title: "لیست‌ها (FAQ / امکانات / ...)" },
    ],
    [],
  );

  if (checking) {
    return (
      <div className="marketing-root grid min-h-screen place-items-center">
        <p className="text-[var(--m-muted)] font-bold">در حال بارگذاری...</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="marketing-root grid min-h-screen place-items-center p-4">
        <form onSubmit={login} className="m-glass-strong m-card w-full max-w-md space-y-4">
          <h1 className="text-xl font-black">مدیریت محتوای مهرنگار</h1>
          <p className="text-sm text-[var(--m-muted)]">
            برای ویرایش لندینگ، با رمز ادمین وارد شوید. پس از ورود می‌توانید رمز را از داخل پنل تغییر دهید.
          </p>
          <Field label="رمز عبور" value={password} onChange={setPassword} type="password" />
          <button className="m-btn m-btn-primary w-full" type="submit">
            ورود
          </button>
          {status && <p className="text-sm font-semibold text-rose-600">{status}</p>}
        </form>
      </div>
    );
  }

  if (!content) return null;

  function updateScreenshot(index: number, patch: Partial<MarketingScreenshot>) {
    setContent((prev) => {
      if (!prev) return prev;
      const screenshots = [...(prev.screenshots || [])];
      screenshots[index] = { ...screenshots[index], ...patch };
      return { ...prev, screenshots };
    });
  }

  function addScreenshot() {
    setContent((prev) => {
      if (!prev) return prev;
      const id = `shot-${Date.now()}`;
      return {
        ...prev,
        screenshots: [
          ...(prev.screenshots || []),
          { id, src: "", alt: "", caption: "اسکرین‌شات جدید" },
        ],
      };
    });
  }

  function removeScreenshot(index: number) {
    setContent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        screenshots: (prev.screenshots || []).filter((_, i) => i !== index),
      };
    });
  }

  return (
    <div className="marketing-root min-h-screen">
      <header className="m-nav">
        <div className="m-container m-nav-inner">
          <div>
            <p className="text-xs font-bold text-[var(--m-brand)]">CMS</p>
            <h1 className="text-lg font-black">مدیریت لندینگ مهرنگار</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href="/" className="m-btn m-btn-secondary" style={{ padding: "0.55rem 0.9rem" }}>
              مشاهده سایت
            </a>
            <button
              type="button"
              className="m-btn m-btn-secondary"
              style={{ padding: "0.55rem 0.9rem" }}
              onClick={() => setJsonMode((v) => !v)}
            >
              {jsonMode ? "حالت فرم" : "ویرایش JSON"}
            </button>
            <button type="button" className="m-btn m-btn-secondary" style={{ padding: "0.55rem 0.9rem" }} onClick={logout}>
              خروج
            </button>
          </div>
        </div>
      </header>

      <div className="m-container py-8">
        {status && (
          <p className="mb-4 text-sm font-bold text-teal-700" role="status">
            {status}
          </p>
        )}

        {jsonMode ? (
          <div className="space-y-3">
            <textarea
              className="m-textarea min-h-[70vh] font-mono text-xs"
              dir="ltr"
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
            />
            <button className="m-btn m-btn-primary" type="button" disabled={saving} onClick={saveJson}>
              {saving ? "در حال ذخیره..." : "ذخیره JSON"}
            </button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
            <aside className="m-glass m-card h-fit space-y-1 p-2">
              {navItems.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setTab(g.id)}
                  className={`w-full rounded-xl px-3 py-2 text-right text-sm font-bold transition ${
                    tab === g.id ? "bg-[rgba(91,77,255,0.12)] text-[var(--m-brand)]" : "text-[var(--m-muted)]"
                  }`}
                >
                  {g.title}
                </button>
              ))}
            </aside>

            <section className="m-glass-strong m-card space-y-4">
              {tab === "security" ? (
                <form className="space-y-4" onSubmit={changePassword}>
                  <h2 className="text-lg font-black">تغییر رمز ورود به پنل</h2>
                  <p className="text-sm leading-7 text-[var(--m-muted)]">
                    رمز جدید جایگزین رمز فعلی می‌شود و برای ورود بعدی به{" "}
                    <code dir="ltr">/admin</code> استفاده خواهد شد. حداقل ۸ کاراکتر وارد کنید.
                  </p>
                  <Field
                    label="رمز فعلی"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    type="password"
                  />
                  <Field label="رمز جدید" value={newPassword} onChange={setNewPassword} type="password" />
                  <Field
                    label="تکرار رمز جدید"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    type="password"
                  />
                  <button className="m-btn m-btn-primary" type="submit" disabled={changingPassword}>
                    {changingPassword ? "در حال ذخیره..." : "ذخیره رمز جدید"}
                  </button>
                  {passwordStatus && (
                    <p
                      className={`text-sm font-bold ${
                        passwordStatus.includes("موفق") ? "text-teal-700" : "text-rose-600"
                      }`}
                      role="status"
                    >
                      {passwordStatus}
                    </p>
                  )}
                </form>
              ) : tab === "images" ? (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-black">لوگو، فاویکن و تصاویر سایت</h2>
                    <p className="mt-2 text-sm leading-7 text-[var(--m-muted)]">
                      با دکمه «انتخاب از سیستم» تصویر را از رایانه خود آپلود کنید. پس از آپلود، حتماً «ذخیره
                      تغییرات» را بزنید تا در سایت اعمال شود.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-base font-black">برند</h3>
                    <ImageUploadCard
                      label="لوگوی سایت"
                      hint="هدر، فوتر و هویت بصری لندینگ"
                      value={content.logoUrl}
                      slot="logo"
                      uploading={uploadingSlot === "logo"}
                      onUploadStart={() => setUploadingSlot("logo")}
                      onUploadEnd={() => setUploadingSlot(null)}
                      onUploaded={(url) => {
                        setContent((prev) => (prev ? { ...prev, logoUrl: url } : prev));
                        setStatus("لوگو آپلود شد — ذخیره تغییرات را بزنید.");
                      }}
                    />
                    <ImageUploadCard
                      label="فاویکن"
                      hint="آیکون تب مرورگر (ترجیحاً مربع، PNG یا ICO)"
                      value={content.faviconUrl}
                      slot="favicon"
                      uploading={uploadingSlot === "favicon"}
                      onUploadStart={() => setUploadingSlot("favicon")}
                      onUploadEnd={() => setUploadingSlot(null)}
                      onUploaded={(url) => {
                        setContent((prev) => (prev ? { ...prev, faviconUrl: url } : prev));
                        setStatus("فاویکن آپلود شد — ذخیره تغییرات را بزنید.");
                      }}
                    />
                    <ImageUploadCard
                      label="تصویر اشتراک‌گذاری (OG)"
                      hint="پیش‌نمایش لینک در شبکه‌های اجتماعی"
                      value={content.ogImageUrl}
                      slot="og"
                      uploading={uploadingSlot === "og"}
                      onUploadStart={() => setUploadingSlot("og")}
                      onUploadEnd={() => setUploadingSlot(null)}
                      onUploaded={(url) => {
                        setContent((prev) => (prev ? { ...prev, ogImageUrl: url } : prev));
                        setStatus("تصویر OG آپلود شد — ذخیره تغییرات را بزنید.");
                      }}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-base font-black">اسکرین‌شات‌ها و هیرو</h3>
                      <button
                        type="button"
                        className="m-btn m-btn-secondary"
                        style={{ padding: "0.55rem 0.95rem" }}
                        onClick={addScreenshot}
                      >
                        افزودن تصویر
                      </button>
                    </div>
                    <p className="text-sm text-[var(--m-muted)]">
                      تصویر اول به‌عنوان نمایش هیرو استفاده می‌شود.
                    </p>
                    {(content.screenshots || []).map((shot, index) => (
                      <div key={shot.id || index} className="space-y-3 rounded-2xl border border-[var(--m-line)] p-4">
                        <ImageUploadCard
                          label={index === 0 ? `تصویر هیرو / اسکرین‌شات ${index + 1}` : `اسکرین‌شات ${index + 1}`}
                          hint={shot.caption || undefined}
                          value={shot.src}
                          slot={`shot-${shot.id || index}`}
                          uploading={uploadingSlot === `shot-${shot.id || index}`}
                          onUploadStart={() => setUploadingSlot(`shot-${shot.id || index}`)}
                          onUploadEnd={() => setUploadingSlot(null)}
                          onUploaded={(url) => {
                            updateScreenshot(index, { src: url });
                            setStatus("تصویر آپلود شد — ذخیره تغییرات را بزنید.");
                          }}
                          onClear={() => removeScreenshot(index)}
                        />
                        <div className="grid gap-3 md:grid-cols-2">
                          <Field
                            label="عنوان زیر تصویر"
                            value={shot.caption}
                            onChange={(v) => updateScreenshot(index, { caption: v })}
                          />
                          <Field
                            label="متن جایگزین (alt)"
                            value={shot.alt}
                            onChange={(v) => updateScreenshot(index, { alt: v })}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : tab === "lists" ? (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--m-muted)]">
                    برای ویرایش آرایه‌ها (امکانات، مزایا، FAQ و ...) از حالت JSON استفاده کنید تا ساختار حفظ شود.
                    تصاویر اسکرین‌شات را از بخش «لوگو و تصاویر» آپلود کنید.
                  </p>
                  <button type="button" className="m-btn m-btn-secondary" onClick={() => setJsonMode(true)}>
                    باز کردن ویرایشگر JSON
                  </button>
                  <div className="grid gap-3 md:grid-cols-2 text-sm">
                    <p>امکانات: {content.features?.length || 0}</p>
                    <p>مزایا: {content.benefits?.length || 0}</p>
                    <p>FAQ: {content.faqs?.length || 0}</p>
                    <p>اسکرین‌شات: {content.screenshots?.length || 0}</p>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-lg font-black">{activeGroup.title}</h2>
                  <div className="grid gap-4">
                    {activeGroup.fields.map((f) => (
                      <Field
                        key={String(f.key)}
                        label={f.label}
                        type={f.type}
                        value={String(content[f.key] ?? "")}
                        onChange={(v) => setContent({ ...content, [f.key]: v })}
                      />
                    ))}
                    {tab === "hero" && (
                      <Field
                        label="نکات کلیدی هیرو (هر خط یک مورد)"
                        type="textarea"
                        value={(content.heroHighlights || []).join("\n")}
                        onChange={(v) =>
                          setContent({
                            ...content,
                            heroHighlights: v
                              .split("\n")
                              .map((line) => line.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    )}
                  </div>
                </>
              )}

              {tab !== "lists" && tab !== "security" && (
                <button className="m-btn m-btn-primary" type="button" disabled={saving} onClick={saveForm}>
                  {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
                </button>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
