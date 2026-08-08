"use client";

import { useCallback, useEffect, useState } from "react";
import { Glass, Btn, Field, Input, Modal, SectionTitle } from "../ui";
import { I } from "../icons";
import { useApp } from "../context";
import { JalaliDatePicker } from "../JalaliDatePicker";
import { formatJalaliDisplay } from "@/lib/jalali";
import { faNumber } from "@/lib/format";
import { isValidIranMobile } from "@/lib/phone";

type Customer = {
  id: number;
  name: string;
  phone: string;
  address: string;
  birthDate: string;
  createdAt?: string | Date | null;
};

const empty = { name: "", phone: "", address: "", birthDate: "" };

export function CustomersPage() {
  const { token, toast } = useApp();
  const [rows, setRows] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (query = "") => {
    setLoading(true);
    try {
      const url = query.trim()
        ? `/api/customers?q=${encodeURIComponent(query.trim())}`
        : "/api/customers";
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.ok) setRows(data.customers ?? []);
      else toast(data.error ?? "خطا در بارگذاری مشتریان", "error");
    } catch {
      toast("خطا در اتصال به سرور", "error");
    } finally {
      setLoading(false);
    }
  }, [token, toast]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setFormOpen(true);
  };

  const openEdit = (c: Customer) => {
    setEditing(c);
    setForm({
      name: c.name,
      phone: c.phone,
      address: c.address,
      birthDate: c.birthDate,
    });
    setFormOpen(true);
  };

  const save = async () => {
    const name = form.name.trim();
    const phone = form.phone.trim();
    const address = form.address.trim();
    if (!name) { toast("نام الزامی است", "error"); return; }
    if (!isValidIranMobile(phone)) { toast("شماره تلفن معتبر الزامی است (09xxxxxxxxx)", "error"); return; }
    if (!address) { toast("آدرس کامل الزامی است", "error"); return; }
    if (!form.birthDate) { toast("تاریخ تولد الزامی است", "error"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: editing?.id,
          name,
          phone,
          address,
          birthDate: form.birthDate,
        }),
      });
      const data = await res.json();
      if (!data.ok) { toast(data.error ?? "خطا در ذخیره", "error"); return; }
      toast(editing ? "مشتری به‌روزرسانی شد" : "مشتری ثبت شد");
      setFormOpen(false);
      load(q);
    } catch {
      toast("خطا در اتصال به سرور", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: Customer) => {
    if (!confirm(`حذف مشتری «${c.name}»؟`)) return;
    try {
      const res = await fetch(`/api/customers?id=${c.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.ok) { toast(data.error ?? "خطا در حذف", "error"); return; }
      toast("مشتری حذف شد");
      load(q);
    } catch {
      toast("خطا در اتصال به سرور", "error");
    }
  };

  return (
    <div>
      <SectionTitle
        icon={<I.users />}
        title="مشتریان"
        sub="ثبت و مدیریت مشخصات مشتریان"
        action={<Btn onClick={openAdd}><I.plus width={16} /> مشتری جدید</Btn>}
      />

      <Glass className="mb-4 p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(q)}
            placeholder="جستجو با نام، تلفن یا آدرس..."
            className="flex-1"
          />
          <Btn variant="soft" onClick={() => load(q)} disabled={loading}>
            {loading ? <I.refresh width={16} className="anim-spin-slow" /> : <I.search width={16} />}
            جستجو
          </Btn>
        </div>
      </Glass>

      <Glass className="overflow-hidden p-0">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted">
            {loading ? "در حال بارگذاری..." : "مشتری‌ای ثبت نشده است"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-muted">
                  <th className="p-3 text-right font-medium">نام</th>
                  <th className="p-3 text-right font-medium">تلفن</th>
                  <th className="p-3 text-right font-medium">آدرس</th>
                  <th className="p-3 text-right font-medium">تاریخ تولد</th>
                  <th className="p-3 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-white/5">
                    <td className="p-3 font-semibold text-strong">{c.name}</td>
                    <td className="p-3 text-muted" dir="ltr">{c.phone}</td>
                    <td className="max-w-[220px] p-3 text-muted">
                      <span className="line-clamp-2">{c.address}</span>
                    </td>
                    <td className="p-3 text-muted">{formatJalaliDisplay(c.birthDate)}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openEdit(c)} className="press rounded-xl p-1.5 text-muted hover:bg-white/10" title="ویرایش">
                          <I.edit width={15} />
                        </button>
                        <button onClick={() => remove(c)} className="press rounded-xl p-1.5 text-rose-400 hover:bg-rose-500/10" title="حذف">
                          <I.trash width={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-white/10 px-4 py-2 text-xs text-muted">
          {faNumber(rows.length)} مشتری
        </div>
      </Glass>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "ویرایش مشتری" : "ثبت مشتری جدید"}
      >
        <div className="space-y-3">
          <Field label="نام *">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="نام و نام خانوادگی" />
          </Field>
          <Field label="شماره تلفن *">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="09123456789" dir="ltr" />
          </Field>
          <Field label="آدرس کامل *">
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="آدرس کامل" />
          </Field>
          <JalaliDatePicker
            label="تاریخ تولد"
            required
            allowEmpty={false}
            value={form.birthDate}
            onChange={(birthDate) => setForm({ ...form, birthDate })}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setFormOpen(false)}>انصراف</Btn>
            <Btn onClick={save} disabled={saving}>
              {saving ? <I.refresh className="anim-spin-slow" /> : <I.check />}
              {saving ? "در حال ذخیره..." : "ذخیره"}
            </Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
