"use client";

import { useCallback, useEffect, useState } from "react";
import { Glass, Btn, Field, Input, Toggle } from "../ui";
import { I } from "../icons";
import { useApp } from "../context";

type SmsSettings = {
  provider?: string;
  melipayamakUsername?: string | null;
  melipayamakPassword?: string | null;
  melipayamakFrom?: string | null;
  melipayamakOtpBodyId?: number | null;
  melipayamakCustomerSaleBodyId?: number | null;
  melipayamakAdminSaleBodyId?: number | null;
  otpTemplate?: string | null;
  customerSaleTemplate?: string | null;
  adminSaleTemplate?: string | null;
  otpMapping?: string[];
  customerSaleMapping?: string[];
  adminSaleMapping?: string[];
  adminPhones?: string | null;
  notifyCustomerOnSaleFinalized?: boolean | null;
  notifyAdminOnSaleFinalized?: boolean | null;
  otpLength?: number | null;
  otpExpireSeconds?: number | null;
  otpCooldownSeconds?: number | null;
  otpHourlyLimit?: number | null;
  otpMaxAttempts?: number | null;
  otpLockSeconds?: number | null;
  otpIpHourlyLimit?: number | null;
  varMaxLength?: number | null;
  enabled?: boolean | null;
  hasPassword?: boolean;
};

type VarHelp = { key: string; label: string; group: string };

type BootstrapUser = {
  id: number;
  name: string;
  username: string;
  phone: string | null;
  bypassOtp: boolean | null;
  isBootstrap: boolean | null;
  isActive: boolean | null;
};

function mappingToStr(arr?: string[] | null) {
  return (arr ?? []).join(", ");
}
function strToMapping(s: string) {
  return s.split(/[,،\s]+/).map((x) => x.trim()).filter(Boolean);
}

export function SmsSettingsPanel() {
  const { token, toast } = useApp();
  const [section, setSection] = useState("connection");
  const [s, setS] = useState<SmsSettings>({});
  const [vars, setVars] = useState<VarHelp[]>([]);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testResult, setTestResult] = useState("");
  const [bootstrap, setBootstrap] = useState<BootstrapUser | null>(null);
  const [bootForm, setBootForm] = useState({ username: "", password: "", name: "" });

  const load = useCallback(() => {
    fetch("/api/sms-settings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok) {
          setS(d.settings ?? {});
          setVars(d.variables ?? []);
        }
      })
      .catch(() => {});
    fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        const boot = (d.users as BootstrapUser[]).find((u) => u.isBootstrap) ?? null;
        setBootstrap(boot);
        if (boot) setBootForm({ username: boot.username, password: "", name: boot.name });
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const set = <K extends keyof SmsSettings>(key: K, value: SmsSettings[K]) => {
    setS((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/sms-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(s),
      });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا", "error"); return; }
      setS(d.settings);
      toast("تنظیمات پیامک ذخیره شد");
    } catch { toast("خطا در ذخیره", "error"); }
    finally { setSaving(false); }
  };

  const testSend = async () => {
    if (!testPhone.trim()) { toast("شماره تست را وارد کنید", "error"); return; }
    setTesting(true);
    setTestResult("");
    try {
      const res = await fetch("/api/sms-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: testPhone, mode: "auto" }),
      });
      const d = await res.json();
      setTestResult(JSON.stringify(d, null, 2));
      d.ok ? toast("تست ارسال موفق") : toast(d.error ?? "تست ناموفق", "error");
    } catch { toast("خطا در تست", "error"); }
    finally { setTesting(false); }
  };

  const updateBootstrap = async (action: "update" | "deactivate" | "delete") => {
    if (!bootstrap) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { action, userId: bootstrap.id };
      if (action === "update") {
        body.name = bootForm.name;
        body.username = bootForm.username;
        if (bootForm.password) body.password = bootForm.password;
      }
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا", "error"); return; }
      toast(action === "update" ? "کاربر راه‌اندازی به‌روز شد" : "کاربر راه‌اندازی غیرفعال شد");
      load();
    } catch { toast("خطا", "error"); }
    finally { setSaving(false); }
  };

  const setBypass = async (on: boolean) => {
    if (!bootstrap) return;
    const res = await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "update", userId: bootstrap.id, bypassOtp: on }),
    });
    const d = await res.json();
    d.ok ? (toast(on ? "bypass_otp فعال شد" : "bypass_otp خاموش شد"), load()) : toast(d.error ?? "خطا", "error");
  };

  const sections = [
    { id: "connection", label: "اتصال ملی‌پیامک" },
    { id: "otp", label: "OTP ورود" },
    { id: "customer", label: "پیام مشتری" },
    { id: "admin", label: "پیام مدیر" },
    { id: "bootstrap", label: "کاربر راه‌اندازی" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-strong">سامانه پیامک ملی‌پیامک</h3>
          <label className="flex items-center gap-2 text-sm text-muted">
            <Toggle on={!!s.enabled} onChange={(v) => set("enabled", v)} /> فعال
          </label>
        </div>
        <Btn onClick={save} disabled={saving}>
          {saving ? <I.refresh className="anim-spin-slow" /> : <I.check width={16} />} ذخیره تنظیمات
        </Btn>
      </div>

      <div className="flex flex-wrap gap-2">
        {sections.map((sec) => (
          <button key={sec.id} type="button" onClick={() => setSection(sec.id)}
            className={`press rounded-2xl px-3 py-2 text-xs font-semibold transition ${section === sec.id ? "grad-brand text-white" : "glass-2 text-muted"}`}>
            {sec.label}
          </button>
        ))}
      </div>

      {section === "connection" && (
        <Glass className="space-y-4 p-5">
          <p className="text-xs text-muted leading-6">
            برای الگوی خدماتی (SendByBaseNumber) فقط username/password و bodyId لازم است.
            برای SendSMS و SendOtp، شماره خط فرستنده (from) هم لازم است. آی‌پی خروجی سرور را در پنل ملی‌پیامک مجاز کنید.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="نام کاربری ملی‌پیامک">
              <Input dir="ltr" value={s.melipayamakUsername ?? ""} onChange={(e) => set("melipayamakUsername", e.target.value)} />
            </Field>
            <Field label="رمز عبور">
              <Input dir="ltr" type="password" value={s.melipayamakPassword ?? ""} onChange={(e) => set("melipayamakPassword", e.target.value)}
                placeholder={s.hasPassword ? "********" : ""} />
            </Field>
            <Field label="شماره خط فرستنده (from)">
              <Input dir="ltr" value={s.melipayamakFrom ?? ""} onChange={(e) => set("melipayamakFrom", e.target.value)} placeholder="مثلاً 5000..." />
            </Field>
            <Field label="ارائه‌دهنده">
              <Input dir="ltr" value={s.provider ?? "melipayamak"} onChange={(e) => set("provider", e.target.value)} />
            </Field>
          </div>
          <div className="rounded-2xl glass-2 p-4 space-y-3">
            <h4 className="text-sm font-bold text-strong">تست ارسال</h4>
            <div className="flex flex-wrap gap-2">
              <Input className="max-w-xs" dir="ltr" placeholder="09xxxxxxxxx" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} />
              <Btn variant="soft" onClick={testSend} disabled={testing}>
                {testing ? <I.refresh className="anim-spin-slow" /> : <I.bell width={16} />}
                تست ارسال
              </Btn>
            </div>
            {testResult && (
              <pre className="max-h-48 overflow-auto rounded-xl bg-black/30 p-3 text-[11px] text-left dir-ltr text-emerald-200 whitespace-pre-wrap">
                {testResult}
              </pre>
            )}
          </div>
        </Glass>
      )}

      {section === "otp" && (
        <Glass className="space-y-4 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="bodyId الگوی OTP">
              <Input dir="ltr" type="number" value={s.melipayamakOtpBodyId ?? ""} onChange={(e) => set("melipayamakOtpBodyId", e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <Field label="ترتیب متغیرهای الگو (کاما جدا)">
              <Input dir="ltr" value={mappingToStr(s.otpMapping)} onChange={(e) => set("otpMapping", strToMapping(e.target.value))}
                placeholder="seller_name, code" />
            </Field>
            <Field label="طول کد">
              <Input dir="ltr" type="number" value={s.otpLength ?? 5} onChange={(e) => set("otpLength", Number(e.target.value))} />
            </Field>
            <Field label="انقضا (ثانیه)">
              <Input dir="ltr" type="number" value={s.otpExpireSeconds ?? 120} onChange={(e) => set("otpExpireSeconds", Number(e.target.value))} />
            </Field>
            <Field label="Cooldownoldown ارسال مجدد">
              <Input dir="ltr" type="number" value={s.otpCooldownSeconds ?? 60} onChange={(e) => set("otpCooldownSeconds", Number(e.target.value))} />
            </Field>
            <Field label="سقف ساعتی هر شماره">
              <Input dir="ltr" type="number" value={s.otpHourlyLimit ?? 5} onChange={(e) => set("otpHourlyLimit", Number(e.target.value))} />
            </Field>
            <Field label="حداکثر تلاش اشتباه">
              <Input dir="ltr" type="number" value={s.otpMaxAttempts ?? 5} onChange={(e) => set("otpMaxAttempts", Number(e.target.value))} />
            </Field>
            <Field label="مدت قفل (ثانیه)">
              <Input dir="ltr" type="number" value={s.otpLockSeconds ?? 3600} onChange={(e) => set("otpLockSeconds", Number(e.target.value))} />
            </Field>
            <Field label="سقف IP در ساعت">
              <Input dir="ltr" type="number" value={s.otpIpHourlyLimit ?? 20} onChange={(e) => set("otpIpHourlyLimit", Number(e.target.value))} />
            </Field>
          </div>
          <Field label="قالب متن آزاد (fallback)">
            <textarea
              className="w-full min-h-[100px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-strong outline-none"
              value={s.otpTemplate ?? ""}
              onChange={(e) => set("otpTemplate", e.target.value)}
            />
          </Field>
          <p className="text-xs text-muted">Placeholderها: {"{seller_name}"} {"{code}"} {"{phone}"} {"{expire}"}</p>
        </Glass>
      )}

      {section === "customer" && (
        <Glass className="space-y-4 p-5">
          <label className="flex items-center justify-between rounded-2xl glass-2 px-4 py-3 text-sm">
            <span className="text-strong">ارسال خودکار بعد از فروش نهایی</span>
            <Toggle on={!!s.notifyCustomerOnSaleFinalized} onChange={(v) => set("notifyCustomerOnSaleFinalized", v)} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="bodyId الگوی مشتری">
              <Input dir="ltr" type="number" value={s.melipayamakCustomerSaleBodyId ?? ""}
                onChange={(e) => set("melipayamakCustomerSaleBodyId", e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <Field label="ترتیب متغیرهای الگو">
              <Input dir="ltr" value={mappingToStr(s.customerSaleMapping)}
                onChange={(e) => set("customerSaleMapping", strToMapping(e.target.value))} />
            </Field>
          </div>
          <Field label="قالب متن آزاد">
            <textarea
              className="w-full min-h-[120px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-strong outline-none"
              value={s.customerSaleTemplate ?? ""}
              onChange={(e) => set("customerSaleTemplate", e.target.value)}
            />
          </Field>
          <VarList vars={vars.filter((v) => v.group !== "OTP")} />
        </Glass>
      )}

      {section === "admin" && (
        <Glass className="space-y-4 p-5">
          <label className="flex items-center justify-between rounded-2xl glass-2 px-4 py-3 text-sm">
            <span className="text-strong">اطلاع به مدیر بعد از فروش</span>
            <Toggle on={!!s.notifyAdminOnSaleFinalized} onChange={(v) => set("notifyAdminOnSaleFinalized", v)} />
          </label>
          <Field label="شماره‌های مدیر (خط جدید یا کاما)">
            <textarea
              dir="ltr"
              className="w-full min-h-[80px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-strong outline-none"
              value={s.adminPhones ?? ""}
              onChange={(e) => set("adminPhones", e.target.value)}
              placeholder={"0912...\n0913..."}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="bodyId الگوی مدیر">
              <Input dir="ltr" type="number" value={s.melipayamakAdminSaleBodyId ?? ""}
                onChange={(e) => set("melipayamakAdminSaleBodyId", e.target.value ? Number(e.target.value) : null)} />
            </Field>
            <Field label="ترتیب متغیرهای الگو">
              <Input dir="ltr" value={mappingToStr(s.adminSaleMapping)}
                onChange={(e) => set("adminSaleMapping", strToMapping(e.target.value))} />
            </Field>
          </div>
          <Field label="قالب متن آزاد مدیر">
            <textarea
              className="w-full min-h-[100px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-strong outline-none"
              value={s.adminSaleTemplate ?? ""}
              onChange={(e) => set("adminSaleTemplate", e.target.value)}
            />
          </Field>
        </Glass>
      )}

      {section === "bootstrap" && (
        <Glass className="space-y-4 p-5">
          {!bootstrap ? (
            <p className="text-sm text-muted">کاربر راه‌اندازی یافت نشد. با اجرای setup دوباره ساخته می‌شود.</p>
          ) : (
            <>
              <p className="text-xs text-muted leading-6">
                کاربر <span className="font-mono text-brand-400">@{bootstrap.username}</span> بدون OTP وارد می‌شود.
                پس از تنظیمات اولیه می‌توانید رمز را عوض کنید، bypass را خاموش کنید، یا کاربر را غیرفعال کنید.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="نام نمایشی">
                  <Input value={bootForm.name} onChange={(e) => setBootForm({ ...bootForm, name: e.target.value })} />
                </Field>
                <Field label="نام کاربری">
                  <Input dir="ltr" value={bootForm.username} onChange={(e) => setBootForm({ ...bootForm, username: e.target.value })} />
                </Field>
                <Field label="رمز جدید (اختیاری)">
                  <Input dir="ltr" type="password" value={bootForm.password} onChange={(e) => setBootForm({ ...bootForm, password: e.target.value })} />
                </Field>
              </div>
              <label className="flex items-center justify-between rounded-2xl glass-2 px-4 py-3 text-sm">
                <span className="text-strong">bypass_otp (ورود بدون پیامک)</span>
                <Toggle on={!!bootstrap.bypassOtp} onChange={setBypass} />
              </label>
              <div className="flex flex-wrap gap-2">
                <Btn onClick={() => updateBootstrap("update")} disabled={saving}>ذخیره تغییرات</Btn>
                <Btn variant="soft" onClick={() => updateBootstrap("deactivate")} disabled={saving}>غیرفعال‌سازی</Btn>
                <Btn variant="ghost" onClick={() => {
                  if (confirm("کاربر راه‌اندازی حذف (غیرفعال) شود؟")) updateBootstrap("delete");
                }} disabled={saving}>حذف</Btn>
              </div>
            </>
          )}
        </Glass>
      )}
    </div>
  );
}

function VarList({ vars }: { vars: VarHelp[] }) {
  const groups = [...new Set(vars.map((v) => v.group))];
  return (
    <div className="rounded-2xl glass-2 p-4">
      <h4 className="mb-2 text-sm font-bold text-strong">متغیرهای قابل استفاده</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g}>
            <p className="mb-1 text-[11px] font-bold text-muted">{g}</p>
            <ul className="space-y-0.5 text-xs text-strong">
              {vars.filter((v) => v.group === g).map((v) => (
                <li key={v.key}><code className="text-brand-300">{`{${v.key}}`}</code> — {v.label}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
