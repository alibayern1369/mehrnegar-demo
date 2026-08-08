"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Glass, SectionTitle, Badge, Btn, Field, Input, Select } from "../ui";
import { I } from "../icons";
import { useApp } from "../context";
import { faNumber, faDate } from "@/lib/format";

type Customer = { phone: string; name: string | null };
type SmsRow = {
  id: number;
  type: string;
  campaignName: string | null;
  phone: string;
  customerName: string | null;
  message: string;
  status: string | null;
  createdAt: string | null;
};

export function SmsPage() {
  const { token, toast } = useApp();
  const [tab, setTab] = useState<"campaign" | "history">("campaign");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<SmsRow[]>([]);
  const [campaignName, setCampaignName] = useState("");
  const [type, setType] = useState<"campaign" | "promo" | "announcement">("promo");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    fetch("/api/sms?customers=1", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.ok && setCustomers(d.customers ?? []))
      .catch(() => {});
    fetch("/api/sms", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.ok && setHistory(d.messages ?? []))
      .catch(() => {});
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const toggle = (phone: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(customers.map((c) => c.phone)));
  const clearAll = () => setSelected(new Set());

  const templates = useMemo(() => ({
    promo: "مشتری گرامی کامفی فیتس، کد تخفیف ویژه شما: CF10 — فقط تا پایان هفته.",
    announcement: "اطلاعیه کامفی فیتس: مجموعه جدید رسید. از شعب حضوری و وب‌سایت دیدن کنید.",
    campaign: "پویش ویژه کامفی فیتس — فرصت خرید با شرایط استثنایی.",
  }), []);

  const applyTemplate = () => setMessage(templates[type]);

  const send = async () => {
    if (!message.trim()) { toast("متن پیام را وارد کنید", "error"); return; }
    if (!selected.size) { toast("حداقل یک مشتری انتخاب کنید", "error"); return; }
    setSending(true);
    try {
      const recipients = customers
        .filter((c) => selected.has(c.phone))
        .map((c) => ({ phone: c.phone, customerName: c.name }));
      const res = await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, campaignName, message, recipients }),
      });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا", "error"); return; }
      toast(`${faNumber(d.sent)} پیامک ارسال شد`);
      setMessage("");
      setCampaignName("");
      clearAll();
      load();
      setTab("history");
    } catch { toast("خطا در ارسال", "error"); }
    finally { setSending(false); }
  };

  const typeLabel: Record<string, string> = {
    sale: "فروش", campaign: "کمپین", promo: "تخفیف", announcement: "اطلاعیه",
  };

  return (
    <div>
      <SectionTitle icon={<I.bell />} title="پیامک مارکتینگ" sub="پیامک خودکار پس از فروش + کمپین‌های تبلیغاتی"
        action={
          <div className="flex gap-2">
            <Btn variant={tab === "campaign" ? "primary" : "ghost"} onClick={() => setTab("campaign")}>کمپین جدید</Btn>
            <Btn variant={tab === "history" ? "primary" : "ghost"} onClick={() => setTab("history")}>تاریخچه</Btn>
          </div>
        } />

      {tab === "campaign" ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <Glass className="p-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="نام کمپین"><Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="تخفیف نوروز" /></Field>
              <Field label="نوع پیام">
                <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
                  <option value="promo">کد تخفیف / پرومو</option>
                  <option value="announcement">اطلاعیه</option>
                  <option value="campaign">کمپین بازاریابی</option>
                </Select>
              </Field>
            </div>
            <Field label="متن پیامک">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="w-full rounded-2xl border border-white/20 bg-white/70 dark:bg-white/8 px-4 py-3 text-sm text-strong outline-none"
                placeholder="متن پیام..."
              />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Btn variant="soft" onClick={applyTemplate}>قالب آماده</Btn>
              <Btn onClick={send} disabled={sending}>{sending ? "..." : <><I.upload width={14} /> ارسال به {faNumber(selected.size)} نفر</>}</Btn>
            </div>
          </Glass>

          <Glass className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold text-strong">انتخاب مشتریان</h3>
              <div className="flex gap-1">
                <Btn variant="ghost" onClick={selectAll}>همه</Btn>
                <Btn variant="ghost" onClick={clearAll}>هیچ</Btn>
              </div>
            </div>
            <div className="max-h-96 space-y-1 overflow-y-auto">
              {customers.map((c) => (
                <label key={c.phone} className="flex items-center gap-3 rounded-xl glass-2 px-3 py-2 cursor-pointer">
                  <input type="checkbox" checked={selected.has(c.phone)} onChange={() => toggle(c.phone)} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-strong truncate">{c.name || "بدون نام"}</p>
                    <p className="text-xs text-muted" dir="ltr">{c.phone}</p>
                  </div>
                </label>
              ))}
              {!customers.length && (
                <p className="text-xs text-muted text-center py-8">هنوز مشتری با موبایل در فاکتورها نیست</p>
              )}
            </div>
          </Glass>
        </div>
      ) : (
        <Glass className="p-5">
          <h3 className="mb-4 font-bold text-strong">تاریخچه پیامک‌ها</h3>
          <div className="space-y-2 max-h-[560px] overflow-y-auto">
            {history.map((m) => (
              <div key={m.id} className="rounded-2xl glass-2 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge tone={m.type === "sale" ? "green" : "brand"}>{typeLabel[m.type] ?? m.type}</Badge>
                  <Badge tone={m.status === "sent" ? "green" : "red"}>{m.status === "sent" ? "ارسال شد" : m.status}</Badge>
                  {m.campaignName && <span className="text-xs text-muted">{m.campaignName}</span>}
                  <span className="text-[10px] text-muted mr-auto">
                    {m.createdAt ? new Date(m.createdAt).toLocaleString("fa-IR") : faDate()}
                  </span>
                </div>
                <p className="text-sm text-strong">{m.message}</p>
                <p className="mt-1 text-xs text-muted" dir="ltr">{m.phone} {m.customerName ? `· ${m.customerName}` : ""}</p>
              </div>
            ))}
            {!history.length && <p className="text-center text-muted py-12">پیامکی ثبت نشده</p>}
          </div>
        </Glass>
      )}
    </div>
  );
}
