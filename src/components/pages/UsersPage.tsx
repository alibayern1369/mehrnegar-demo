"use client";

import { useCallback, useEffect, useState } from "react";
import { Glass, SectionTitle, Badge, Btn, Field, Input, PasswordInput, Select, Toggle, FullPagePanel } from "../ui";
import { I } from "../icons";
import { useApp } from "../context";
import {
  APP_PERMISSIONS,
  ALL_PERMISSION_IDS,
  DEFAULT_USER_PERMISSIONS,
  sanitizePermissions,
  type AppPermissionId,
} from "@/lib/permissions";
import { SALES_METHODS, type SalesMethodId } from "@/lib/sales-methods";
import { userEmoji } from "@/lib/user-emoji";

type SalesPermRow = {
  warehouseId: number;
  warehouseName: string;
  warehouseCode?: string | null;
  enabled: boolean;
  salesMethods: string[];
};

type UserRow = {
  id: number;
  name: string;
  username: string;
  phone?: string | null;
  gender?: string | null;
  role: string;
  isActive: boolean | null;
  bypassOtp?: boolean | null;
  isBootstrap?: boolean | null;
  permissions?: string[] | null;
  salesPermissions?: SalesPermRow[];
};

const emptyForm = {
  name: "", username: "", password: "", passwordConfirm: "", phone: "", gender: "male", role: "user",
};

export function UsersPage() {
  const { token, toast, user: me } = useApp();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<UserRow | null>(null);
  const [permUser, setPermUser] = useState<UserRow | null>(null);
  const [permDraft, setPermDraft] = useState<AppPermissionId[]>([]);
  const [salesDraft, setSalesDraft] = useState<SalesPermRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState({
    name: "", username: "", password: "", passwordConfirm: "", phone: "", gender: "male", role: "user", isActive: true,
  });

  const load = useCallback(() => {
    fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => d.ok && setUsers(d.users))
      .catch(() => {});
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const openPerms = (u: UserRow) => {
    setPermUser(u);
    if (u.role === "manager" || u.permissions?.includes("all")) {
      setPermDraft([...ALL_PERMISSION_IDS]);
    } else {
      const list = sanitizePermissions(u.permissions ?? []);
      setPermDraft(list.length ? list : [...DEFAULT_USER_PERMISSIONS]);
    }
    setSalesDraft(
      (u.salesPermissions ?? []).map((p) => ({
        ...p,
        enabled: p.enabled !== false,
        salesMethods: [...(p.salesMethods ?? [])],
      })),
    );
  };

  const openEdit = (u: UserRow) => {
    setEditProfile(u);
    setEditForm({
      name: u.name,
      username: u.username,
      password: "",
      passwordConfirm: "",
      phone: u.phone ?? "",
      gender: u.gender === "female" ? "female" : "male",
      role: u.role,
      isActive: u.isActive !== false,
    });
  };

  const togglePerm = (id: AppPermissionId) => {
    setPermDraft((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSalesMethod = (warehouseId: number, methodId: SalesMethodId) => {
    setSalesDraft((prev) => prev.map((row) => {
      if (row.warehouseId !== warehouseId) return row;
      const has = row.salesMethods.includes(methodId);
      const next = has ? row.salesMethods.filter((m) => m !== methodId) : [...row.salesMethods, methodId];
      return { ...row, salesMethods: next };
    }));
  };

  const toggleWarehouse = (warehouseId: number, enabled: boolean) => {
    setSalesDraft((prev) => prev.map((row) => (
      row.warehouseId === warehouseId
        ? { ...row, enabled, salesMethods: enabled && !row.salesMethods.length ? ["normal"] : row.salesMethods }
        : row
    )));
  };

  const savePerms = async () => {
    if (!permUser) return;
    if (permUser.role === "manager") {
      toast("مدیران به‌صورت پیش‌فرض به همه بخش‌ها دسترسی دارند", "info");
      setPermUser(null);
      return;
    }
    setSaving(true);
    try {
      const resSections = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "update",
          userId: permUser.id,
          sectionPermissions: permDraft,
        }),
      });
      const d1 = await resSections.json();
      if (!d1.ok) { toast(d1.error ?? "خطا", "error"); return; }

      if (salesDraft.length) {
        const resSales = await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            action: "permissions",
            userId: permUser.id,
            permissions: salesDraft.map((r) => ({
              warehouseId: r.warehouseId,
              enabled: r.enabled,
              salesMethods: r.salesMethods,
            })),
          }),
        });
        const d2 = await resSales.json();
        if (!d2.ok) { toast(d2.error ?? "خطا در ذخیره روش‌های فروش", "error"); return; }
      }

      toast("دسترسی بخش‌ها و روش‌های فروش ذخیره شد");
      setPermUser(null);
      load();
    } catch { toast("خطا در ذخیره", "error"); }
    finally { setSaving(false); }
  };

  const createUser = async () => {
    if (!form.password) {
      toast("رمز عبور الزامی است", "error");
      return;
    }
    if (form.password !== form.passwordConfirm) {
      toast("رمز عبور و تکرار آن یکسان نیست", "error");
      return;
    }
    setSaving(true);
    try {
      const { passwordConfirm: _, ...payload } = form;
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا", "error"); return; }
      toast("کاربر ایجاد شد");
      setAddOpen(false);
      setForm(emptyForm);
      load();
    } catch { toast("خطا", "error"); }
    finally { setSaving(false); }
  };

  const saveProfile = async () => {
    if (!editProfile) return;
    if (!editForm.name.trim() || !editForm.username.trim()) {
      toast("نام و نام کاربری الزامی است", "error");
      return;
    }
    if (editForm.password || editForm.passwordConfirm) {
      if (!editForm.password) {
        toast("رمز جدید را وارد کنید", "error");
        return;
      }
      if (editForm.password !== editForm.passwordConfirm) {
        toast("رمز عبور و تکرار آن یکسان نیست", "error");
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "update",
          userId: editProfile.id,
          name: editForm.name,
          username: editForm.username,
          phone: editForm.phone || null,
          gender: editForm.gender,
          isActive: editForm.isActive,
          ...(editForm.password ? { password: editForm.password } : {}),
        }),
      });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا", "error"); return; }
      toast("اطلاعات کاربر ذخیره شد");
      setEditProfile(null);
      load();
    } catch { toast("خطا در ذخیره", "error"); }
    finally { setSaving(false); }
  };

  const deleteUser = async (u: UserRow) => {
    if (u.id === me?.id) { toast("نمی‌توانید خودتان را حذف کنید", "error"); return; }
    if (!confirm(`کاربر «${u.name}» حذف شود؟`)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "delete", userId: u.id }),
      });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا", "error"); return; }
      toast("کاربر حذف شد");
      if (editProfile?.id === u.id) setEditProfile(null);
      load();
    } catch { toast("خطا در حذف", "error"); }
    finally { setSaving(false); }
  };

  const activeUsers = users.filter((u) => u.isActive !== false && !String(u.username).includes("__deleted_"));

  const permCount = (u: UserRow) => {
    if (u.role === "manager" || u.permissions?.includes("all")) return ALL_PERMISSION_IDS.length;
    return sanitizePermissions(u.permissions ?? []).length;
  };

  return (
    <div>
      <SectionTitle
        icon={<I.users />}
        title="کاربران و دسترسی بخش‌ها"
        sub="برای هر کاربر، بخش‌ها، انبارهای مجاز و روش‌های فروش را مستقل تعیین کنید"
        action={<Btn onClick={() => { setForm(emptyForm); setAddOpen(true); }}><I.plus width={16} /> کاربر جدید</Btn>}
      />

      <Glass className="p-5">
        <div className="space-y-2">
          {activeUsers.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-2xl glass-2 px-4 py-3">
              <span className="emoji grid h-11 w-11 place-items-center rounded-2xl bg-white/10 text-2xl">
                {userEmoji(u)}
              </span>
              <div className="min-w-[160px] flex-1">
                <p className="text-sm font-semibold text-strong">{u.name}</p>
                <p className="text-xs text-muted" dir="ltr">@{u.username}{u.phone ? ` · ${u.phone}` : ""}</p>
                <p className="mt-0.5 text-[11px] text-muted">{faPermLabel(permCount(u))} دسترسی فعال</p>
              </div>
              <Badge tone={u.role === "manager" ? "brand" : "green"}>
                {u.role === "manager" ? "مدیر" : "کاربر"}
              </Badge>
              {u.isBootstrap && <Badge tone="amber">راه‌اندازی</Badge>}
              {u.bypassOtp && <Badge tone="amber">بدون OTP</Badge>}
              {!u.phone && !u.bypassOtp && <Badge tone="red">بدون موبایل</Badge>}
              <div className="flex flex-wrap gap-2">
                <Btn variant="ghost" onClick={() => openEdit(u)}><I.edit width={14} /> ویرایش</Btn>
                <Btn variant="ghost" onClick={() => openPerms(u)}><I.shield width={14} /> دسترسی‌ها</Btn>
                <Btn variant="danger" onClick={() => deleteUser(u)} disabled={u.id === me?.id || saving}>
                  <I.trash width={14} /> حذف
                </Btn>
              </div>
            </div>
          ))}
          {!activeUsers.length && <p className="py-10 text-center text-muted">کاربری یافت نشد</p>}
        </div>
      </Glass>

      <FullPagePanel
        open={!!permUser}
        onClose={() => setPermUser(null)}
        title={`دسترسی‌ها — ${permUser?.name ?? ""}`}
        subtitle={permUser?.role === "manager" ? "مدیران به همه بخش‌ها دسترسی دارند" : "بخش‌ها و روش‌های فروش را تنظیم کنید"}
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setPermUser(null)}>انصراف</Btn>
            <Btn onClick={savePerms} disabled={saving || permUser?.role === "manager"}>
              {saving ? "..." : "ذخیره دسترسی‌ها"}
            </Btn>
          </div>
        }
      >
        <div className="mx-auto max-w-2xl space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-bold text-strong">دسترسی بخش‌های نرم‌افزار</h3>
            <div className="mb-3 flex flex-wrap gap-2">
              <Btn variant="soft" onClick={() => setPermDraft([...ALL_PERMISSION_IDS])} disabled={permUser?.role === "manager"}>
                همه
              </Btn>
              <Btn variant="ghost" onClick={() => setPermDraft([...DEFAULT_USER_PERMISSIONS])} disabled={permUser?.role === "manager"}>
                پیش‌فرض فروشنده
              </Btn>
              <Btn variant="ghost" onClick={() => setPermDraft([])} disabled={permUser?.role === "manager"}>
                هیچ‌کدام
              </Btn>
            </div>
            <div className="space-y-2">
              {APP_PERMISSIONS.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center justify-between gap-3 rounded-2xl glass-2 px-4 py-3 ${permUser?.role === "manager" ? "opacity-70" : "cursor-pointer"}`}
                >
                  <div>
                    <p className="text-sm font-semibold text-strong">{p.label}</p>
                    <p className="text-[11px] text-muted" dir="ltr">{p.id}</p>
                  </div>
                  <Toggle
                    on={permDraft.includes(p.id)}
                    onChange={() => permUser?.role !== "manager" && togglePerm(p.id)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-bold text-strong">دسترسی فروش در هر انبار</h3>
            <p className="mb-3 text-xs text-muted">
              هر تعداد انبار را فعال و برای هر انبار یک یا چند روش پرداخت انتخاب کنید
            </p>
            {!salesDraft.length ? (
              <p className="rounded-2xl glass-2 px-4 py-6 text-center text-sm text-muted">انبار فعالی تعریف نشده</p>
            ) : (
              <div className="space-y-3">
                {salesDraft.map((row) => (
                  <div key={row.warehouseId} className={`rounded-2xl glass-2 p-4 ${row.enabled ? "" : "opacity-70"}`}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-strong">
                          {row.warehouseName}
                          {row.warehouseCode ? <span className="mr-2 text-xs font-normal text-muted" dir="ltr">{row.warehouseCode}</span> : null}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted">{row.enabled ? "فروش در این انبار مجاز است" : "بدون دسترسی فروش"}</p>
                      </div>
                      <Toggle
                        on={row.enabled}
                        onChange={(enabled) => permUser?.role !== "manager" && toggleWarehouse(row.warehouseId, enabled)}
                      />
                    </div>
                    <div className="space-y-2 border-t border-white/10 pt-3">
                      {SALES_METHODS.map((m) => (
                        <label
                          key={m.id}
                          className={`flex items-center justify-between gap-3 rounded-xl bg-white/5 px-3 py-2.5 ${permUser?.role === "manager" || !row.enabled ? "opacity-50" : "cursor-pointer"}`}
                        >
                          <span className="text-sm text-strong">{m.label}</span>
                          <Toggle
                            on={row.salesMethods.includes(m.id)}
                            onChange={() => permUser?.role !== "manager" && row.enabled && toggleSalesMethod(row.warehouseId, m.id)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </FullPagePanel>

      <FullPagePanel
        open={!!editProfile}
        onClose={() => setEditProfile(null)}
        title={`ویرایش کاربر — ${editProfile?.name ?? ""}`}
        footer={
          <div className="flex flex-wrap justify-between gap-2">
            <Btn variant="danger" onClick={() => editProfile && deleteUser(editProfile)} disabled={editProfile?.id === me?.id || saving}>
              <I.trash width={14} /> حذف کاربر
            </Btn>
            <div className="flex gap-2">
              <Btn variant="ghost" onClick={() => setEditProfile(null)}>انصراف</Btn>
              <Btn onClick={saveProfile} disabled={saving}>{saving ? "..." : "ذخیره تغییرات"}</Btn>
            </div>
          </div>
        }
      >
        <div className="mx-auto max-w-xl space-y-4">
          <Field label="نام و نام خانوادگی">
            <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          </Field>
          <Field label="نام کاربری">
            <Input dir="ltr" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="رمز جدید (اختیاری)">
              <PasswordInput
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="بدون تغییر خالی بگذارید"
                autoComplete="new-password"
              />
            </Field>
            <Field label="تکرار رمز جدید">
              <PasswordInput
                value={editForm.passwordConfirm}
                onChange={(e) => setEditForm({ ...editForm, passwordConfirm: e.target.value })}
                placeholder="تکرار رمز"
                autoComplete="new-password"
              />
            </Field>
          </div>
          <Field label="موبایل (برای OTP)">
            <Input dir="ltr" placeholder="09xxxxxxxxx" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          </Field>
          <Field label="جنسیت">
            <Select value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
              <option value="male">مرد 👨</option>
              <option value="female">خانم 👩</option>
            </Select>
          </Field>
          <label className="flex items-center gap-3 text-sm text-strong">
            <Toggle on={editForm.isActive} onChange={(v) => setEditForm({ ...editForm, isActive: v })} />
            حساب فعال
          </label>
        </div>
      </FullPagePanel>

      <FullPagePanel
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="افزودن کاربر جدید"
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setAddOpen(false)}>انصراف</Btn>
            <Btn onClick={createUser} disabled={saving}><I.check width={16} /> ایجاد</Btn>
          </div>
        }
      >
        <div className="mx-auto max-w-xl space-y-4">
          <Field label="نام و نام خانوادگی"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="نام کاربری">
            <Input dir="ltr" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="رمز موقت">
              <PasswordInput
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
              />
            </Field>
            <Field label="تکرار رمز">
              <PasswordInput
                value={form.passwordConfirm}
                onChange={(e) => setForm({ ...form, passwordConfirm: e.target.value })}
                autoComplete="new-password"
              />
            </Field>
          </div>
          <Field label="موبایل (برای OTP)">
            <Input dir="ltr" placeholder="09xxxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="جنسیت">
              <Select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="male">مرد 👨</option>
                <option value="female">خانم 👩</option>
              </Select>
            </Field>
            <Field label="نقش">
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="user">کاربر (فروشنده)</option>
                <option value="manager">مدیر</option>
              </Select>
            </Field>
          </div>
          <div className="flex items-center gap-3 rounded-2xl glass-2 px-4 py-3 text-sm text-strong">
            <span className="emoji text-2xl">{form.gender === "female" ? "👩" : "👨"}</span>
            <span>پیش‌نمایش آواتار کاربر</span>
          </div>
          <p className="text-xs text-muted">پس از ایجاد می‌توانید دسترسی بخش‌ها و روش‌های فروش را از دکمه «دسترسی‌ها» تنظیم کنید.</p>
        </div>
      </FullPagePanel>
    </div>
  );
}

function faPermLabel(n: number) {
  return n.toLocaleString("fa-IR");
}
