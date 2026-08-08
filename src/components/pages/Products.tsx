"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Glass, SectionTitle, Badge, Btn, Input, FullPagePanel } from "../ui";
import { I } from "../icons";
import { toman, faNumber } from "@/lib/format";
import { Barcode, QR } from "../barcode";
import { useApp } from "../context";
import { LabelPrinter, type LabelItem } from "../LabelPrinter";
import { hasPermission } from "@/lib/permissions";

type StockRow = { warehouseId: number; quantity: number | null };
type Variation = {
  id: number; color: string; size: string; price: number | null; sku: string;
  stock?: StockRow[];
};
type Product = {
  id: number; name: string; sku: string; barcode: string; category: string;
  brand: string | null; color: string | null; size: string | null;
  price: number | null; sellingPrice: number | null; status: string | null;
  stock: StockRow[]; variations?: Variation[];
};
type UnitRow = {
  id: number; barcode: string; variationId: number; warehouseId: number | null;
  status: string; warehouseName?: string | null;
};
type WHOption = { id: number; name: string; code: string };

const EMOJI_MAP: Record<string, string> = { "هودی و سوئیشرت": "🧥", "شلوار": "👖", "تی‌شرت": "👕", "پیراهن": "👔", "لباس ورزشی": "🩱", "کت و بلیزر": "🧣", "مانتو": "🥻" };

const STATUS_FA: Record<string, string> = {
  in_stock: "موجود",
  sold: "فروخته",
  in_transit: "در انتقال",
  adjusted_out: "تعدیل‌شده",
};

function QtyStepper({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
}) {
  const clamp = (n: number) => Math.max(min, Math.floor(Number.isFinite(n) ? n : min));
  const bump = (delta: number) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(clamp(value + delta));
  };
  return (
    <div className="flex items-center gap-1.5" dir="ltr">
      <button
        type="button"
        className="press grid h-10 w-10 shrink-0 place-items-center rounded-xl glass-2 text-lg font-bold text-strong hover:bg-white/15"
        onMouseDown={(e) => e.preventDefault()}
        onClick={bump(-1)}
        aria-label="کاهش"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        dir="ltr"
        className="h-10 w-20 rounded-2xl border border-white/20 bg-white/70 px-2 text-center text-base font-bold tabular-nums text-strong outline-none dark:bg-white/8 sm:w-24"
        value={Number.isFinite(value) ? String(value) : "0"}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, "");
          onChange(clamp(raw === "" ? min : Number(raw)));
        }}
        onBlur={(e) => onChange(clamp(Number(e.target.value.replace(/\D/g, "") || min)))}
      />
      <button
        type="button"
        className="press grid h-10 w-10 shrink-0 place-items-center rounded-xl glass-2 text-lg font-bold text-strong hover:bg-white/15"
        onMouseDown={(e) => e.preventDefault()}
        onClick={bump(1)}
        aria-label="افزایش"
      >
        +
      </button>
    </div>
  );
}

export function Products() {
  const { token, toast, user } = useApp();
  const canEdit = hasPermission(user, "edit_product");
  const canDelete = hasPermission(user, "delete_product");
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<WHOption[]>([]);
  const [centralId, setCentralId] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("همه");
  const [selected, setSelected] = useState<Product | null>(null);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [qtyDraft, setQtyDraft] = useState<Record<number, number>>({});
  const [stockSaving, setStockSaving] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    fetch("/api/products", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => d.ok && setProducts(d.products)).catch(() => {});
  }, [token]);

  useEffect(() => {
    load();
    fetch("/api/warehouses").then((r) => r.json()).then((d) => {
      if (!d.ok) return;
      setWarehouses(d.warehouses);
      const central = (d.warehouses as WHOption[]).find((w) => w.code === "main" || w.code === "central");
      setCentralId(central?.id ?? d.warehouses[0]?.id ?? null);
    });
  }, [load]);

  const inStockCount = (variationId: number) =>
    units.filter((u) => u.variationId === variationId && u.status === "in_stock").length;

  const openProduct = async (p: Product) => {
    setSelected(p);
    setQtyDraft({});
    setUnits([]);
    setUnitsLoading(true);
    try {
      const res = await fetch(`/api/products?id=${p.id}&units=1`, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.ok) {
        const prod = d.product ?? p;
        setSelected(prod);
        const u: UnitRow[] = d.units ?? [];
        setUnits(u);
        const draft: Record<number, number> = {};
        for (const v of prod.variations ?? []) {
          draft[v.id] = u.filter((x) => x.variationId === v.id && x.status === "in_stock").length;
        }
        setQtyDraft(draft);
      }
    } catch { toast("خطا در بارگذاری واحدها", "error"); }
    finally { setUnitsLoading(false); }
  };

  const totalStock = (p: Product) => (p.stock ?? []).reduce((a, s) => a + (s.quantity ?? 0), 0);
  const getStatus = (p: Product): "active" | "low" | "out" => {
    const t = totalStock(p);
    if (t === 0) return "out";
    if (t < 10) return "low";
    return "active";
  };

  const filtered = useMemo(() => products.filter((p) =>
    (cat === "همه" || p.category === cat) &&
    (!q || p.name.includes(q) || (p.sku ?? "").toLowerCase().includes(q.toLowerCase()) || p.barcode.includes(q) ||
      (p.variations ?? []).some((v) => v.color.includes(q) || v.size.includes(q)))
  ), [products, q, cat]);

  const allCats = ["همه", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];
  const statusInfo = { active: { tone: "green", label: "موجود" }, low: { tone: "amber", label: "کم" }, out: { tone: "red", label: "ناموجود" } } as const;

  const saveStock = async () => {
    if (!selected) return;
    if (!canEdit) {
      toast("دسترسی تغییر موجودی ندارید", "error");
      return;
    }
    const adjustments: { variationId: number; addQuantity?: number; removeBarcodes?: string[] }[] = [];

    for (const v of selected.variations ?? []) {
      const current = inStockCount(v.id);
      const target = Math.max(0, Math.floor(Number(qtyDraft[v.id] ?? current)));
      if (target === current) continue;
      if (target > current) {
        adjustments.push({ variationId: v.id, addQuantity: target - current });
      } else {
        const removable = units
          .filter((u) => {
            if (u.variationId !== v.id || u.status !== "in_stock") return false;
            if (centralId != null && u.warehouseId != null && u.warehouseId !== centralId) return false;
            return true;
          })
          .slice(0, current - target);
        // fallback: any in_stock if central filter emptied
        const list = removable.length
          ? removable
          : units.filter((u) => u.variationId === v.id && u.status === "in_stock").slice(0, current - target);
        if (list.length < current - target) {
          toast(`برای «${v.color} / ${v.size}» واحد کافی در انبار مرکزی برای کاهش نیست`, "error");
          return;
        }
        adjustments.push({ variationId: v.id, removeBarcodes: list.map((u) => u.barcode) });
      }
    }

    if (!adjustments.length) { toast("تغییری در موجودی نیست", "info"); return; }
    setStockSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productId: selected.id,
          warehouseId: centralId ?? undefined,
          adjustments,
        }),
      });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا", "error"); return; }
      if (d.product) setSelected(d.product);
      const nextUnits: UnitRow[] = d.units ?? [];
      setUnits(nextUnits);
      const draft: Record<number, number> = {};
      for (const v of (d.product?.variations ?? selected.variations ?? [])) {
        draft[v.id] = nextUnits.filter((x) => x.variationId === v.id && x.status === "in_stock").length;
      }
      setQtyDraft(draft);
      load();
      const msgParts = [];
      if (d.added) msgParts.push(`${faNumber(d.added)} واحد اضافه`);
      if (d.removed) msgParts.push(`${faNumber(d.removed)} واحد کاهش`);
      toast(msgParts.length ? msgParts.join(" · ") : "موجودی به‌روز شد");
      const newLabels: LabelItem[] = (d.createdLabels ?? []).map((l: { barcode: string; color: string; size: string; price: number }) => ({
        productName: selected.name,
        color: l.color,
        size: l.size,
        barcode: l.barcode,
        price: l.price,
      }));
      if (newLabels.length) {
        setLabels(newLabels);
        setLabelOpen(true);
      }
    } catch { toast("خطا در ویرایش موجودی", "error"); }
    finally { setStockSaving(false); }
  };

  const exportBarcodes = (onlyInStock = false) => {
    if (!selected) return;
    const list = units.filter((u) => !onlyInStock || u.status === "in_stock");
    if (!list.length) { toast("بارکدی برای خروجی نیست", "error"); return; }
    const varMap = Object.fromEntries((selected.variations ?? []).map((v) => [v.id, v]));
    const lines = [
      "barcode,color,size,status,warehouse",
      ...list.map((u) => {
        const v = varMap[u.variationId];
        return [u.barcode, v?.color ?? "", v?.size ?? "", u.status, u.warehouseName ?? ""].join(",");
      }),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `barcodes-${selected.sku || selected.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`${faNumber(list.length)} بارکد خروجی گرفته شد`);
  };

  const exportBarcodesTxt = () => {
    if (!selected) return;
    const list = units.filter((u) => u.status === "in_stock");
    if (!list.length) { toast("بارکد موجودی برای خروجی نیست", "error"); return; }
    const blob = new Blob([list.map((u) => u.barcode).join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `barcodes-${selected.sku || selected.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printAllLabels = (onlyInStock = true) => {
    if (!selected) return;
    const list = units.filter((u) => !onlyInStock || u.status === "in_stock");
    if (!list.length) { toast("بارکدی برای چاپ نیست", "error"); return; }
    const varMap = Object.fromEntries((selected.variations ?? []).map((v) => [v.id, v]));
    setLabels(list.map((u) => {
      const v = varMap[u.variationId];
      return {
        productName: selected.name,
        color: v?.color ?? "—",
        size: v?.size ?? "—",
        barcode: u.barcode,
        price: Number(v?.price ?? selected.price ?? 0),
      };
    }));
    setLabelOpen(true);
  };

  const deleteProduct = async () => {
    if (!selected) return;
    if (!confirm(`آیا مطمئن هستید که محصول «${selected.name}» به‌طور کامل حذف شود؟\nاین کار قابل بازگشت نیست.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products?id=${selected.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا در حذف", "error"); return; }
      toast(d.mode === "soft" ? "محصول از فهرست حذف شد (تاریخچه فاکتور حفظ شد)" : "محصول به‌طور کامل حذف شد");
      setSelected(null);
      load();
    } catch {
      toast("خطا در اتصال", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="pb-20 md:pb-0">
      <SectionTitle
        icon={<I.box />}
        title="محصولات موجود"
        sub={
          canEdit
            ? `${faNumber(products.length)} محصول — برای جزئیات و ویرایش موجودی روی کارت کلیک کنید`
            : `${faNumber(products.length)} محصول — فقط مشاهده`
        }
      />

      <Glass className="mb-5 flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-center sm:p-4">
        <div className="relative w-full min-w-0 flex-1 sm:min-w-[220px]">
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"><I.search width={18} /></span>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجو: نام، کد، رنگ، سایز..." className="pr-10" />
        </div>
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {allCats.map((c) => (
            <button key={c} onClick={() => setCat(c)} className={`press shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${cat === c ? "grad-brand text-white" : "glass-2 text-muted hover:text-strong"}`}>{c}</button>
          ))}
        </div>
      </Glass>

      <div className="stagger grid grid-cols-1 gap-3 xs:grid-cols-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((p) => {
          const st = getStatus(p); const si = statusInfo[st];
          const emoji = EMOJI_MAP[p.category] ?? "👗";
          const price = p.price ?? p.sellingPrice ?? 0;
          return (
            <Glass key={p.id} hover className="cursor-pointer overflow-hidden p-0" onClick={() => openProduct(p)}>
              <div className="relative grid h-28 place-items-center sm:h-36" style={{ background: "linear-gradient(140deg,rgba(124,77,255,0.18),rgba(6,182,212,0.10))" }}>
                <span className="emoji text-5xl sm:text-6xl">{emoji}</span>
                <div className="absolute right-3 top-3"><Badge tone={si.tone}>{si.label}</Badge></div>
                <div className="absolute left-3 top-3"><span className="rounded-full bg-black/20 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">{p.category}</span></div>
              </div>
              <div className="p-3 sm:p-4">
                <h3 className="truncate text-sm font-bold text-strong">{p.name}</h3>
                <div className="mt-1 text-xs text-muted">{faNumber(p.variations?.length ?? 1)} ورییشن</div>
                <div className="mt-3 flex items-end justify-between gap-2">
                  <div className="min-w-0"><p className="text-[10px] text-muted">قیمت</p><p className="truncate text-sm font-bold grad-text">{toman(price)}</p></div>
                  <div className="shrink-0 text-left"><p className="text-[10px] text-muted">موجودی</p><p className="text-lg font-extrabold text-strong">{faNumber(totalStock(p))}</p></div>
                </div>
              </div>
            </Glass>
          );
        })}
        {!filtered.length && <div className="col-span-full py-16 text-center"><p className="text-5xl mb-3">🔍</p><p className="text-muted">محصولی یافت نشد</p></div>}
      </div>

      <FullPagePanel
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name ?? "کارت محصول"}
        subtitle={selected ? `${selected.brand ?? ""} • ${selected.sku}` : undefined}
        footer={
          <div className="flex flex-wrap justify-between gap-2">
            {canDelete ? (
              <Btn
                variant="danger"
                onClick={deleteProduct}
                disabled={deleting || stockSaving || unitsLoading}
              >
                {deleting ? <I.refresh className="anim-spin-slow" width={16} /> : <I.trash width={16} />}
                حذف کامل محصول
              </Btn>
            ) : <span />}
            <div className="flex flex-wrap justify-end gap-2">
              <Btn variant="ghost" onClick={() => setSelected(null)}>بستن</Btn>
              {canEdit && (
                <Btn onClick={saveStock} disabled={stockSaving || unitsLoading || deleting}>
                  {stockSaving ? <I.refresh className="anim-spin-slow" width={16} /> : <I.check width={16} />}
                  ذخیره موجودی
                </Btn>
              )}
            </div>
          </div>
        }
      >
        {selected && (
          <div className="mx-auto w-full max-w-5xl space-y-4 sm:space-y-5">
            <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
              <div>
                <div className="emoji grid h-28 place-items-center rounded-3xl text-5xl sm:h-36 sm:text-6xl" style={{ background: "linear-gradient(140deg,rgba(124,77,255,0.2),rgba(6,182,212,0.12))" }}>{EMOJI_MAP[selected.category] ?? "👗"}</div>
                <div className="mt-3 flex items-center gap-3 overflow-x-auto rounded-2xl glass-2 p-3 sm:gap-4">
                  <Barcode value={selected.barcode} /><div className="h-12 w-px shrink-0 bg-white/10" /><QR value={selected.barcode} />
                </div>
                <p className="mt-2 text-[11px] text-muted" dir="ltr">بارکد محصول: {selected.barcode}</p>
              </div>
              <div className="space-y-3">
                <div className="rounded-2xl glass-2 p-3">
                  <p className="text-xs text-muted">قیمت</p>
                  <p className="font-bold grad-text text-lg">{toman(selected.price ?? selected.sellingPrice ?? 0)}</p>
                </div>
                <div className="rounded-2xl glass-2 p-4">
                  <p className="text-sm font-bold text-strong mb-2">موجودی به تفکیک انبار</p>
                  {selected.stock.map((s) => {
                    const wh = warehouses.find((w) => w.id === s.warehouseId);
                    return <div key={s.warehouseId} className="flex justify-between gap-2 py-1 text-sm"><span className="truncate text-muted">{wh?.name ?? `انبار ${s.warehouseId}`}</span><span className="shrink-0 font-bold text-strong">{faNumber(s.quantity ?? 0)}</span></div>;
                  })}
                  {!selected.stock.length && <p className="text-xs text-muted">بدون موجودی</p>}
                </div>
              </div>
            </div>

            <div className="rounded-2xl glass-2 p-3 sm:p-4">
              <p className="mb-1 text-sm font-bold text-strong">{canEdit ? "ویرایش موجودی" : "ورییشن‌ها"}</p>
              {canEdit ? (
                <p className="mb-3 text-[11px] leading-5 text-muted">
                  تعداد موجود هر ورییشن را وارد کنید یا با دکمه‌های +/− کم و زیاد کنید. افزایش در انبار مرکزی ساخته می‌شود؛ کاهش از واحدهای موجود همان انبار کم می‌شود.
                </p>
              ) : (
                <p className="mb-3 text-[11px] leading-5 text-muted">
                  فقط مشاهده — برای تغییر موجودی به دسترسی «ویرایش محصول و موجودی» نیاز است.
                </p>
              )}
              <div className="space-y-2">
                {(selected.variations ?? []).map((v) => {
                  const current = inStockCount(v.id);
                  const draft = qtyDraft[v.id] ?? current;
                  const dirty = draft !== current;
                  return (
                    <div key={v.id} className="flex flex-col gap-3 rounded-xl border border-white/8 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-strong">{v.color} / {v.size}</p>
                        <p className="min-h-[1.25rem] text-[11px] text-muted">
                          {toman(v.price ?? 0)} · موجود: {faNumber(current)}
                          {canEdit && (
                            <span className={`mr-2 ${dirty ? "text-brand-500" : "invisible"}`}>→ هدف: {faNumber(draft)}</span>
                          )}
                        </p>
                      </div>
                      {canEdit ? (
                        <QtyStepper
                          value={draft}
                          onChange={(n) => setQtyDraft((m) => ({ ...m, [v.id]: n }))}
                        />
                      ) : null}
                    </div>
                  );
                })}
                {!selected.variations?.length && <p className="text-xs text-muted">ورییشنی ثبت نشده</p>}
              </div>
            </div>

            <div className="rounded-2xl glass-2 p-3 sm:p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <p className="text-sm font-bold text-strong">
                  بارکدهای واحد {unitsLoading ? "..." : `(${faNumber(units.length)})`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Btn variant="ghost" onClick={() => exportBarcodes(false)}><I.download width={14} /> CSV</Btn>
                  <Btn variant="ghost" onClick={exportBarcodesTxt}><I.download width={14} /> TXT</Btn>
                  <Btn variant="soft" onClick={() => printAllLabels(true)}><I.printer width={14} /> چاپ برچسب</Btn>
                </div>
              </div>
              {unitsLoading ? (
                <div className="py-8 text-center"><I.refresh className="anim-spin-slow mx-auto text-muted" /></div>
              ) : (
                <div className="overflow-x-auto -mx-1 px-1">
                  <table className="w-full min-w-[480px] text-xs">
                    <thead className="sticky top-0 bg-[var(--modal-bg)]">
                      <tr className="text-muted border-b border-white/10">
                        <th className="p-2 text-right font-medium">بارکد</th>
                        <th className="p-2 text-right font-medium">ورییشن</th>
                        <th className="p-2 text-right font-medium">وضعیت</th>
                        <th className="p-2 text-right font-medium">انبار</th>
                      </tr>
                    </thead>
                    <tbody>
                      {units.map((u) => {
                        const v = (selected.variations ?? []).find((x) => x.id === u.variationId);
                        return (
                          <tr key={u.id} className="border-b border-white/5">
                            <td className="p-2 font-mono" dir="ltr">{u.barcode}</td>
                            <td className="p-2 text-strong">{v ? `${v.color} / ${v.size}` : "—"}</td>
                            <td className="p-2">
                              <Badge tone={u.status === "in_stock" ? "green" : u.status === "sold" ? "amber" : "red"}>
                                {STATUS_FA[u.status] ?? u.status}
                              </Badge>
                            </td>
                            <td className="p-2 text-muted">{u.warehouseName ?? "—"}</td>
                          </tr>
                        );
                      })}
                      {!units.length && (
                        <tr><td colSpan={4} className="py-8 text-center text-muted">هنوز واحدی ساخته نشده</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </FullPagePanel>

      <LabelPrinter open={labelOpen} onClose={() => setLabelOpen(false)} labels={labels} title="چاپ برچسب واحدها" />
    </div>
  );
}
