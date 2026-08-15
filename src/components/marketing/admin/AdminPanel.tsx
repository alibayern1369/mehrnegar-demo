"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { MarketingContent } from "@/lib/marketing/types";
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
      { key: "ogImageUrl", label: "آدرس تصویر OG" },
      { key: "siteUrl", label: "Canonical / Site URL" },
    ],
  },
  {
    id: "brand",
    title: "برند و تصاویر",
    fields: [
      { key: "brandName", label: "نام برند" },
      { key: "logoUrl", label: "آدرس لوگو" },
      { key: "faviconUrl", label: "آدرس Favicon" },
      { key: "screenshotsTitle", label: "عنوان بخش اسکرین‌شات" },
      { key: "screenshotsSubtitle", label: "توضیح بخش اسکرین‌شات", type: "textarea" },
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

  const activeGroup = useMemo(() => FIELD_GROUPS.find((g) => g.id === tab) || FIELD_GROUPS[0], [tab]);

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
            برای ویرایش لندینگ، با رمز ادمین وارد شوید. رمز از متغیر محیطی{" "}
            <code dir="ltr">MARKETING_ADMIN_PASSWORD</code> خوانده می‌شود.
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
              {FIELD_GROUPS.map((g) => (
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
              <button
                type="button"
                onClick={() => setTab("lists")}
                className={`w-full rounded-xl px-3 py-2 text-right text-sm font-bold transition ${
                  tab === "lists" ? "bg-[rgba(91,77,255,0.12)] text-[var(--m-brand)]" : "text-[var(--m-muted)]"
                }`}
              >
                لیست‌ها (FAQ / امکانات / ...)
              </button>
            </aside>

            <section className="m-glass-strong m-card space-y-4">
              {tab === "lists" ? (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--m-muted)]">
                    برای ویرایش آرایه‌ها (امکانات، مزایا، FAQ، اسکرین‌شات‌ها و ...) از حالت JSON استفاده کنید تا ساختار
                    حفظ شود.
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
                  </div>
                </>
              )}

              {tab !== "lists" && (
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
