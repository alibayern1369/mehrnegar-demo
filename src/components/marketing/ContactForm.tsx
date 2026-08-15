"use client";

import { useState, type FormEvent } from "react";
import type { MarketingContent } from "@/lib/marketing/types";

type Props = {
  siteKey: string;
  contactTitle: string;
};

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

async function getRecaptchaToken(siteKey: string): Promise<string | undefined> {
  if (!siteKey || !window.grecaptcha) return undefined;
  return new Promise((resolve) => {
    window.grecaptcha!.ready(() => {
      window
        .grecaptcha!.execute(siteKey, { action: "contact" })
        .then(resolve)
        .catch(() => resolve(undefined));
    });
  });
}

export function ContactForm({ siteKey, contactTitle }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [feedback, setFeedback] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setFeedback("");
    try {
      const recaptchaToken = await getRecaptchaToken(siteKey);
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, message, recaptchaToken }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setStatus("err");
        setFeedback(data.error || "ارسال ناموفق بود.");
        return;
      }
      setStatus("ok");
      setFeedback(data.message || "ثبت شد.");
      setName("");
      setPhone("");
      setEmail("");
      setMessage("");
    } catch {
      setStatus("err");
      setFeedback("خطا در ارتباط با سرور.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="m-glass-strong m-card space-y-3" aria-label={contactTitle}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm font-bold">
          <span>نام</span>
          <input
            className="m-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            placeholder="نام شما"
          />
        </label>
        <label className="block space-y-1.5 text-sm font-bold">
          <span>شماره تماس</span>
          <input
            className="m-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="09xxxxxxxxx"
            dir="ltr"
          />
        </label>
      </div>
      <label className="block space-y-1.5 text-sm font-bold">
        <span>ایمیل (اختیاری)</span>
        <input
          className="m-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="you@example.com"
          dir="ltr"
        />
      </label>
      <label className="block space-y-1.5 text-sm font-bold">
        <span>پیام</span>
        <textarea
          className="m-textarea"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          placeholder="درباره نیاز کسب‌وکارتان بنویسید..."
        />
      </label>
      <button className="m-btn m-btn-primary w-full sm:w-auto" type="submit" disabled={status === "loading"}>
        {status === "loading" ? "در حال ارسال..." : "ارسال درخواست مشاوره"}
      </button>
      {feedback && (
        <p className={`text-sm font-semibold ${status === "ok" ? "text-teal-700" : "text-rose-600"}`}>
          {feedback}
        </p>
      )}
    </form>
  );
}

import Script from "next/script";

export function RecaptchaScript({ siteKey }: { siteKey: string }) {
  if (!siteKey) return null;
  return (
    <Script
      src={`https://www.google.com/recaptcha/api.js?render=${siteKey}`}
      strategy="lazyOnload"
    />
  );
}

export type { MarketingContent };
