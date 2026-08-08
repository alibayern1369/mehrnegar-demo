"use client";

import { useState, useEffect, useCallback } from "react";
import { Glass, SectionTitle, Badge, Btn, Modal, Field, Input, Select } from "../ui";
import { I } from "../icons";
import { faNumber, normalizeBarcode } from "@/lib/format";
import { useApp } from "../context";
import { TransferDeliverySlip, useStoreBrand } from "../TransferDeliverySlip";

type WH = { id: number; name: string; code: string; isActive: boolean };
type WHGroup = { id: number; name: string; isPlaceholder: boolean | null; warehouses: WH[] };
type VariationOpt = {
  id: number; productId: number; productName: string; color: string; size: string;
  available: number; price: number;
};
type DistLine = {
  variationId: number;
  productName: string;
  color: string;
  size: string;
  quantity: number;
  available: number;
  barcodes?: string[];
};
type SearchProduct = {
  id: number;
  name: string;
  availableCount: number;
  units: {
    barcode: string;
    variationId: number;
    color?: string | null;
    size?: string | null;
    price?: number;
  }[];
};
type DocItem = {
  id: number; productName: string; color: string | null; size: string | null; quantity: number;
  barcodeStart: string | null; barcodeEnd: string | null; barcodes?: string[];
};
type Document = {
  id: number; documentNumber: string; type: string; status: string | null;
  notes: string | null; totalItems: number | null; totalQuantity: number | null;
  operatorName: string | null; createdAt: string | Date | null;
  sourceWarehouse: WH | null; destWarehouse: WH | null; items?: DocItem[];
};

export function WarehousesPage() {
  const { token, user, toast } = useApp();
  const storeBrand = useStoreBrand();
  const [groups, setGroups] = useState<WHGroup[]>([]);
  const [warehouses, setWarehouses] = useState<WH[]>([]);
  const [variations, setVariations] = useState<VariationOpt[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [tab, setTab] = useState<"overview" | "docs">("overview");

  const [mode, setMode] = useState<"distribution" | "transfer" | null>(null);
  const [sourceId, setSourceId] = useState<number | "">("");
  const [destId, setDestId] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<DistLine[]>([]);
  const [pickVarId, setPickVarId] = useState<number | "">("");
  const [pickQty, setPickQty] = useState("1");
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);

  const central = warehouses.find((w) => w.code === "main");
  const effectiveSourceId = mode === "distribution" ? central?.id : Number(sourceId || 0);

  const load = useCallback(() => {
    fetch("/api/warehouses").then((r) => r.json()).then((d) => {
      if (d.ok) {
        setGroups(d.groups.filter((g: WHGroup) => !g.isPlaceholder && g.warehouses?.length));
        setWarehouses(d.warehouses);
      }
    });
    fetch("/api/transfers", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => d.ok && setDocuments(d.documents)).catch(() => {});
  }, [token]);

  const loadVariations = useCallback(async (warehouseId: number) => {
    const res = await fetch("/api/products", { headers: { Authorization: `Bearer ${token}` } });
    const d = await res.json();
    if (!d.ok) return;
    const opts: VariationOpt[] = [];
    for (const p of d.products ?? []) {
      for (const v of p.variations ?? []) {
        const stockRow = (v.stock ?? []).find((s: { warehouseId: number }) => s.warehouseId === warehouseId);
        const available = stockRow?.quantity ?? 0;
        if (available > 0) {
          opts.push({
            id: v.id,
            productId: p.id,
            productName: p.name,
            color: v.color,
            size: v.size,
            available,
            price: Number(v.price ?? p.price ?? 0),
          });
        }
      }
    }
    setVariations(opts);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (mode === "distribution" && central) {
      setSourceId(central.id);
      loadVariations(central.id);
    } else if (mode === "transfer" && sourceId) {
      loadVariations(Number(sourceId));
    }
  }, [mode, central, sourceId, loadVariations]);

  useEffect(() => {
    const query = searchInput.trim();
    if (query.length < 2 || !effectiveSourceId) {
      setSearchResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const response = await fetch(
          `/api/products?q=${encodeURIComponent(query)}&warehouseId=${effectiveSourceId}`,
          { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal },
        );
        const data = await response.json();
        if (data.ok) setSearchResults(data.products ?? []);
      } catch {
        if (!controller.signal.aborted) setSearchResults([]);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchInput, effectiveSourceId, token]);

  const openDistribution = () => {
    setMode("distribution");
    setDestId("");
    setNotes("");
    setLines([]);
    setPickVarId("");
    setPickQty("1");
    setSearchInput("");
    setSearchResults([]);
  };

  const openTransfer = () => {
    setMode("transfer");
    setSourceId("");
    setDestId("");
    setNotes("");
    setLines([]);
    setPickVarId("");
    setPickQty("1");
    setSearchInput("");
    setSearchResults([]);
  };

  const addLine = () => {
    const v = variations.find((x) => x.id === Number(pickVarId));
    if (!v) { toast("ورییشن را انتخاب کنید", "error"); return; }
    const qty = Number(pickQty);
    if (!qty || qty < 1) { toast("تعداد نامعتبر", "error"); return; }
    if (qty > v.available) { toast(`موجودی کافی نیست (حداکثر ${v.available})`, "error"); return; }
    const existing = lines.find((l) => l.variationId === v.id && !l.barcodes?.length);
    if (existing) {
      const nextQty = existing.quantity + qty;
      if (nextQty > v.available) { toast("موجودی کافی نیست", "error"); return; }
      setLines(lines.map((l) => (l === existing ? { ...l, quantity: nextQty } : l)));
    } else {
      setLines([...lines, {
        variationId: v.id,
        productName: v.productName,
        color: v.color,
        size: v.size,
        quantity: qty,
        available: v.available,
      }]);
    }
    setPickVarId("");
    setPickQty("1");
  };

  const addUnitBarcode = (opts: {
    variationId: number;
    productName: string;
    color: string;
    size: string;
    barcode: string;
    available: number;
  }) => {
    const code = normalizeBarcode(opts.barcode);
    if (!code) return;
    if (lines.some((l) => l.barcodes?.includes(code))) {
      toast("این بارکد قبلاً اضافه شده", "error");
      return;
    }
    const existing = lines.find((l) => l.variationId === opts.variationId && l.barcodes?.length);
    if (existing) {
      if (existing.quantity + 1 > opts.available) {
        toast("موجودی کافی نیست", "error");
        return;
      }
      setLines(lines.map((l) => (
        l === existing
          ? { ...l, quantity: l.quantity + 1, barcodes: [...(l.barcodes ?? []), code] }
          : l
      )));
    } else {
      setLines([...lines, {
        variationId: opts.variationId,
        productName: opts.productName,
        color: opts.color,
        size: opts.size,
        quantity: 1,
        available: opts.available,
        barcodes: [code],
      }]);
    }
    setSearchInput("");
    setSearchResults([]);
    toast("بارکد اضافه شد");
  };

  const lookupBarcode = async (raw: string) => {
    const code = normalizeBarcode(raw);
    if (!code) return;
    if (!effectiveSourceId) { toast("ابتدا انبار مبدأ را انتخاب کنید", "error"); return; }
    setScanning(true);
    try {
      const bcRes = await fetch(`/api/barcodes?barcode=${encodeURIComponent(code)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const bc = await bcRes.json();
      if (bc.ok && bc.found && bc.type === "unit") {
        const unit = bc.unit;
        const p = bc.product;
        const v = bc.variation;
        if (!p || p.status !== "active") { toast("این محصول غیرفعال است", "error"); return; }
        if (unit.status !== "in_stock") { toast("این واحد موجود نیست", "error"); return; }
        if (unit.warehouseId !== Number(effectiveSourceId)) {
          toast(`این بارکد در انبار مبدأ نیست (${bc.warehouse?.name ?? "—"})`, "error");
          return;
        }
        const stockAvail = variations.find((x) => x.id === unit.variationId)?.available ?? 1;
        addUnitBarcode({
          variationId: unit.variationId,
          productName: p.name,
          color: v?.color ?? "",
          size: v?.size ?? "",
          barcode: code,
          available: stockAvail,
        });
        return;
      }
      toast("بارکد واحد یافت نشد — از جستجوی نام استفاده کنید", "error");
    } catch {
      toast("خطا در جستجوی بارکد", "error");
    } finally {
      setScanning(false);
    }
  };

  const confirmMove = async () => {
    if (!destId) { toast("انبار مقصد را انتخاب کنید", "error"); return; }
    if (mode === "transfer" && !sourceId) { toast("انبار مبدأ را انتخاب کنید", "error"); return; }
    if (!lines.length) { toast("حداقل یک قلم اضافه کنید", "error"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          type: mode,
          sourceWarehouseId: mode === "distribution" ? central?.id : sourceId,
          destWarehouseId: destId,
          notes,
          items: lines.map((l) => ({
            variationId: l.variationId,
            quantity: l.quantity,
            barcodes: l.barcodes?.length ? l.barcodes : undefined,
          })),
        }),
      });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا", "error"); return; }
      toast(`سند ${d.document.documentNumber} ثبت شد`);
      setMode(null);
      load();
      setViewDoc(d.document);
    } catch { toast("خطا در اتصال", "error"); }
    finally { setSaving(false); }
  };

  const openDoc = async (id: number) => {
    const res = await fetch(`/api/transfers?id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await res.json();
    if (d.ok) setViewDoc(d.document);
  };

  const destOptions = warehouses.filter((w) =>
    mode === "distribution" ? w.code !== "main" : w.id !== Number(sourceId)
  );

  return (
    <div>
      <SectionTitle icon={<I.warehouse />} title="مدیریت انبارها"
        sub="توزیع از انبار مرکزی و انتقال بین انبارها"
        action={<div className="flex gap-2">
          <Btn variant="soft" onClick={openDistribution}><I.box width={16} /> توزیع</Btn>
          <Btn onClick={openTransfer}><I.refresh width={16} /> انتقال</Btn>
        </div>} />

      <div className="mb-5 flex gap-2">
        <button onClick={() => setTab("overview")} className={`press rounded-2xl px-4 py-2.5 text-sm font-semibold ${tab === "overview" ? "grad-brand text-white" : "glass-2 text-muted"}`}>نمای انبارها</button>
        <button onClick={() => setTab("docs")} className={`press rounded-2xl px-4 py-2.5 text-sm font-semibold ${tab === "docs" ? "grad-brand text-white" : "glass-2 text-muted"}`}>اسناد انتقال / توزیع</button>
      </div>

      {tab === "overview" && (
        <div className="space-y-5">
          {groups.map((g) => (
            <div key={g.id} className="rounded-3xl border border-brand-400/25 bg-gradient-to-br from-brand-500/20 to-brand-400/5 p-5">
              <div className="mb-4 flex items-center gap-3">
                <I.layers width={20} className="text-brand-500" />
                <h3 className="text-lg font-extrabold text-strong">{g.name}</h3>
                <Badge tone="green">فعال</Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.warehouses.map((w) => (
                  <div key={w.id} className="rounded-2xl glass-2 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="grid h-8 w-8 place-items-center rounded-xl grad-brand text-white"><I.warehouse width={16} /></div>
                      <div>
                        <p className="font-bold text-strong text-sm">{w.name}</p>
                        {w.code === "main" && <p className="text-[10px] text-brand-400">دریافت موجودی جدید</p>}
                      </div>
                    </div>
                    <Badge tone={w.isActive ? "green" : "red"}>{w.isActive ? "فعال" : "غیرفعال"}</Badge>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "docs" && (
        <Glass className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-white/10 text-muted">
                <th className="p-3 text-right font-medium">شماره سند</th>
                <th className="p-3 text-right font-medium">نوع</th>
                <th className="p-3 text-right font-medium">مبدأ</th>
                <th className="p-3 text-right font-medium">مقصد</th>
                <th className="p-3 text-right font-medium">تعداد</th>
                <th className="p-3 text-right font-medium">اپراتور</th>
                <th className="p-3 text-right font-medium">تاریخ</th>
                <th className="p-3"></th>
              </tr></thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d.id} className="border-b border-white/5 hover:bg-white/4">
                    <td className="p-3">
                      <button
                        type="button"
                        dir="ltr"
                        className="cursor-pointer bg-transparent p-0 text-right font-mono text-xs text-brand-400 hover:underline"
                        onClick={() => void openDoc(d.id)}
                        title="مشاهده و چاپ سند"
                      >
                        {d.documentNumber}
                      </button>
                    </td>
                    <td className="p-3"><Badge tone={d.type === "distribution" ? "brand" : "sky"}>{d.type === "distribution" ? "توزیع" : "انتقال"}</Badge></td>
                    <td className="p-3 text-strong">{d.sourceWarehouse?.name ?? "—"}</td>
                    <td className="p-3 text-strong">{d.destWarehouse?.name ?? "—"}</td>
                    <td className="p-3">{faNumber(d.totalQuantity ?? 0)}</td>
                    <td className="p-3 text-muted">{d.operatorName}</td>
                    <td className="p-3 text-xs text-muted">{d.createdAt ? new Date(d.createdAt).toLocaleDateString("fa-IR") : "—"}</td>
                    <td className="p-3"><Btn variant="ghost" onClick={() => openDoc(d.id)}>مشاهده</Btn></td>
                  </tr>
                ))}
                {!documents.length && <tr><td colSpan={8} className="py-12 text-center text-muted">سندی ثبت نشده</td></tr>}
              </tbody>
            </table>
          </div>
        </Glass>
      )}

      <Modal open={!!mode} onClose={() => setMode(null)} title={mode === "distribution" ? "توزیع از انبار مرکزی" : "انتقال بین انبارها"} wide>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {mode === "transfer" && (
              <Field label="انبار مبدأ">
                <Select value={sourceId} onChange={(e) => { setSourceId(Number(e.target.value)); setLines([]); setSearchInput(""); setSearchResults([]); }}>
                  <option value="">انتخاب...</option>
                  {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                </Select>
              </Field>
            )}
            {mode === "distribution" && (
              <Field label="انبار مبدأ">
                <Input value={central?.name ?? "انبار مرکزی"} disabled />
              </Field>
            )}
            <Field label="انبار مقصد">
              <Select value={destId} onChange={(e) => setDestId(Number(e.target.value))}>
                <option value="">انتخاب...</option>
                {destOptions.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </Select>
            </Field>
          </div>

          <div className="rounded-2xl glass-2 p-4 space-y-3">
            <p className="text-sm font-bold text-strong">جستجوی محصول / اسکن بارکد واحد</p>
            <div className="flex gap-2">
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void lookupBarcode(searchInput);
                  }
                }}
                placeholder="نام محصول یا بارکد واحد..."
                disabled={!effectiveSourceId}
              />
              <Btn variant="soft" onClick={() => lookupBarcode(searchInput)} disabled={scanning || !effectiveSourceId}>
                {scanning ? <I.refresh className="anim-spin-slow" width={16} /> : <I.scan width={16} />}
              </Btn>
            </div>
            {(searching || searchResults.length > 0) && searchInput.trim().length >= 2 && (
              <div className="max-h-80 space-y-2 overflow-y-auto rounded-2xl border border-brand-400/25 bg-white/95 p-2 shadow-xl dark:bg-slate-950/95">
                {searching && (
                  <p className="px-3 py-4 text-center text-xs text-muted">در حال جستجوی محصولات...</p>
                )}
                {!searching && searchResults.map((p) => {
                  const units = p.units ?? [];
                  const variationAvail = variations
                    .filter((v) => v.productId === p.id || v.productName === p.name)
                    .reduce((sum, v) => sum + v.available, 0);
                  return (
                    <div key={p.id} className="rounded-xl glass-2 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-bold text-strong">{p.name}</p>
                        <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-bold text-emerald-600">
                          {faNumber(p.availableCount ?? units.length)} بارکد موجود
                        </span>
                      </div>
                      {units.length > 0 ? (
                        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                          {units.map((u) => {
                            const avail = variations.find((v) => v.id === u.variationId)?.available
                              ?? Math.max(1, variationAvail || p.availableCount || 1);
                            return (
                              <button
                                key={u.barcode}
                                type="button"
                                onClick={() => addUnitBarcode({
                                  variationId: u.variationId,
                                  productName: p.name,
                                  color: u.color ?? "",
                                  size: u.size ?? "",
                                  barcode: u.barcode,
                                  available: avail,
                                })}
                                className="press flex min-w-0 items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/50 px-3 py-2 text-right dark:bg-white/5"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-xs font-semibold text-strong">
                                    {[u.color, u.size].filter(Boolean).join(" / ") || "مدل اصلی"}
                                  </span>
                                  <span className="block truncate font-mono text-[10px] text-muted" dir="ltr">{u.barcode}</span>
                                </span>
                                <span className="shrink-0 text-[10px] font-bold text-brand-500">افزودن</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-rose-500">در انبار مبدأ بارکد آماده انتقال ندارد</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-2xl glass-2 p-4 space-y-3">
            <p className="text-sm font-bold text-strong">افزودن تعدادی از لیست (اختیاری)</p>
            <div className="grid gap-2 sm:grid-cols-[1fr_100px_auto]">
              <Select value={pickVarId} onChange={(e) => setPickVarId(Number(e.target.value))}>
                <option value="">محصول / رنگ / سایز...</option>
                {variations.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.productName} — {v.color} / {v.size} (موجود: {v.available})
                  </option>
                ))}
              </Select>
              <Input type="number" value={pickQty} onChange={(e) => setPickQty(e.target.value)} dir="ltr" min={1} />
              <Btn variant="soft" onClick={addLine}><I.plus width={14} /> افزودن</Btn>
            </div>
          </div>

          {lines.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead><tr className="text-muted border-b border-white/10">
                  <th className="p-2 text-right">محصول</th>
                  <th className="p-2 text-right">رنگ</th>
                  <th className="p-2 text-right">سایز</th>
                  <th className="p-2 text-right">تعداد</th>
                  <th className="p-2 text-right">بارکد</th>
                  <th className="p-2"></th>
                </tr></thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={`${l.variationId}-${idx}`} className="border-b border-white/5">
                      <td className="p-2 text-strong">{l.productName}</td>
                      <td className="p-2">{l.color}</td>
                      <td className="p-2">{l.size}</td>
                      <td className="p-2 font-bold">{faNumber(l.quantity)}</td>
                      <td className="p-2 font-mono text-[10px] text-muted" dir="ltr">
                        {l.barcodes?.length ? l.barcodes.join(", ") : "خودکار"}
                      </td>
                      <td className="p-2"><button onClick={() => setLines(lines.filter((_, i) => i !== idx))} className="text-rose-400"><I.trash width={14} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Field label="یادداشت"><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="توضیحات سند..." /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setMode(null)}>انصراف</Btn>
          <Btn onClick={confirmMove} disabled={saving}>{saving ? "..." : <><I.check width={16} /> تأیید و صدور سند</>}</Btn>
        </div>
      </Modal>

      <Modal open={!!viewDoc} onClose={() => setViewDoc(null)} title="حواله انبار / برگه تحویل" wide>
        {viewDoc && (
          <TransferDeliverySlip
            doc={viewDoc}
            brand={storeBrand}
            operatorFallback={user?.name}
            onClose={() => setViewDoc(null)}
          />
        )}
      </Modal>
    </div>
  );
}
