"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Glass, Btn, Field, Input, Select, Modal } from "../ui";
import { I } from "../icons";
import { useApp } from "../context";
import { faNumber, toman, signedToman, faDate, faTime } from "@/lib/format";
import { useStoreBrand } from "../TransferDeliverySlip";
import { openPrintReport, downloadCsv } from "@/lib/report-export";

type WH = { id: number; name: string; code: string };

type ProductOpt = {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  price: number;
  systemQty: number;
  variationCount: number;
  avgUnitPrice: number;
};

type VariationRow = {
  variationId: number;
  color: string;
  size: string;
  price: number;
  systemQty: number;
};

type CheckResult = {
  warehouseId: number;
  warehouseName: string;
  productId: number;
  productName: string;
  sku: string;
  barcode: string;
  declaredQty: number;
  systemQty: number;
  qtyDiff: number;
  unitPrice: number;
  amountDiff: number;
  stockValue: number;
  level: "match" | "partial" | "mismatch";
  message: string;
  issues: string[];
  variations: VariationRow[];
  checkedAt: string;
  checkedBy: string;
  sessionId?: number;
};

type SessionRow = {
  id: number;
  sessionNumber: string;
  warehouseId: number;
  warehouseName: string;
  status: string;
  mode: string;
  expectedProductCount: number | null;
  checkedProductCount: number | null;
  matchCount: number | null;
  partialCount: number | null;
  mismatchCount: number | null;
  shortageQty: number | null;
  surplusQty: number | null;
  shortageAmount: number | null;
  surplusAmount: number | null;
  notes?: string | null;
  operatorName?: string | null;
  startedAt?: string | Date | null;
  completedAt?: string | Date | null;
};

type CheckedItem = {
  productId: number;
  productName: string;
  sku: string | null;
  barcode: string | null;
  systemQty: number;
  declaredQty: number;
  qtyDiff: number;
  unitPrice: number | null;
  amountDiff: number | null;
  level: "match" | "partial" | "mismatch";
  message: string | null;
  variationsSnapshot?: VariationRow[] | null;
};

function levelStyles(level: CheckResult["level"]) {
  if (level === "match") {
    return {
      card: "bg-emerald-500/15 ring-1 ring-emerald-500/40",
      badge: "bg-emerald-500 text-white",
      label: "همخوانی کامل",
      text: "text-emerald-500",
      row: "bg-emerald-500/15 ring-1 ring-emerald-500/35",
    };
  }
  if (level === "partial") {
    return {
      card: "bg-amber-500/15 ring-1 ring-amber-500/40",
      badge: "bg-amber-500 text-white",
      label: "اختلاف جزئی",
      text: "text-amber-500",
      row: "bg-amber-500/15 ring-1 ring-amber-500/35",
    };
  }
  return {
    card: "bg-rose-500/15 ring-1 ring-rose-500/40",
    badge: "bg-rose-500 text-white",
    label: "تناقض زیاد",
    text: "text-rose-500",
    row: "bg-rose-500/15 ring-1 ring-rose-500/35",
  };
}

export function StocktakePage() {
  const { token, toast, user } = useApp();
  const storeBrand = useStoreBrand();
  const [warehouses, setWarehouses] = useState<WH[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | "">("");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductOpt[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selected, setSelected] = useState<ProductOpt | null>(null);
  const [declaredQty, setDeclaredQty] = useState("");
  const [checking, setChecking] = useState(false);
  const [current, setCurrent] = useState<CheckResult | null>(null);
  const [checkedMap, setCheckedMap] = useState<Record<number, CheckedItem>>({});
  const [session, setSession] = useState<SessionRow | null>(null);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [historySessions, setHistorySessions] = useState<SessionRow[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSession, setReportSession] = useState<SessionRow | null>(null);
  const [reportItems, setReportItems] = useState<CheckedItem[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    fetch("/api/warehouses").then((r) => r.json()).then((d) => {
      if (!d.ok) return;
      const list = (d.warehouses as WH[]).filter((w) => w.code !== "website" && w.code !== "digikala");
      setWarehouses(list);
      if (list.length) setWarehouseId(list[0].id);
    });
  }, []);

  const loadProducts = useCallback(async (whId: number, q: string) => {
    setLoadingList(true);
    try {
      const url = `/api/stocktake?warehouseId=${whId}${q.trim() ? `&q=${encodeURIComponent(q.trim())}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا", "error"); return; }
      setProducts(d.products ?? []);
    } catch {
      toast("خطا در بارگذاری محصولات", "error");
    } finally {
      setLoadingList(false);
    }
  }, [token, toast]);

  const loadActiveSession = useCallback(async (whId: number) => {
    try {
      const res = await fetch(`/api/stocktake?warehouseId=${whId}&active=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!d.ok) return;
      setSession(d.session ?? null);
      const map: Record<number, CheckedItem> = {};
      for (const it of d.items ?? []) {
        map[it.productId] = it;
      }
      setCheckedMap(map);
    } catch { /* ignore */ }
  }, [token]);

  const loadHistory = useCallback(async (whId?: number) => {
    try {
      const url = `/api/stocktake?sessions=1${whId ? `&warehouseId=${whId}` : ""}&limit=20`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.ok) setHistorySessions(d.sessions ?? []);
    } catch { /* ignore */ }
  }, [token]);

  useEffect(() => {
    if (!warehouseId) return;
    setSelected(null);
    setCurrent(null);
    setDeclaredQty("");
    setQuery("");
    void loadProducts(Number(warehouseId), "");
    void loadActiveSession(Number(warehouseId));
    void loadHistory(Number(warehouseId));
  }, [warehouseId, loadProducts, loadActiveSession, loadHistory]);

  const search = () => {
    if (!warehouseId) { toast("انبار را انتخاب کنید", "error"); return; }
    void loadProducts(Number(warehouseId), query);
  };

  const startSession = async (mode: "full" | "selective") => {
    if (!warehouseId) return;
    setStarting(true);
    try {
      const res = await fetch("/api/stocktake", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "start", warehouseId: Number(warehouseId), mode }),
      });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا", "error"); return; }
      setSession(d.session);
      setCheckedMap({});
      setSelected(null);
      setCurrent(null);
      await loadProducts(Number(warehouseId), "");
      toast(mode === "full" ? "چک‌لیست کامل انبار آماده است" : "جلسه انتخابی شروع شد");
      void loadHistory(Number(warehouseId));
    } catch {
      toast("خطا در شروع جلسه", "error");
    } finally {
      setStarting(false);
    }
  };

  const pickProduct = (p: ProductOpt) => {
    setSelected(p);
    const existing = checkedMap[p.id];
    setDeclaredQty(existing ? String(existing.declaredQty) : "");
    setCurrent(existing ? {
      warehouseId: Number(warehouseId),
      warehouseName: session?.warehouseName ?? "",
      productId: existing.productId,
      productName: existing.productName,
      sku: existing.sku ?? "",
      barcode: existing.barcode ?? "",
      declaredQty: existing.declaredQty,
      systemQty: existing.systemQty,
      qtyDiff: existing.qtyDiff,
      unitPrice: Number(existing.unitPrice) || 0,
      amountDiff: Number(existing.amountDiff) || 0,
      stockValue: 0,
      level: existing.level,
      message: existing.message ?? "",
      issues: [],
      variations: existing.variationsSnapshot ?? [],
      checkedAt: new Date().toISOString(),
      checkedBy: "",
      sessionId: session?.id,
    } : null);
  };

  const runCheck = async () => {
    if (!warehouseId || !selected) return;
    if (!session) {
      toast("ابتدا جلسه انبارگردانی را شروع کنید", "error");
      return;
    }
    const qty = Number(declaredQty);
    if (!Number.isFinite(qty) || qty < 0) {
      toast("تعداد اظهار را وارد کنید", "error");
      return;
    }
    setChecking(true);
    try {
      const res = await fetch("/api/stocktake", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          action: "check",
          sessionId: session.id,
          warehouseId: Number(warehouseId),
          productId: selected.id,
          declaredQty: qty,
        }),
      });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا", "error"); return; }
      const result = d.result as CheckResult;
      setCurrent(result);
      if (d.session) setSession(d.session);
      setCheckedMap((prev) => ({
        ...prev,
        [result.productId]: {
          productId: result.productId,
          productName: result.productName,
          sku: result.sku,
          barcode: result.barcode,
          systemQty: result.systemQty,
          declaredQty: result.declaredQty,
          qtyDiff: result.qtyDiff,
          unitPrice: result.unitPrice,
          amountDiff: result.amountDiff,
          level: result.level,
          message: result.message,
          variationsSnapshot: result.variations,
        },
      }));
      toast(result.level === "match" ? "همخوانی کامل — سبز شد" : "اختلاف ثبت شد");
    } catch {
      toast("خطا در بررسی", "error");
    } finally {
      setChecking(false);
    }
  };

  const openSessionReport = useCallback(async (sess: SessionRow, items?: CheckedItem[]) => {
    setReportSession(sess);
    setReportOpen(true);
    if (items) {
      setReportItems(items);
      return;
    }
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/stocktake?sessionId=${sess.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.ok) {
        setReportItems(d.items ?? []);
        if (d.session) setReportSession(d.session);
      }
    } catch {
      toast("خطا در بارگذاری گزارش", "error");
    } finally {
      setLoadingReport(false);
    }
  }, [token, toast]);

  const completeSession = async (force = false) => {
    if (!session) return;
    setCompleting(true);
    try {
      const res = await fetch("/api/stocktake", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "complete", sessionId: session.id, force }),
      });
      const d = await res.json();
      if (!d.ok) {
        if (d.incomplete && d.remaining) {
          const ok = confirm(
            `${d.error}\n\nآیا می‌خواهید جلسه را به‌صورت ناقص ببندید؟\n(سوابق در گزارش‌ها ثبت می‌شود)`,
          );
          if (ok) {
            await completeSession(true);
          }
          return;
        }
        toast(d.error ?? "خطا", "error");
        return;
      }
      setSession(d.session);
      toast(d.message ?? "جلسه ثبت شد");
      void loadHistory(Number(warehouseId));
      const items = Object.values(checkedMap);
      if (d.session) {
        void openSessionReport(d.session, items);
      }
    } catch {
      toast("خطا در اتمام جلسه", "error");
    } finally {
      setCompleting(false);
    }
  };

  const printStocktakeReport = () => {
    if (!reportSession) return;
    const levelLabel = (level: string) =>
      level === "match" ? "همخوانی" : level === "partial" ? "اختلاف جزئی" : "تناقض";
    const ok = openPrintReport({
      title: "گزارش انبارگردانی",
      docLabel: reportSession.sessionNumber,
      subtitle: `${reportSession.warehouseName} · ${
        reportSession.status === "completed" ? "کامل" : reportSession.status === "partial" ? "ناقص" : reportSession.status
      }`,
      headers: ["محصول", "کد", "سیستم", "اعلامی", "اختلاف", "مبلغ اختلاف", "وضعیت"],
      rows: reportItems.map((it) => [
        it.productName,
        it.sku || it.barcode || "—",
        faNumber(it.systemQty),
        faNumber(it.declaredQty),
        faNumber(it.qtyDiff),
        toman(Math.abs(Number(it.amountDiff) || 0)),
        levelLabel(it.level),
      ]),
      summaryCards: [
        { label: "بررسی‌شده", value: `${faNumber(reportSession.checkedProductCount ?? reportItems.length)} / ${faNumber(reportSession.expectedProductCount ?? 0)}` },
        { label: "همخوانی", value: faNumber(reportSession.matchCount ?? reportItems.filter((i) => i.level === "match").length) },
        { label: "کسری تعداد", value: faNumber(reportSession.shortageQty ?? 0) },
        { label: "مازاد تعداد", value: faNumber(reportSession.surplusQty ?? 0) },
        { label: "مبلغ کسری", value: toman(reportSession.shortageAmount ?? 0) },
        { label: "مبلغ مازاد", value: toman(reportSession.surplusAmount ?? 0) },
        { label: "اپراتور", value: reportSession.operatorName || user?.name || "—" },
        { label: "تاریخ اتمام", value: reportSession.completedAt ? new Date(reportSession.completedAt).toLocaleString("fa-IR") : faDate() },
      ],
      brand: {
        businessName: storeBrand.businessName,
        businessLogo: storeBrand.businessLogo,
        address: storeBrand.address,
        phone: storeBrand.phone,
        website: storeBrand.website,
      },
      operatorName: user?.name,
      meta: [
        { label: "شماره جلسه", value: reportSession.sessionNumber },
        { label: "انبار", value: reportSession.warehouseName },
        { label: "وضعیت", value: reportSession.status === "completed" ? "کامل" : "ناقص" },
        { label: "ساعت چاپ", value: faTime() },
      ],
    });
    if (!ok) toast("اجازه پاپ‌آپ برای چاپ/PDF لازم است", "error");
  };

  const exportStocktakeExcel = () => {
    if (!reportSession) return;
    downloadCsv(
      `انبارگردانی-${reportSession.sessionNumber}.xls`,
      ["محصول", "SKU", "بارکد", "موجودی سیستم", "اعلامی", "اختلاف تعداد", "اختلاف مبلغ", "وضعیت", "پیام"],
      reportItems.map((it) => [
        it.productName,
        it.sku ?? "",
        it.barcode ?? "",
        it.systemQty,
        it.declaredQty,
        it.qtyDiff,
        it.amountDiff ?? 0,
        it.level,
        it.message ?? "",
      ]),
      {
        title: `گزارش انبارگردانی ${reportSession.sessionNumber}`,
        brand: {
          businessName: storeBrand.businessName,
          businessLogo: storeBrand.businessLogo,
          address: storeBrand.address,
          phone: storeBrand.phone,
          website: storeBrand.website,
        },
        summaryLines: [
          `انبار: ${reportSession.warehouseName}`,
          `کسری: ${reportSession.shortageQty ?? 0} · مازاد: ${reportSession.surplusQty ?? 0}`,
          `مبلغ کسری: ${reportSession.shortageAmount ?? 0} · مبلغ مازاد: ${reportSession.surplusAmount ?? 0}`,
        ],
      },
    );
    toast("فایل Excel دانلود شد");
  };

  const remaining = useMemo(() => {
    const expected = session?.expectedProductCount ?? products.length;
    return Math.max(0, expected - Object.keys(checkedMap).length);
  }, [session, products.length, checkedMap]);

  const sessionSummary = useMemo(() => {
    const items = Object.values(checkedMap);
    const match = items.filter((h) => h.level === "match").length;
    const partial = items.filter((h) => h.level === "partial").length;
    const mismatch = items.filter((h) => h.level === "mismatch").length;
    const shortageQty = items.reduce((a, h) => a + (h.qtyDiff < 0 ? Math.abs(h.qtyDiff) : 0), 0);
    const surplusQty = items.reduce((a, h) => a + (h.qtyDiff > 0 ? h.qtyDiff : 0), 0);
    const shortageAmount = items.reduce((a, h) => a + (h.qtyDiff < 0 ? Math.abs(Number(h.amountDiff) || 0) : 0), 0);
    const surplusAmount = items.reduce((a, h) => a + (h.qtyDiff > 0 ? (Number(h.amountDiff) || 0) : 0), 0);
    return { match, partial, mismatch, shortageQty, surplusQty, shortageAmount, surplusAmount, checked: items.length };
  }, [checkedMap]);

  const filteredProducts = useMemo(() => {
    if (!query.trim()) return products;
    const q = query.trim().toLowerCase();
    return products.filter((p) =>
      p.name.toLowerCase().includes(q)
      || p.sku.toLowerCase().includes(q)
      || p.barcode.includes(q),
    );
  }, [products, query]);

  const styles = current ? levelStyles(current.level) : null;
  const sessionOpen = session?.status === "in_progress";

  return (
    <div>
      <div className="mb-5 flex min-w-0 items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-teal-500 text-white sm:h-11 sm:w-11">
          <I.layers />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold leading-snug text-strong sm:text-xl">انبارگردانی</h1>
          <p className="mt-0.5 text-xs leading-5 text-muted sm:text-sm">
            چک‌لیست کامل محصولات انبار — هر مورد بررسی‌شده سبز می‌شود و سوابق در گزارش‌ها ذخیره می‌گردد
          </p>
        </div>
      </div>

      <Glass className="mb-5 space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr_auto]">
          <Field label="انبار">
            <Select
              value={warehouseId}
              onChange={(e) => setWarehouseId(Number(e.target.value))}
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="فیلتر در چک‌لیست">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="نام، کد یا بارکد..."
              disabled={!sessionOpen}
            />
          </Field>
          <div className="flex flex-wrap items-end gap-2">
            {!sessionOpen ? (
              <>
                <Btn onClick={() => startSession("full")} disabled={starting || !warehouseId}>
                  {starting ? <I.refresh className="anim-spin-slow" width={16} /> : <I.check width={16} />}
                  شروع چک‌لیست کامل
                </Btn>
                <Btn variant="soft" onClick={() => startSession("selective")} disabled={starting || !warehouseId}>
                  چند محصول انتخابی
                </Btn>
              </>
            ) : (
              <Btn variant="soft" onClick={search} disabled={loadingList}>
                {loadingList ? <I.refresh className="anim-spin-slow" width={16} /> : <I.search width={16} />}
                جستجو
              </Btn>
            )}
          </div>
        </div>

        {session && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl glass-2 px-3 py-2 text-xs">
            <span className="font-mono text-brand-400" dir="ltr">{session.sessionNumber}</span>
            <span className="text-muted">·</span>
            <span className="text-strong">
              {session.status === "in_progress" ? "در حال انجام" : session.status === "completed" ? "کامل" : "ناقص"}
            </span>
            <span className="text-muted">·</span>
            <span className="text-muted">
              بررسی‌شده {faNumber(sessionSummary.checked)} از {faNumber(session.expectedProductCount ?? products.length)}
            </span>
            {remaining > 0 && sessionOpen && (
              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 font-bold text-amber-600 dark:text-amber-300">
                {faNumber(remaining)} محصول باقی مانده
              </span>
            )}
          </div>
        )}
      </Glass>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {!sessionOpen && (
            <Glass className="p-5 text-sm text-muted leading-7">
              انبار را انتخاب کنید و «شروع چک‌لیست کامل» را بزنید تا همه محصولات موجود در همان انبار نمایش داده شوند.
              اگر فقط چند محصول مدنظرتان است، «چند محصول انتخابی» را انتخاب کنید — در پایان اگر چیزی جا مانده باشد پیام هشدار می‌گیرید.
            </Glass>
          )}

          {sessionOpen && !selected && (
            <Glass className="p-4">
              <p className="mb-3 text-sm font-bold text-strong">
                چک‌لیست محصولات انبار ({faNumber(filteredProducts.length)})
              </p>
              {loadingList ? (
                <p className="text-sm text-muted">در حال بارگذاری...</p>
              ) : !filteredProducts.length ? (
                <p className="text-sm text-muted">محصولی با موجودی در این انبار نیست</p>
              ) : (
                <div className="max-h-[560px] space-y-2 overflow-y-auto">
                  {filteredProducts.map((p) => {
                    const done = checkedMap[p.id];
                    const s = done ? levelStyles(done.level) : null;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => pickProduct(p)}
                        className={`press flex w-full flex-wrap items-center gap-3 rounded-2xl px-4 py-3 text-right transition ${
                          done ? s!.row : "glass-2 hover:bg-white/10"
                        }`}
                      >
                        <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${
                          done ? (done.level === "match" ? "bg-emerald-500" : done.level === "partial" ? "bg-amber-500" : "bg-rose-500") : "bg-white/10 text-muted"
                        }`}>
                          {done ? <I.check width={14} /> : <span className="text-[10px]">—</span>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-strong">{p.name}</p>
                          <p className="text-xs text-muted">
                            موجودی سیستم: {faNumber(p.systemQty)}
                            {done ? ` · اظهار: ${faNumber(done.declaredQty)}` : ""}
                          </p>
                        </div>
                        {done ? (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s!.badge}`}>{s!.label}</span>
                        ) : (
                          <span className="text-xs font-bold text-teal-500">بررسی</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </Glass>
          )}

          {sessionOpen && selected && (
            <Glass className="space-y-4 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted">محصول انتخاب‌شده</p>
                  <p className="text-base font-bold text-strong">{selected.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    SKU: {selected.sku} · موجودی سیستم: {faNumber(selected.systemQty)}
                  </p>
                </div>
                <Btn variant="ghost" onClick={() => { setSelected(null); setCurrent(null); setDeclaredQty(""); }}>
                  بازگشت به چک‌لیست
                </Btn>
              </div>

              <Field label="تعداد اظهار شما در این انبار (جمع همه متغیرها)">
                <Input
                  value={declaredQty}
                  onChange={(e) => setDeclaredQty(e.target.value.replace(/[^\d]/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && runCheck()}
                  placeholder="مثلاً ۵۰"
                  inputMode="numeric"
                  dir="ltr"
                  className="text-lg font-bold"
                />
              </Field>

              <div className="flex flex-wrap gap-2">
                <Btn onClick={runCheck} disabled={checking}>
                  {checking ? "..." : <><I.check width={16} /> ثبت در چک‌لیست</>}
                </Btn>
                {current && (
                  <Btn variant="soft" onClick={() => { setSelected(null); setCurrent(null); setDeclaredQty(""); }}>
                    محصول بعدی
                  </Btn>
                )}
              </div>

              {current && styles && (
                <div className={`rounded-2xl p-4 ${styles.card}`}>
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles.badge}`}>{styles.label}</span>
                    <span className={`text-sm font-bold ${styles.text}`}>{current.productName}</span>
                  </div>
                  <p className="mb-3 text-sm leading-6 text-strong">{current.message}</p>
                  <div className="mb-3 grid gap-2 sm:grid-cols-2 text-sm">
                    <div className="rounded-xl glass-2 px-3 py-2">
                      <p className="text-xs text-muted">اظهار شما</p>
                      <p className="text-lg font-extrabold text-strong">{faNumber(current.declaredQty)}</p>
                    </div>
                    <div className="rounded-xl glass-2 px-3 py-2">
                      <p className="text-xs text-muted">موجودی سیستم</p>
                      <p className="text-lg font-extrabold text-strong">{faNumber(current.systemQty)}</p>
                    </div>
                    <div className="rounded-xl glass-2 px-3 py-2">
                      <p className="text-xs text-muted">اختلاف تعداد</p>
                      <p className={`text-lg font-extrabold ${current.qtyDiff === 0 ? "text-emerald-500" : current.qtyDiff > 0 ? "text-amber-500" : "text-rose-500"}`}>
                        {current.qtyDiff > 0 ? `+${faNumber(current.qtyDiff)}` : current.qtyDiff < 0 ? `−${faNumber(Math.abs(current.qtyDiff))}` : faNumber(0)}
                      </p>
                    </div>
                    <div className="rounded-xl glass-2 px-3 py-2">
                      <p className="text-xs text-muted">اختلاف مبلغ</p>
                      <p className={`text-base font-extrabold ${current.amountDiff === 0 ? "text-emerald-500" : current.amountDiff > 0 ? "text-amber-500" : "text-rose-500"}`}>
                        {signedToman(current.amountDiff)}
                      </p>
                    </div>
                  </div>
                  {current.variations?.length > 0 && (
                    <div className="space-y-1.5">
                      {current.variations.map((v) => (
                        <div key={v.variationId} className="flex flex-wrap items-center justify-between gap-2 rounded-xl glass-2 px-3 py-2 text-xs">
                          <span className="font-semibold text-strong">
                            {[v.color, v.size].filter(Boolean).join(" / ") || "بدون مشخصه"}
                          </span>
                          <span className="text-muted">موجودی: <b className="text-strong">{faNumber(v.systemQty)}</b></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Glass>
          )}
        </div>

        <Glass className="sticky top-24 h-fit space-y-4 p-5">
          <h3 className="font-bold text-strong">خلاصه جلسه</h3>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-2xl bg-emerald-500/15 px-2 py-3">
              <p className="font-extrabold text-emerald-500">{faNumber(sessionSummary.match)}</p>
              <p className="mt-1 text-muted">سبز</p>
            </div>
            <div className="rounded-2xl bg-amber-500/15 px-2 py-3">
              <p className="font-extrabold text-amber-500">{faNumber(sessionSummary.partial)}</p>
              <p className="mt-1 text-muted">زرد</p>
            </div>
            <div className="rounded-2xl bg-rose-500/15 px-2 py-3">
              <p className="font-extrabold text-rose-500">{faNumber(sessionSummary.mismatch)}</p>
              <p className="mt-1 text-muted">قرمز</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted">باقی‌مانده</span>
              <span className={`font-bold ${remaining > 0 ? "text-amber-500" : "text-emerald-500"}`}>{faNumber(remaining)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted">کسری تعداد</span>
              <span className="font-bold text-rose-500">{faNumber(sessionSummary.shortageQty)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted">مازاد تعداد</span>
              <span className="font-bold text-amber-500">{faNumber(sessionSummary.surplusQty)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted">مبلغ کسری</span>
              <span className="font-bold text-rose-500">{toman(sessionSummary.shortageAmount)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted">مبلغ مازاد</span>
              <span className="font-bold text-amber-500">{toman(sessionSummary.surplusAmount)}</span>
            </div>
          </div>

          {sessionOpen && (
            <Btn className="w-full" onClick={() => completeSession(false)} disabled={completing || sessionSummary.checked === 0}>
              {completing ? "..." : <><I.check width={16} /> اتمام و ثبت در گزارش‌ها</>}
            </Btn>
          )}

          {historySessions.length > 0 && (
            <div className="max-h-[280px] space-y-2 overflow-y-auto border-t border-white/10 pt-3">
              <p className="text-xs font-bold text-muted">سوابق اخیر</p>
              {historySessions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => void openSessionReport(s)}
                  className="press w-full rounded-2xl glass-2 px-3 py-2 text-xs text-right hover:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-brand-400" dir="ltr">{s.sessionNumber}</span>
                    <span className={`rounded-full px-2 py-0.5 font-bold ${
                      s.status === "completed" ? "bg-emerald-500/20 text-emerald-500"
                        : s.status === "partial" ? "bg-amber-500/20 text-amber-500"
                          : "bg-sky-500/20 text-sky-500"
                    }`}>
                      {s.status === "completed" ? "کامل" : s.status === "partial" ? "ناقص" : "باز"}
                    </span>
                  </div>
                  <p className="mt-1 text-muted">
                    {faNumber(s.checkedProductCount ?? 0)}/{faNumber(s.expectedProductCount ?? 0)}
                    {" · "}
                    {s.completedAt ? new Date(s.completedAt).toLocaleDateString("fa-IR") : "—"}
                    {" · مشاهده گزارش"}
                  </p>
                </button>
              ))}
            </div>
          )}
        </Glass>
      </div>

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title={reportSession ? `گزارش ${reportSession.sessionNumber}` : "گزارش انبارگردانی"}
        wide
      >
        {loadingReport ? (
          <div className="py-16 text-center text-sm text-muted">
            <I.refresh className="anim-spin-slow mx-auto mb-3" width={28} />
            در حال آماده‌سازی گزارش...
          </div>
        ) : reportSession ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["انبار", reportSession.warehouseName],
                ["وضعیت", reportSession.status === "completed" ? "کامل" : reportSession.status === "partial" ? "ناقص" : "باز"],
                ["بررسی‌شده", `${faNumber(reportSession.checkedProductCount ?? reportItems.length)} / ${faNumber(reportSession.expectedProductCount ?? 0)}`],
                ["همخوانی", faNumber(reportSession.matchCount ?? reportItems.filter((i) => i.level === "match").length)],
                ["کسری تعداد", faNumber(reportSession.shortageQty ?? 0)],
                ["مازاد تعداد", faNumber(reportSession.surplusQty ?? 0)],
                ["مبلغ کسری", toman(reportSession.shortageAmount ?? 0)],
                ["مبلغ مازاد", toman(reportSession.surplusAmount ?? 0)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl glass-2 p-3">
                  <p className="text-[11px] text-muted">{label}</p>
                  <p className="mt-1 text-sm font-bold text-strong">{value}</p>
                </div>
              ))}
            </div>

            <div className="max-h-[360px] overflow-auto rounded-2xl border border-white/10">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-muted">
                    <th className="p-2 text-right">محصول</th>
                    <th className="p-2 text-right">سیستم</th>
                    <th className="p-2 text-right">اعلامی</th>
                    <th className="p-2 text-right">اختلاف</th>
                    <th className="p-2 text-right">وضعیت</th>
                  </tr>
                </thead>
                <tbody>
                  {reportItems.map((it) => {
                    const st = levelStyles(it.level);
                    return (
                      <tr key={it.productId} className="border-b border-white/5">
                        <td className="p-2">
                          <p className="font-semibold text-strong">{it.productName}</p>
                          <p className="font-mono text-[10px] text-muted" dir="ltr">{it.sku || it.barcode || "—"}</p>
                        </td>
                        <td className="p-2">{faNumber(it.systemQty)}</td>
                        <td className="p-2">{faNumber(it.declaredQty)}</td>
                        <td className={`p-2 font-bold ${it.qtyDiff === 0 ? "text-emerald-500" : it.qtyDiff < 0 ? "text-rose-500" : "text-amber-500"}`}>
                          {faNumber(it.qtyDiff)}
                        </td>
                        <td className="p-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.badge}`}>{st.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                  {!reportItems.length && (
                    <tr><td colSpan={5} className="p-8 text-center text-muted">موردی ثبت نشده</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Btn variant="soft" onClick={exportStocktakeExcel}><I.download width={16} /> Excel</Btn>
              <Btn onClick={printStocktakeReport}><I.printer width={16} /> چاپ A4 / PDF</Btn>
              <Btn variant="ghost" onClick={() => setReportOpen(false)}>بستن</Btn>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
