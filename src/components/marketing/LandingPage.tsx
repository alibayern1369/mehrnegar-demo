import Link from "next/link";
import type { MarketingContent } from "@/lib/marketing/types";
import { MarketingIcon } from "./MarketingIcon";
import { ContactForm, RecaptchaScript } from "./ContactForm";
import "./marketing.css";

type Props = { content: MarketingContent };

export function LandingPage({ content: c }: Props) {
  const heroShot = c.screenshots[0];

  return (
    <div className="marketing-root">
      <RecaptchaScript siteKey={c.recaptchaSiteKey} />

      <header className="m-nav">
        <div className="m-container m-nav-inner">
          <Link href="/" className="m-brand-mark" style={{ marginBottom: 0 }} aria-label={`${c.brandName} — صفحه اصلی`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.logoUrl} alt={`لوگوی ${c.brandName}`} width={52} height={52} />
            <span>{c.brandName}</span>
          </Link>
          <nav className="m-nav-links" aria-label="منوی اصلی">
            <a href="#about">معرفی</a>
            <a href="#features">امکانات</a>
            <a href="#screens">نمایش نرم‌افزار</a>
            <a href="#why">مزایا</a>
            <a href="#faq">سوالات</a>
            <a href="#contact">تماس</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href={c.primaryCtaHref} className="m-btn m-btn-primary" style={{ padding: "0.65rem 1rem" }}>
              دمو
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="m-hero m-container" aria-labelledby="hero-title">
          <div className="m-hero-grid">
            <div className="m-reveal">
              <p className="m-kicker">{c.heroEyebrow}</p>
              <div className="m-brand-mark" style={{ marginTop: "1rem" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.logoUrl} alt="" width={56} height={56} aria-hidden />
                <span>{c.brandName}</span>
              </div>
              <h1 id="hero-title">{c.heroTitle}</h1>
              <p className="m-hero-copy">{c.heroSubtitle}</p>
              <div className="m-cta-row">
                <Link href={c.primaryCtaHref} className="m-btn m-btn-primary">
                  {c.primaryCtaText}
                </Link>
                <a href={c.secondaryCtaHref} className="m-btn m-btn-secondary">
                  {c.secondaryCtaText}
                </a>
              </div>
            </div>

            <div className="m-hero-visual m-reveal" style={{ animationDelay: "0.12s" }}>
              {heroShot?.demoLabel && <span className="m-demo-badge">{heroShot.demoLabel}</span>}
              <div className="m-device m-glass">
                <div className="m-device-bar" aria-hidden>
                  <span className="m-device-dot" />
                  <span className="m-device-dot" />
                  <span className="m-device-dot" />
                  <span className="mr-auto text-[11px] font-bold text-[var(--m-muted)]">
                    {c.brandName} DEMO
                  </span>
                </div>
                {heroShot && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={heroShot.src}
                    alt={heroShot.alt}
                    width={960}
                    height={640}
                    fetchPriority="high"
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="m-section">
          <div className="m-container">
            <p className="m-kicker">معرفی محصول</p>
            <h2 className="m-title">{c.aboutTitle}</h2>
            <p className="m-lead">{c.aboutBody}</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <article className="m-glass m-card">
                <h3 className="text-lg font-black">نرم افزار حسابداری مهرنگار</h3>
                <p className="mt-2 text-[0.98rem] leading-8 text-[var(--m-muted)]">
                  مهرنگار با تمرکز روی حسابداری فروش، مدیریت مشتریان و کنترل موجودی، جایگزین ابزارهای پراکنده می‌شود
                  و تصویر یکپارچه‌ای از کسب‌وکار می‌سازد.
                </p>
              </article>
              <article className="m-glass m-card">
                <h3 className="text-lg font-black">{c.aboutAudienceTitle}</h3>
                <p className="mt-2 text-[0.98rem] leading-8 text-[var(--m-muted)]">{c.aboutAudienceBody}</p>
              </article>
            </div>
          </div>
        </section>

        <section id="screens" className="m-section" style={{ paddingTop: 0 }}>
          <div className="m-container">
            <p className="m-kicker">نمایش محصول</p>
            <h2 className="m-title">{c.screenshotsTitle}</h2>
            <p className="m-lead">{c.screenshotsSubtitle}</p>
            <div className="m-shot-grid mt-8">
              {c.screenshots.map((shot) => (
                <figure key={shot.id} className="m-glass m-card relative overflow-hidden p-3">
                  {shot.demoLabel && <span className="m-demo-badge">{shot.demoLabel}</span>}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shot.src}
                    alt={shot.alt}
                    loading="lazy"
                    className="w-full rounded-xl"
                    width={960}
                    height={640}
                  />
                  <figcaption className="mt-3 text-sm font-bold text-[var(--m-muted)]">
                    {shot.caption}
                  </figcaption>
                </figure>
              ))}
              <aside className="m-glass-strong m-card m-shot-cta flex flex-col justify-center md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black">تجربه زنده نسخه DEMO</h3>
                  <p className="mt-3 text-[0.98rem] leading-8 text-[var(--m-muted)] max-w-2xl">
                    بدون تغییر در هسته نرم‌افزار، می‌توانید محیط واقعی مهرنگار را برای فروش، انبار، مشتریان و گزارش‌ها
                    آزمایش کنید.
                  </p>
                </div>
                <Link href={c.primaryCtaHref} className="m-btn m-btn-primary shrink-0 self-start md:self-center">
                  {c.primaryCtaText}
                </Link>
              </aside>
            </div>
          </div>
        </section>

        <section id="features" className="m-section">
          <div className="m-container">
            <p className="m-kicker">قابلیت‌ها</p>
            <h2 className="m-title">{c.featuresTitle}</h2>
            <p className="m-lead">{c.featuresSubtitle}</p>
            <div className="m-grid-3 mt-8">
              {c.features.map((f) => (
                <article key={f.id} className="m-glass m-card">
                  <div className="m-icon">
                    <MarketingIcon name={f.icon} />
                  </div>
                  <h3 className="text-base font-black">{f.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--m-muted)]">{f.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="why" className="m-section" style={{ paddingTop: 0 }}>
          <div className="m-container">
            <p className="m-kicker">مزیت رقابتی</p>
            <h2 className="m-title">{c.benefitsTitle}</h2>
            <p className="m-lead">{c.benefitsSubtitle}</p>
            <div className="m-grid-3 mt-8">
              {c.benefits.map((b) => (
                <article key={b.id} className="m-glass m-card">
                  <h3 className="text-base font-black">{b.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--m-muted)]">{b.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="m-section">
          <div className="m-container">
            <p className="m-kicker">مسیر شروع</p>
            <h2 className="m-title">{c.howTitle}</h2>
            <p className="m-lead">{c.howSubtitle}</p>
            <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {c.steps.map((step, i) => (
                <li key={step.id} className="m-glass m-card list-none">
                  <span className="text-xs font-black text-[var(--m-brand)]">گام {i + 1}</span>
                  <h3 className="mt-2 text-base font-black">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--m-muted)]">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="audience" className="m-section" style={{ paddingTop: 0 }}>
          <div className="m-container">
            <p className="m-kicker">مخاطبان</p>
            <h2 className="m-title">{c.audienceTitle}</h2>
            <p className="m-lead">{c.audienceSubtitle}</p>
            <div className="m-grid-3 mt-8">
              {c.audiences.map((a) => (
                <article key={a.id} className="m-glass m-card">
                  <h3 className="text-base font-black">{a.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--m-muted)]">{a.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="m-section m-faq">
          <div className="m-container">
            <p className="m-kicker">پشتیبانی محتوایی</p>
            <h2 className="m-title">{c.faqTitle}</h2>
            <p className="m-lead">{c.faqSubtitle}</p>
            <div className="mt-8 max-w-3xl">
              {c.faqs.map((faq) => (
                <details key={faq.id} className="m-glass">
                  <summary>{faq.question}</summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="m-section" style={{ paddingTop: 0 }}>
          <div className="m-container">
            <div className="m-glass-strong m-card px-6 py-10 text-center md:px-10">
              <h2 className="m-title" style={{ marginTop: 0 }}>
                {c.finalCtaTitle}
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-[var(--m-muted)] leading-8">{c.finalCtaSubtitle}</p>
              <div className="m-cta-row justify-center">
                <Link href={c.primaryCtaHref} className="m-btn m-btn-primary">
                  {c.finalCtaPrimaryText}
                </Link>
                <a href="#contact" className="m-btn m-btn-secondary">
                  {c.finalCtaSecondaryText}
                </a>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="m-section">
          <div className="m-container grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="m-kicker">ارتباط</p>
              <h2 className="m-title">{c.contactTitle}</h2>
              <p className="m-lead">
                برای مشاوره، استقرار یا شروع همکاری با تیم مهرنگار در ارتباط باشید.
              </p>
              <ul className="mt-6 space-y-3 text-sm font-semibold text-[var(--m-muted)]">
                {c.contactEmail && (
                  <li>
                    ایمیل:{" "}
                    <a className="text-[var(--m-brand)]" href={`mailto:${c.contactEmail}`}>
                      {c.contactEmail}
                    </a>
                  </li>
                )}
                {c.contactPhone && <li>تلفن: {c.contactPhone}</li>}
                {c.contactWhatsapp && <li>واتساپ: {c.contactWhatsapp}</li>}
                {c.contactAddress && <li>آدرس: {c.contactAddress}</li>}
                <li>
                  طراحی و توسعه:{" "}
                  <a href={c.footerDeveloperUrl} target="_blank" rel="noopener noreferrer">
                    {c.footerDeveloperName}
                  </a>
                </li>
              </ul>
            </div>
            <ContactForm siteKey={c.recaptchaSiteKey} contactTitle={c.contactTitle} />
          </div>
        </section>
      </main>

      <footer className="m-footer">
        <div className="m-container grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="m-brand-mark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.logoUrl} alt={`لوگوی ${c.brandName}`} width={44} height={44} />
              <span>{c.brandName}</span>
            </div>
            <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--m-muted)]">{c.footerTagline}</p>
            <p className="mt-4 text-sm text-[var(--m-muted)]">{c.footerCopyright}</p>
          </div>
          <div className="text-sm leading-8 text-[var(--m-muted)] md:text-left" dir="ltr">
            <p>
              Designed &amp; developed by{" "}
              <a href={c.footerDeveloperUrl} target="_blank" rel="noopener noreferrer">
                {c.footerDeveloperName}
              </a>
            </p>
            <p className="mt-2" dir="rtl">
              <Link href="/demo">دموی نرم‌افزار</Link>
              {" · "}
              <a href="#features">امکانات</a>
              {" · "}
              <a href="#faq">سوالات متداول</a>
              {" · "}
              <Link href="/admin">مدیریت محتوا</Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
