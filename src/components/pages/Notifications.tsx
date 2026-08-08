"use client";

import { useState } from "react";
import { Glass, SectionTitle, Btn, Badge } from "../ui";
import { I } from "../icons";
import { notifications as seed, type Notif } from "@/lib/data";
import { useApp } from "../context";

const meta: Record<Notif["kind"], { icon: React.ReactNode; cls: string }> = {
  low: { icon: <I.alert width={18} />, cls: "bg-amber-500/15 text-amber-500" },
  out: { icon: <I.close width={18} />, cls: "bg-rose-500/15 text-rose-500" },
  order: { icon: <I.cart width={18} />, cls: "bg-sky-500/15 text-sky-500" },
  sync: { icon: <I.refresh width={18} />, cls: "bg-emerald-500/15 text-emerald-500" },
  transfer: { icon: <I.warehouse width={18} />, cls: "bg-brand-500/15 text-brand-500" },
  price: { icon: <I.tag width={18} />, cls: "bg-cyan-500/15 text-cyan-500" },
};

export function Notifications() {
  const { toast } = useApp();
  const [list, setList] = useState<Notif[]>(seed);
  return (
    <div>
      <SectionTitle icon={<I.bell />} title="مرکز اعلان‌ها" sub={`${list.length} اعلان`}
        action={<Btn variant="ghost" onClick={() => { setList([]); toast("همه اعلان‌ها خوانده شد"); }}><I.check width={16} /> علامت‌گذاری همه</Btn>} />
      <div className="mx-auto max-w-3xl space-y-3">
        {list.map((n) => {
          const m = meta[n.kind];
          return (
            <Glass key={n.id} hover className="flex items-start gap-4 p-4">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${m.cls}`}>{m.icon}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between"><p className="font-bold text-strong">{n.title}</p><span className="text-xs text-muted">{n.time}</span></div>
                <p className="mt-1 text-sm text-muted">{n.body}</p>
              </div>
              <button onClick={() => setList((l) => l.filter((x) => x.id !== n.id))} className="press rounded-full p-1.5 text-muted hover:bg-white/10"><I.close width={16} /></button>
            </Glass>
          );
        })}
        {list.length === 0 && <Glass className="p-10 text-center"><span className="text-5xl opacity-40">🔔</span><p className="mt-3 text-muted">اعلان جدیدی وجود ندارد</p></Glass>}
      </div>
    </div>
  );
}
