"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "mehrnegar_ios_install_dismissed";

function isIosSafari(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/.test(ua);
  return isIos && isSafari;
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches;
}

/** Guides iPhone users to Add to Home Screen when browsing in Safari. */
export function IosInstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch { /* ignore */ }
    if (isIosSafari() && !isStandalone()) setVisible(true);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] p-3 sm:p-4"
      role="dialog"
      aria-label="نصب برنامه"
    >
      <div
        className="mx-auto flex max-w-lg flex-col gap-3 rounded-2xl px-4 py-3.5 text-white shadow-2xl"
        style={{
          background: "rgba(12,10,28,0.96)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/25 text-brand-300">
            <PhoneInstallIcon />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold leading-6">مهرنگار را نصب کنید</p>
            <p className="mt-1 text-xs leading-6 text-white/65">
              برای دسترسی سریع‌تر مثل یک اپ، از نوار پایین Safari دکمه{" "}
              <span className="inline-flex items-center gap-0.5 font-bold text-brand-300">
                <ShareIcon /> اشتراک‌گذاری
              </span>{" "}
              را بزنید و گزینه{" "}
              <span className="font-bold text-white/90">افزودن به صفحه اصلی</span>
              {" "}(Add to Home Screen) را انتخاب کنید.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 rounded-lg px-2 py-1 text-lg leading-none text-white/45 transition hover:bg-white/10 hover:text-white"
            aria-label="بستن"
          >
            ×
          </button>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="w-full rounded-xl bg-brand-500/20 py-2.5 text-xs font-bold text-brand-200 transition hover:bg-brand-500/30"
        >
          متوجه شدم
        </button>
      </div>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="inline-block align-[-1px]"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M4 14v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5" />
    </svg>
  );
}

function PhoneInstallIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <path d="M12 18h.01" />
      <path d="M12 6v5" />
      <path d="M9.5 9.5 12 12l2.5-2.5" />
    </svg>
  );
}
