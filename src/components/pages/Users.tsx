"use client";

import { useState } from "react";
import { Glass, SectionTitle, Btn, Badge, Modal, Field, Input, Select, Toggle } from "../ui";
import { I } from "../icons";
import { users, roles, permissionList } from "@/lib/data";
import { faNumber } from "@/lib/format";
import { useApp } from "../context";

export function Users() {
  const { toast } = useApp();
  const [addOpen, setAddOpen] = useState(false);
  const [permRole, setPermRole] = useState(roles[0]);
  const [perms, setPerms] = useState<string[]>(roles[0].permissions);

  const pickRole = (r: typeof roles[number]) => { setPermRole(r); setPerms(r.permissions); };
  const togglePerm = (p: string) => setPerms((x) => x.includes(p) ? x.filter((y) => y !== p) : [...x, p]);

  return (
    <div>
      <SectionTitle icon={<I.users />} title="کاربران و سطوح دسترسی" sub={`${faNumber(users.length)} کاربر • ${faNumber(roles.length)} نقش`}
        action={<Btn onClick={() => setAddOpen(true)}><I.plus width={16} /> کاربر جدید</Btn>} />

      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <Glass className="p-5">
          <h3 className="mb-4 font-bold text-strong">کاربران سیستم</h3>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-2xl glass-2 px-4 py-3 transition hover:bg-white/8">
                <div className="relative">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-2xl">{u.avatar}</span>
                  <span className={`absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full ring-2 ring-black/20 ${u.status === "online" ? "bg-emerald-500" : "bg-slate-400"}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-strong">{u.name}</p>
                  <p className="text-xs text-muted" dir="ltr">@{u.username}</p>
                </div>
                <Badge tone="brand">{u.role}</Badge>
                <span className="text-xs text-muted">{u.lastSeen}</span>
                <button onClick={() => toast(`ویرایش دسترسی ${u.name}`)} className="press rounded-xl p-2 text-muted hover:bg-white/10 hover:text-strong"><I.edit width={16} /></button>
              </div>
            ))}
          </div>
        </Glass>

        <div className="space-y-5">
          <Glass className="p-5">
            <h3 className="mb-3 font-bold text-strong">نقش‌ها</h3>
            <div className="flex flex-wrap gap-2">
              {roles.map((r) => (
                <button key={r.id} onClick={() => pickRole(r)} className={`press rounded-2xl px-3 py-2 text-xs font-semibold transition ${permRole.id === r.id ? "grad-brand text-white" : "glass-2 text-muted hover:text-strong"}`}>
                  {r.name} <span className="opacity-70">({faNumber(r.users)})</span>
                </button>
              ))}
            </div>
          </Glass>

          <Glass className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-strong">دسترسی‌های «{permRole.name}»</h3>
              <Badge tone="brand">{faNumber(perms.length)} مجوز</Badge>
            </div>
            <div className="space-y-2">
              {permissionList.map((p) => (
                <div key={p} className="flex items-center justify-between rounded-xl glass-2 px-4 py-2.5">
                  <span className="text-sm text-strong">{p}</span>
                  <Toggle on={perms.includes(p)} onChange={() => togglePerm(p)} />
                </div>
              ))}
            </div>
            <Btn className="mt-4 w-full" onClick={() => toast(`دسترسی‌های نقش «${permRole.name}» ذخیره شد`)}><I.shield width={16} /> ذخیره دسترسی‌ها</Btn>
          </Glass>
        </div>
      </div>

      <Glass className="mt-5 p-5">
        <h3 className="mb-4 font-bold text-strong">گزارش فعالیت کاربران (لاگ سیستم)</h3>
        <div className="space-y-2">
          {[
            { u: "سید سلطان سیادتی", a: "ثبت فروش فاکتور #۱۰۴۸۲ — هودی اوورسایز کرم", t: "۱۴:۲۲", k: "bg-emerald-500" },
            { u: "ابراهیم سیادتی",   a: "ویرایش قیمت ۶ محصول دسته تی‌شرت",             t: "۱۳:۰۵", k: "bg-amber-500"  },
            { u: "بردیا سیادتی",     a: "ثبت رسید ورود کالا — ۵۰ عدد ست ورزشی بنفش",  t: "۱۱:۴۰", k: "bg-sky-500"    },
            { u: "صبا گریوانی",      a: "فروش مانتو کرپ مشکی — سفارش #۱۰۴۸۰",         t: "۱۰:۱۲", k: "bg-brand-500"  },
            { u: "توماس مولر",       a: "مرجوع کردن کت تک اسپرت خاکستری",              t: "۰۹:۱۵", k: "bg-rose-500"   },
          ].map((l, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl glass-2 px-4 py-2.5 text-sm">
              <span className={`h-2 w-2 rounded-full ${l.k}`} />
              <span className="font-semibold text-strong">{l.u}</span>
              <span className="text-muted">{l.a}</span>
              <span className="mr-auto text-xs text-muted">{l.t}</span>
            </div>
          ))}
        </div>
      </Glass>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="افزودن کاربر جدید">
        <div className="space-y-4">
          <Field label="نام و نام خانوادگی"><Input placeholder="مثال: زهرا موسوی" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="نام کاربری"><Input dir="ltr" className="text-left" placeholder="username" /></Field>
            <Field label="رمز عبور"><Input type="password" placeholder="••••••••" /></Field>
          </div>
          <Field label="نقش کاربری"><Select>{roles.map((r) => <option key={r.id}>{r.name}</option>)}</Select></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setAddOpen(false)}>انصراف</Btn>
          <Btn onClick={() => { setAddOpen(false); toast("کاربر جدید ایجاد شد"); }}><I.check width={16} /> ایجاد کاربر</Btn>
        </div>
      </Modal>
    </div>
  );
}
