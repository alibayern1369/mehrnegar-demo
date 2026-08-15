import Link from "next/link";
import type { MarketingContent } from "@/lib/marketing/types";
import { MarketingIcon } from "./MarketingIcon";
import { MarketingHeader } from "./MarketingHeader";
import { ContactForm, RecaptchaScript } from "./ContactForm";
import "./marketing.css";

type Props = { content: MarketingContent };

export function LandingPage({ content: c }: Props) {
  const heroShot = c.screenshots[0];

  return (
    <div className="marketing-root">
      <RecaptchaScript siteKey={c.recaptchaSiteKey} />

      <MarketingHeader
        brandName={c.brandName}
        logoUrl={c.logoUrl}
        primaryCtaHref={c.primaryCtaHref}
        primaryCtaText={c.primaryCtaText}
      />

      <main>
        <section className="m-hero" aria-labelledby="hero-title">
          <div className="m-hero-stage" aria-hidden>
            <span className="m-hero-orb m-hero-orb-a" />
            <span className="m-hero-orb m-hero-orb-b" />
            <span className="m-hero-orb m-hero-orb-c" />
            <span className="m-hero-grid-lines" />
          </div>

          <div className="m-container m-hero-grid">
            <div className="m-hero-copy-col">
              <p className="m-hero-brand m-reveal" style={{ ["--m-delay" as string]: "0ms" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.logoUrl} alt="" width={48} height={48} />
                <span>{c.brandName}</span>
              </p>
              <p className="m-hero-eyebrow m-reveal" style={{ ["--m-delay" as string]: "80ms" }}>
                {c.heroEyebrow}
              </p>
              <h1 id="hero-title" className="m-reveal" style={{ ["--m-delay" as string]: "160ms" }}>
                {c.heroTitle}
              </h1>
              <p className="m-hero-copy m-reveal" style={{ ["--m-delay" as string]: "240ms" }}>
                {c.heroSubtitle}
              </p>
              {c.heroHighlights?.length > 0 && (
                <ul className="m-hero-points">
                  {c.heroHighlights.map((item, i) => (
                    <li
                      key={item}
                      className="m-reveal"
                      style={{ ["--m-delay" as string]: `${320 + i * 70}ms` }}
                    >
                      <span className="m-hero-check" aria-hidden>
                        <MarketingIcon name="check" className="h-3 w-3" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              <div
                className="m-cta-row m-reveal"
                style={{ ["--m-delay" as string]: `${320 + (c.heroHighlights?.length || 0) * 70 + 40}ms` }}
              >
                <Link href={c.primaryCtaHref} className="m-btn m-btn-primary">
                  {c.primaryCtaText}
                </Link>
                <a href={c.secondaryCtaHref} className="m-btn m-btn-secondary">
                  {c.secondaryCtaText}
                </a>
              </div>
            </div>

            <div
              className="m-hero-visual m-reveal"
              style={{ ["--m-delay" as string]: "220ms" }}
            >
              <div className="m-hero-visual-glow" aria-hidden />
              <div className="m-device m-device-float">
                <div className="m-device-bar" aria-hidden>
                  <span className="m-device-dot" />
                  <span className="m-device-dot" />
                  <span className="m-device-dot" />
                  <span className="mr-auto text-[11px] font-bold text-[var(--m-muted)]">
                    {c.brandName}
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
          <div className="m-container m-section-head">
            <p className="m-kicker">معرفی محصول</p>
            <h2 className="m-title">{c.aboutTitle}</h2>
            <p className="m-lead">{c.aboutBody}</p>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <article className="m-glass m-card m-prose-card">
                <h3>{c.aboutProductTitle}</h3>
                <p>{c.aboutProductBody}</p>
              </article>
              <article className="m-glass m-card m-prose-card">
                <h3>{c.aboutAudienceTitle}</h3>
                <p>{c.aboutAudienceBody}</p>
              </article>
            </div>
          </div>
        </section>

        <section id="screens" className="m-section m-section-tight">
          <div className="m-container m-section-head">
            <p className="m-kicker">نمایش محصول</p>
            <h2 className="m-title">{c.screenshotsTitle}</h2>
            <p className="m-lead">{c.screenshotsSubtitle}</p>
            <div className="m-shot-grid mt-8">
              {c.screenshots.map((shot) => (
                <figure key={shot.id} className="m-glass m-card relative overflow-hidden p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={shot.src}
                    alt={shot.alt}
                    loading="lazy"
                    decoding="async"
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
                <div className="m-prose-card">
                  <h3>{c.screensCtaTitle}</h3>
                  <p className="max-w-2xl">{c.screensCtaBody}</p>
                </div>
                <Link href={c.primaryCtaHref} className="m-btn m-btn-primary shrink-0 self-start md:self-center">
                  {c.primaryCtaText}
                </Link>
              </aside>
            </div>
          </div>
        </section>

        <section id="features" className="m-section">
          <div className="m-container m-section-head">
            <p className="m-kicker">قابلیت‌ها</p>
            <h2 className="m-title">{c.featuresTitle}</h2>
            <p className="m-lead">{c.featuresSubtitle}</p>
            <div className="m-grid-3 mt-8">
              {c.features.map((f) => (
                <article
                  key={f.id}
                  className={`m-glass m-card m-prose-card${f.id === "reports" || f.id === "custom" ? " m-card-featured" : ""}`}
                >
                  <div className={`m-icon${f.id === "reports" || f.id === "custom" ? " m-icon-accent" : ""}`}>
                    <MarketingIcon name={f.icon} />
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="why" className="m-section m-section-tight">
          <div className="m-container m-section-head">
            <p className="m-kicker">مزیت رقابتی</p>
            <h2 className="m-title">{c.benefitsTitle}</h2>
            <p className="m-lead">{c.benefitsSubtitle}</p>
            <div className="m-grid-3 mt-8">
              {c.benefits.map((b) => (
                <article
                  key={b.id}
                  className={`m-glass m-card m-prose-card${b.id === "reporting" || b.id === "custom" ? " m-card-featured" : ""}`}
                >
                  <h3>{b.title}</h3>
                  <p>{b.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="m-section">
          <div className="m-container m-section-head">
            <p className="m-kicker">مسیر شروع</p>
            <h2 className="m-title">{c.howTitle}</h2>
            <p className="m-lead">{c.howSubtitle}</p>
            <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {c.steps.map((step, i) => (
                <li key={step.id} className="m-glass m-card m-prose-card list-none">
                  <span className="text-xs font-black text-[var(--m-brand)]">گام {i + 1}</span>
                  <h3 className="mt-2">{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="audience" className="m-section m-section-tight">
          <div className="m-container m-section-head">
            <p className="m-kicker">مخاطبان</p>
            <h2 className="m-title">{c.audienceTitle}</h2>
            <p className="m-lead">{c.audienceSubtitle}</p>
            <div className="m-grid-3 mt-8">
              {c.audiences.map((a) => (
                <article key={a.id} className="m-glass m-card m-prose-card">
                  <h3>{a.title}</h3>
                  <p>{a.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="m-section m-faq">
          <div className="m-container m-section-head">
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

        <section className="m-section m-section-tight">
          <div className="m-container">
            <div className="m-glass-strong m-card m-final-cta">
              <h2 className="m-title" style={{ marginTop: 0 }}>
                {c.finalCtaTitle}
              </h2>
              <p className="m-final-cta-lead">{c.finalCtaSubtitle}</p>
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
            <div className="m-section-head">
              <p className="m-kicker">ارتباط</p>
              <h2 className="m-title">{c.contactTitle}</h2>
              <p className="m-lead">{c.contactLead}</p>
              <ul className="m-contact-list">
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
          <div className="m-footer-meta" dir="ltr">
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
