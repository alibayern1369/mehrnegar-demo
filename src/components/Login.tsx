"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { I } from "./icons";
import { Btn, Toggle } from "./ui";
import { useApp } from "./context";
import { APP_VERSION_FA } from "@/lib/version";

type Mode = "otp" | "setup";
type OtpStep = 1 | 2 | 3;

type DemoAccountInfo = {
  username: string;
  password: string;
  label: string;
  role: string;
};

type DemoInfo = {
  demo: boolean;
  accounts?: DemoAccountInfo[];
};

export function Login() {
  const { login, toast, branding } = useApp();
  const [mode, setMode] = useState<Mode>("otp");
  const [setupAllowed, setSetupAllowed] = useState(false);
  const [step, setStep] = useState<OtpStep>(1);
  const [demoInfo, setDemoInfo] = useState<DemoInfo | null>(null);

  // OTP flow: identifier → password → OTP
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [codeDigits, setCodeDigits] = useState<string[]>([]);
  const [otpLen, setOtpLen] = useState(5);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [maskedPhone, setMaskedPhone] = useState("");
  const [cooldownLeft, setCooldownLeft] = useState(0);

  // Setup (bypass) flow — only via secret link
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const verifyingRef = useRef(false);
  const lastTriedRef = useRef("");
  const codeBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/demo")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.ok && d.demo) setDemoInfo(d as DemoInfo);
      })
      .catch(() => { /* ignore */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("setup")?.trim() ?? "";
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/auth/setup-access?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!cancelled && data.allowed) {
          setSetupAllowed(true);
          setMode("setup");
        }
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = setInterval(() => {
      setCooldownLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownLeft]);

  const verifyOtp = useCallback(async (digits?: string[]) => {
    const entered = (digits ?? codeDigits).join("");
    if (entered.length < otpLen) {
      setError(`کد ${otpLen} رقمی را کامل وارد کنید`);
      return;
    }
    if (verifyingRef.current || lastTriedRef.current === entered) return;
    verifyingRef.current = true;
    lastTriedRef.current = entered;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), code: entered }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "کد نادرست است");
        setLoading(false);
        verifyingRef.current = false;
        return;
      }
      login(data.user, data.token);
      toast(`خوش آمدید، ${data.user.name}`);
    } catch {
      setError("خطا در اتصال به سرور");
      setLoading(false);
      verifyingRef.current = false;
      lastTriedRef.current = "";
    }
  }, [codeDigits, otpLen, identifier, login, toast]);

  const applyOtpCode = useCallback((raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, otpLen).split("");
    if (!digits.length) return;
    const next = Array(otpLen).fill("");
    digits.forEach((d, i) => { next[i] = d; });
    lastTriedRef.current = "";
    setCodeDigits(next);
    if (digits.length >= otpLen) {
      void verifyOtp(next);
    }
  }, [otpLen, verifyOtp]);

  // Web OTP API (Android Chrome) + autofill
  useEffect(() => {
    if (step !== 3 || mode !== "otp") return;
    const ac = new AbortController();
    const nav = navigator as Navigator & {
      credentials?: {
        get: (opts: unknown) => Promise<{ code?: string } | null>;
      };
    };
    if (nav.credentials?.get) {
      nav.credentials
        .get({ otp: { transport: ["sms"] }, signal: ac.signal })
        .then((otp) => {
          if (otp?.code) applyOtpCode(otp.code);
        })
        .catch(() => { /* unsupported / aborted */ });
    }
    return () => ac.abort();
  }, [step, mode, applyOtpCode]);

  // Auto-submit when all digits filled
  useEffect(() => {
    if (step !== 3 || mode !== "otp" || loading || verifyingRef.current) return;
    if (codeDigits.length === otpLen && codeDigits.every(Boolean)) {
      void verifyOtp(codeDigits);
    }
  }, [codeDigits, otpLen, step, mode, loading, verifyOtp]);

  const goToPasswordStep = () => {
    if (!identifier.trim()) { setError("موبایل یا نام کاربری را وارد کنید"); return; }
    setError("");
    setStep(2);
  };

  const requestOtp = async () => {
    if (!identifier.trim()) { setError("موبایل یا نام کاربری را وارد کنید"); return; }
    if (!loginPassword) { setError("رمز عبور را وارد کنید"); return; }
    setError(""); setLoading(true);

    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "ارسال کد ناموفق بود");
        setLoading(false);
        return;
      }
      const len = Math.max(4, Math.min(8, Number(data.otpLength) || 5));
      setOtpLen(len);
      setCodeDigits(Array(len).fill(""));
      setMaskedPhone(data.phone ?? "");
      setDemoCode(data.demoCode ?? null);
      setCooldownLeft(Number(data.cooldown) || 60);
      setStep(3);
      verifyingRef.current = false;
      lastTriedRef.current = "";
      toast(data.demoCode ? `کد ورود: ${data.demoCode}` : "کد ورود ارسال شد");
    } catch {
      setError("خطا در اتصال به سرور");
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (cooldownLeft > 0 || loading) return;
    await requestOtp();
  };

  const setupLogin = async () => {
    if (!username || !password) { setError("نام کاربری و رمز عبور را وارد کنید"); return; }
    setError(""); setLoading(true);

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username.trim(), password }),
        });
        const data = await res.json();
        if (res.status === 503) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        if (!data.ok) {
          setError(data.error ?? "ورود ناموفق");
          setLoading(false);
          return;
        }
        login(data.user, data.token);
        toast(`خوش آمدید، ${data.user.name}`);
        setLoading(false);
        return;
      } catch {
        if (attempt === 2) setError("خطا در اتصال به سرور");
        await new Promise((r) => setTimeout(r, 800));
      }
    }
    setLoading(false);
  };

  const demoQuickLogin = async (account: DemoAccountInfo) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: account.username, password: account.password }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "ورود ناموفق بود");
        setLoading(false);
        return;
      }
      login(data.user, data.token);
      toast(`خوش آمدید، ${data.user.name}`);
    } catch {
      setError("خطا در اتصال به سرور");
      setLoading(false);
    }
  };

  const fillDemoAccount = (account: DemoAccountInfo) => {
    setMode("otp");
    setStep(1);
    setIdentifier(account.username);
    setLoginPassword(account.password);
    setError("");
  };

  const handleCodeInput = (e: React.ChangeEvent<HTMLInputElement>, i: number) => {
    const val = e.target.value.replace(/\D/g, "");
    // Paste / autofill of full code into one box
    if (val.length > 1) {
      lastTriedRef.current = "";
      applyOtpCode(val);
      return;
    }
    const raw = val.slice(-1);
    const next = [...codeDigits];
    next[i] = raw;
    lastTriedRef.current = "";
    setCodeDigits(next);
    if (raw && i < otpLen - 1) {
      const inputs = codeBoxRef.current?.querySelectorAll("input");
      (inputs?.[i + 1] as HTMLInputElement | undefined)?.focus();
    }
  };

  const handleCodeKey = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === "Backspace" && !codeDigits[i] && i > 0) {
      const inputs = codeBoxRef.current?.querySelectorAll("input");
      (inputs?.[i - 1] as HTMLInputElement | undefined)?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    applyOtpCode(e.clipboardData.getData("text"));
  };

  const formatCooldown = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}:${String(s).padStart(2, "0")}` : `${s}`;
  };

  const otpTitle =
    step === 1 ? "ورود فروشنده" : step === 2 ? "تأیید رمز عبور" : "تأیید کد ورود";
  const otpSubtitle =
    step === 1
      ? "موبایل یا نام کاربری خود را وارد کنید"
      : step === 2
        ? "رمز عبور حساب را وارد کنید تا کد پیامک ارسال شود"
        : `کد ارسال‌شده به ${maskedPhone || "موبایل شما"}`;

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden p-4"
      style={{ background: "radial-gradient(1000px 600px at 80% -10%, #2a1b54 0%, transparent 55%), radial-gradient(900px 600px at 0% 100%, #0d2440 0%, transparent 55%), linear-gradient(180deg,#07050f,#0c0a1d)" }}>
      <div className="pointer-events-none absolute -right-32 top-10 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl anim-float" />
      <div className="pointer-events-none absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-cyan-500/20 blur-3xl anim-float" style={{ animationDelay: "1.5s" }} />

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-[2rem] anim-scale-in md:grid-cols-2"
        style={{ background: "rgba(15,12,30,0.93)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 32px 80px -16px rgba(0,0,0,0.85)" }}>

        <div className="relative hidden flex-col justify-between p-10 md:flex"
          style={{ background: "linear-gradient(160deg,rgba(124,77,255,0.25),rgba(6,182,212,0.1))", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3">
            <div
              className={`grid h-14 w-14 place-items-center overflow-hidden text-2xl font-black text-white ${
                branding.appLogo ? "" : "rounded-2xl grad-brand shadow-lg shadow-brand-500/40"
              }`}
            >
              {branding.appLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.appLogo} alt={branding.appName} className="h-full w-full object-contain" />
              ) : (
                (branding.appName || "م").charAt(0)
              )}
            </div>
            <div>
              <p className="text-xl font-extrabold text-white">{branding.appName}</p>
              <p className="text-xs text-white/55">سامانه حسابداری و فروش</p>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-2xl font-extrabold leading-relaxed text-white">ورود امن دو مرحله‌ای</h2>
            <p className="text-sm leading-7 text-white/65">
              ابتدا رمز عبور را تأیید کنید؛ سپس کد یک‌بارمصرف پیامکی دریافت کرده و وارد شوید.
            </p>
          </div>
          <div className="space-y-1 text-xs text-white/35">
            <p>نسخه {APP_VERSION_FA} — {branding.appName}</p>
          </div>
        </div>

        <div className="p-8 sm:p-10">
          {demoInfo?.demo && (demoInfo.accounts?.length ?? 0) > 0 && (
            <div
              className="mb-6 rounded-2xl px-4 py-3 text-sm text-white/80"
              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.28)" }}
            >
              <p className="font-bold text-emerald-300">ورود سریع</p>
              <div className="mt-3 space-y-2">
                {(demoInfo.accounts ?? []).map((account) => (
                  <div
                    key={account.username}
                    className="flex flex-wrap items-center gap-2 rounded-xl bg-black/20 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1 text-xs" dir="ltr">
                      <span className="text-white/45">{account.label}: </span>
                      <span className="font-semibold text-white">{account.username}</span>
                      <span className="text-white/35"> / </span>
                      <span className="font-semibold text-white">{account.password}</span>
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => fillDemoAccount(account)}
                      className="rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80 hover:bg-white/16"
                    >
                      پر کردن
                    </button>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => void demoQuickLogin(account)}
                      className="rounded-lg bg-emerald-500/25 px-2.5 py-1 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-500/35"
                    >
                      ورود سریع
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {setupAllowed && (
            <div className="mb-6 flex gap-2">
              <button type="button" onClick={() => { setMode("otp"); setStep(1); setError(""); }}
                className={`flex-1 rounded-2xl px-3 py-2 text-sm font-semibold transition ${mode === "otp" ? "grad-brand text-white" : "bg-white/6 text-white/55"}`}>
                ورود با OTP
              </button>
              <button type="button" onClick={() => { setMode("setup"); setStep(1); setError(""); }}
                className={`flex-1 rounded-2xl px-3 py-2 text-sm font-semibold transition ${mode === "setup" ? "grad-brand text-white" : "bg-white/6 text-white/55"}`}>
                راه‌اندازی
              </button>
            </div>
          )}

          <div className="mb-8 flex flex-col items-center text-center">
            <div
              className={`mb-3 grid h-20 w-20 place-items-center overflow-hidden text-3xl text-white shadow-xl ring-4 ring-white/10 ${
                branding.appLogo ? "" : "rounded-full grad-brand shadow-brand-500/40"
              }`}
            >
              {branding.appLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.appLogo} alt={branding.appName} className="h-full w-full object-contain" />
              ) : (
                mode === "setup" ? "⚙️" : step === 2 ? "🔒" : "📱"
              )}
            </div>
            <h1 className="text-xl font-extrabold text-white">
              {mode === "setup" ? "ورود راه‌اندازی" : otpTitle}
            </h1>
            <p className="mt-1 text-sm text-white/50">
              {mode === "setup" ? "ورود با نام کاربری و رمز عبور" : otpSubtitle}
            </p>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300">
              <I.alert width={16} /> {error}
            </div>
          )}

          {mode === "setup" && setupAllowed ? (
            <div className="space-y-4">
              <div>
                <span className="mb-1.5 block text-xs font-medium text-white/55">نام کاربری</span>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35"><I.user width={18} /></span>
                  <input value={username} onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && setupLogin()}
                    placeholder="نام کاربری" autoComplete="username"
                    className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3.5 pr-10 text-base text-white outline-none transition placeholder:text-white/30 focus:border-brand-400" />
                </div>
              </div>
              <div>
                <span className="mb-1.5 block text-xs font-medium text-white/55">رمز عبور</span>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35"><I.lock width={18} /></span>
                  <input
                    type={showSetupPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && setupLogin()}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3.5 pr-10 pl-11 text-base text-white outline-none transition placeholder:text-white/30 focus:border-brand-400"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showSetupPassword ? "مخفی کردن رمز" : "نمایش رمز"}
                    onClick={() => setShowSetupPassword((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 transition hover:text-white/70"
                  >
                    {showSetupPassword ? <I.eyeOff width={18} /> : <I.eye width={18} />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-sm text-white/65">
                  <Toggle on={remember} onChange={setRemember} /> مرا به خاطر بسپار
                </label>
              </div>
              <Btn onClick={setupLogin} className="w-full !py-3" disabled={loading}>
                {loading ? <I.refresh className="anim-spin-slow" /> : <I.arrow />}
                {loading ? "در حال بررسی..." : "ورود بدون OTP"}
              </Btn>
            </div>
          ) : step === 1 ? (
            <div className="space-y-4">
              <div>
                <span className="mb-1.5 block text-xs font-medium text-white/55">موبایل یا نام کاربری</span>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35"><I.user width={18} /></span>
                  <input value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && goToPasswordStep()}
                    placeholder="09xxxxxxxxx یا username"
                    dir="ltr"
                    autoComplete="username"
                    className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3.5 pr-10 text-base text-white outline-none transition placeholder:text-white/30 focus:border-brand-400" />
                </div>
              </div>
              <Btn onClick={goToPasswordStep} className="w-full !py-3" disabled={loading}>
                <I.arrow />
                ادامه
              </Btn>
            </div>
          ) : step === 2 ? (
            <div className="space-y-4">
              <div>
                <span className="mb-1.5 block text-xs font-medium text-white/55">رمز عبور</span>
                <div className="relative">
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35"><I.lock width={18} /></span>
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && requestOtp()}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    autoFocus
                    className="w-full rounded-2xl border border-white/12 bg-white/6 px-4 py-3.5 pr-10 pl-11 text-base text-white outline-none transition placeholder:text-white/30 focus:border-brand-400"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={showLoginPassword ? "مخفی کردن رمز" : "نمایش رمز"}
                    onClick={() => setShowLoginPassword((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 transition hover:text-white/70"
                  >
                    {showLoginPassword ? <I.eyeOff width={18} /> : <I.eye width={18} />}
                  </button>
                </div>
              </div>
              <Btn onClick={requestOtp} className="w-full !py-3" disabled={loading}>
                {loading ? <I.refresh className="anim-spin-slow" /> : <I.arrow />}
                {loading ? "در حال ارسال..." : "تأیید و ارسال کد"}
              </Btn>
              <button
                type="button"
                onClick={() => { setStep(1); setError(""); }}
                className="w-full text-center text-sm text-white/45 transition hover:text-white/70"
              >
                ← بازگشت
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Hidden field helps iOS/Safari SMS autofill */}
              <input
                type="text"
                name="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={codeDigits.join("")}
                onChange={(e) => applyOtpCode(e.target.value)}
                className="sr-only"
                tabIndex={-1}
                aria-hidden
              />
              <div className="flex justify-center gap-2" dir="ltr" ref={codeBoxRef} onPaste={handleCodePaste}>
                {codeDigits.map((c, i) => (
                  <input
                    key={i}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={i === 0 ? otpLen : 1}
                    value={c}
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    onChange={(e) => handleCodeInput(e, i)}
                    onKeyDown={(e) => handleCodeKey(e, i)}
                    className="h-14 w-11 rounded-2xl border border-white/15 bg-white/6 text-center text-xl font-extrabold text-white outline-none transition focus:border-brand-400 focus:bg-white/10 sm:h-16 sm:w-12 sm:text-2xl"
                    style={{ caretColor: "transparent" }}
                  />
                ))}
              </div>
              {demoCode && (
                <div className="rounded-2xl px-4 py-3 text-center text-sm text-white/50"
                  style={{ background: "rgba(124,77,255,0.1)", border: "1px solid rgba(124,77,255,0.2)" }}>
                  کد ورود: <span className="font-extrabold text-brand-300">{demoCode}</span>
                </div>
              )}
              <Btn onClick={() => verifyOtp()} className="w-full !py-3" disabled={loading}>
                {loading ? <I.refresh className="anim-spin-slow" /> : <I.check />}
                {loading ? "در حال ورود..." : "تأیید و ورود"}
              </Btn>
              <div className="flex flex-col items-center gap-2 text-sm">
                <button
                  type="button"
                  disabled={cooldownLeft > 0 || loading}
                  onClick={resendOtp}
                  className="text-white/70 transition hover:text-white disabled:cursor-not-allowed disabled:text-white/30"
                >
                  {cooldownLeft > 0
                    ? `ارسال مجدد تا ${formatCooldown(cooldownLeft)} دیگر`
                    : "ارسال مجدد کد"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep(2);
                    setCodeDigits([]);
                    setError("");
                    setDemoCode(null);
                    verifyingRef.current = false;
                    lastTriedRef.current = "";
                  }}
                  className="text-white/45 transition hover:text-white/70"
                >
                  ← بازگشت
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 space-y-1 text-center text-[11px] text-white/30 md:hidden">
            <p>نسخه {APP_VERSION_FA} — {branding.appName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
