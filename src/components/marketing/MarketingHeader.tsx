"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NAV = [
  { href: "#about", label: "معرفی" },
  { href: "#features", label: "امکانات" },
  { href: "#screens", label: "نمایش نرم‌افزار" },
  { href: "#why", label: "مزایا" },
  { href: "#faq", label: "سوالات" },
  { href: "#contact", label: "تماس" },
];

type Props = {
  brandName: string;
  logoUrl: string;
  primaryCtaHref: string;
  primaryCtaText: string;
};

export function MarketingHeader({ brandName, logoUrl, primaryCtaHref, primaryCtaText }: Props) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={`m-nav${scrolled ? " is-scrolled" : ""}`}>
      <div className="m-container m-nav-inner">
        <Link href="/" className="m-nav-brand" aria-label={`${brandName} — صفحه اصلی`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoUrl} alt={`لوگوی ${brandName}`} width={40} height={40} />
          <span>
            {brandName}
            <small>نرم‌افزار حسابداری فروشگاهی</small>
          </span>
        </Link>

        <nav className="m-nav-links" aria-label="منوی اصلی">
          {NAV.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="m-nav-actions">
          <a href="#contact" className="m-btn m-btn-ghost m-nav-consult">
            مشاوره
          </a>
          <Link href={primaryCtaHref} className="m-btn m-btn-primary m-nav-cta">
            ورود به دمو
          </Link>
          <button
            type="button"
            className="m-nav-toggle"
            aria-expanded={open}
            aria-controls="m-mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="sr-only">{open ? "بستن منو" : "باز کردن منو"}</span>
            <span aria-hidden>{open ? "✕" : "☰"}</span>
          </button>
        </div>
      </div>

      {open && (
        <div id="m-mobile-nav" className="m-mobile-nav">
          <div className="m-container">
            {NAV.map((item) => (
              <a key={item.href} href={item.href} onClick={() => setOpen(false)}>
                {item.label}
              </a>
            ))}
            <div className="m-mobile-nav-ctas">
              <a href="#contact" className="m-btn m-btn-secondary" onClick={() => setOpen(false)}>
                درخواست مشاوره
              </a>
              <Link href={primaryCtaHref} className="m-btn m-btn-primary" onClick={() => setOpen(false)}>
                {primaryCtaText}
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
