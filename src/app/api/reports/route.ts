import { getCurrentUser, isManager } from "@/mock/auth-helpers";
import { ensureSeeded, getStore } from "@/mock";
import { hasPermission } from "@/lib/permissions";
import { FA_MONTHS_FULL } from "@/lib/jalali";
import { salesMethodLabel } from "@/lib/sales-methods";
import type { Invoice, InvoiceItem, ProductVariation, Return } from "@/mock/types";

export const dynamic = "force-dynamic";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function returnAffectsSales(row: { affectsSales?: boolean | null; amount?: number | null }) {
  return row.affectsSales !== false;
}

function productNotDeleted(p: { status?: string | null }) {
  return p.status !== "deleted";
}

function enrichReturnRows(store: ReturnType<typeof getStore>, rows: Return[]) {
  if (!rows.length) return [];
  const userMap = new Map(store.users.map((u) => [u.id, u.name]));
  const whMap = new Map(store.warehouses.map((w) => [w.id, w.name]));

  const invoiceIds = [...new Set(rows.map((r) => r.invoiceId).filter((id): id is number => !!id))];
  const itemIds = [...new Set(rows.map((r) => r.invoiceItemId).filter((id): id is number => !!id))];
  const variationIds = [...new Set(rows.map((r) => r.variationId).filter((id): id is number => !!id))];

  const invMap = new Map<number, Invoice>();
  const itemMap = new Map<number, InvoiceItem>();
  const varMap = new Map<number, ProductVariation>();

  for (const id of invoiceIds) {
    const inv = store.invoices.find((i) => i.id === id);
    if (inv) invMap.set(id, inv);
  }
  for (const id of itemIds) {
    const item = store.invoiceItems.find((i) => i.id === id);
    if (item) itemMap.set(id, item);
  }
  for (const id of variationIds) {
    const v = store.productVariations.find((x) => x.id === id);
    if (v) varMap.set(id, v);
  }

  return rows.map((r) => {
    const inv = r.invoiceId ? invMap.get(r.invoiceId) : undefined;
    const item = r.invoiceItemId ? itemMap.get(r.invoiceItemId) : undefined;
    const variation = r.variationId ? varMap.get(r.variationId) : undefined;
    return {
      ...r,
      invoiceNumber: inv?.invoiceNumber ?? null,
      customerName: inv?.customerName ?? null,
      customerPhone: inv?.customerPhone ?? null,
      customerAddress: inv?.customerAddress ?? null,
      color: item?.color ?? variation?.color ?? null,
      size: item?.size ?? variation?.size ?? null,
      returnedByName: r.returnedBy ? userMap.get(r.returnedBy) ?? null : null,
      originalSoldByName: r.originalSoldBy ? userMap.get(r.originalSoldBy) ?? null : null,
      returnWarehouseName: r.returnWarehouseId ? whMap.get(r.returnWarehouseId) ?? null : null,
      originalWarehouseName: r.originalWarehouseId ? whMap.get(r.originalWarehouseId) ?? null : null,
    };
  });
}

function netSalesTotal(
  salesRows: { grandTotal?: number | null; createdAt?: Date | string | null }[],
  returnRows: { amount?: number | null; affectsSales?: boolean | null; createdAt?: Date | string | null }[],
  from?: Date,
  to?: Date,
) {
  const inRange = <T extends { createdAt?: Date | string | null }>(rows: T[]) =>
    rows.filter((s) => {
      if (!s.createdAt) return false;
      const t = new Date(s.createdAt).getTime();
      if (from && t < from.getTime()) return false;
      if (to && t >= to.getTime()) return false;
      return true;
    });

  const sales = from || to ? inRange(salesRows) : salesRows;
  const rets = (from || to ? inRange(returnRows) : returnRows).filter(returnAffectsSales);
  const salesSum = sales.reduce((a, r) => a + (r.grandTotal ?? 0), 0);
  const returnSum = rets.reduce((a, r) => a + (Number(r.amount) || 0), 0);
  return {
    salesCount: sales.length,
    returnCount: rets.length,
    salesGross: salesSum,
    returnsTotal: returnSum,
    net: salesSum - returnSum,
  };
}

function parseDateParam(raw: string | null, end = false): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return end ? endOfDay(d) : startOfDay(d);
}

const FA_MONTHS = [...FA_MONTHS_FULL];

function jalaliParts(d: Date) {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(d);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

function hasAnyAdvancedAccess(user: { role?: string; permissions?: string[] | null }) {
  return hasPermission(user, "report_advanced")
    || hasPermission(user, "report_sales")
    || hasPermission(user, "report_returns")
    || hasPermission(user, "report_financial");
}

function filterInvoices(
  store: ReturnType<typeof getStore>,
  opts: {
    status?: string;
    fromDate?: Date | null;
    toDate?: Date | null;
    soldBy?: number | null;
    jalaliYear?: number | null;
    jalaliMonth?: number | null;
    limit: number;
  },
) {
  let rows = store.invoices.filter((i) => !opts.status || i.status === opts.status);
  if (opts.fromDate) rows = rows.filter((i) => i.createdAt && new Date(i.createdAt) >= opts.fromDate!);
  if (opts.toDate) rows = rows.filter((i) => i.createdAt && new Date(i.createdAt) <= opts.toDate!);
  if (opts.soldBy) rows = rows.filter((i) => i.soldBy === opts.soldBy);
  rows = rows.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
  if (opts.jalaliYear) {
    rows = rows.filter((r) => {
      if (!r.createdAt) return false;
      const j = jalaliParts(new Date(r.createdAt));
      if (j.year !== opts.jalaliYear) return false;
      if (opts.jalaliMonth && j.month !== opts.jalaliMonth) return false;
      return true;
    });
  }
  return rows.slice(0, opts.limit);
}

function filterReturns(
  store: ReturnType<typeof getStore>,
  opts: {
    status?: string;
    fromDate?: Date | null;
    toDate?: Date | null;
    returnedBy?: number | null;
    jalaliYear?: number | null;
    jalaliMonth?: number | null;
    limit: number;
    affectsSalesOnly?: boolean;
  },
) {
  let rows = store.returns.filter((r) => !opts.status || r.status === opts.status);
  if (opts.fromDate) rows = rows.filter((r) => r.createdAt && new Date(r.createdAt) >= opts.fromDate!);
  if (opts.toDate) rows = rows.filter((r) => r.createdAt && new Date(r.createdAt) <= opts.toDate!);
  if (opts.returnedBy) rows = rows.filter((r) => r.returnedBy === opts.returnedBy);
  if (opts.affectsSalesOnly) rows = rows.filter(returnAffectsSales);
  rows = rows.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
  if (opts.jalaliYear) {
    rows = rows.filter((r) => {
      if (!r.createdAt) return false;
      const j = jalaliParts(new Date(r.createdAt));
      if (j.year !== opts.jalaliYear) return false;
      if (opts.jalaliMonth && j.month !== opts.jalaliMonth) return false;
      return true;
    });
  }
  return rows.slice(0, opts.limit);
}

export async function GET(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const store = getStore();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "sales";
    const userId = searchParams.get("userId");
    const limit = Math.min(2000, Math.max(1, Number(searchParams.get("limit") ?? "50")));
    const fromDate = parseDateParam(searchParams.get("from"));
    const toDate = parseDateParam(searchParams.get("to"), true);
    const soldByFilter = searchParams.get("soldBy") ? Number(searchParams.get("soldBy")) : null;

    if (type === "meta") {
      if (!hasAnyAdvancedAccess(user) && !hasPermission(user, "report_financial") && !isManager(user)) {
        return Response.json({ ok: false, error: "دسترسی ندارید" }, { status: 403 });
      }
      const activeProducts = store.products.filter(productNotDeleted);
      const categories = [...new Set(activeProducts.map((p) => p.category).filter(Boolean))].sort();
      const names = activeProducts
        .map((p) => ({ id: p.id, name: p.name, category: p.category }))
        .sort((a, b) => a.name.localeCompare(b.name, "fa"))
        .slice(0, 500);
      const colors = [...new Set(store.productVariations.map((v) => v.color).filter(Boolean))].sort();
      const sizes = [...new Set(store.productVariations.map((v) => v.size).filter(Boolean))].sort();
      const sellerRows = store.users
        .filter((u) => u.isActive !== false)
        .map((u) => ({ id: u.id, name: u.name, role: u.role }))
        .sort((a, b) => a.name.localeCompare(b.name, "fa"));
      const whs = store.warehouses
        .filter((w) => w.isActive !== false)
        .map((w) => ({ id: w.id, name: w.name }));
      return Response.json({
        ok: true,
        data: { categories, products: names, colors, sizes, sellers: sellerRows, warehouses: whs },
      });
    }

    if (type === "financial") {
      if (!hasPermission(user, "report_financial") && !isManager(user)) {
        return Response.json({ ok: false, error: "دسترسی به گزارش مالی ندارید" }, { status: 403 });
      }

      const now = new Date();
      const today0 = startOfDay(now);
      const week0 = startOfDay(addDays(now, -6));
      const month0 = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      const year0 = startOfDay(new Date(now.getFullYear(), 0, 1));
      const prevMonth0 = startOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const prevMonthEnd = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));

      const allSales = store.invoices
        .filter((i) => i.status === "completed")
        .map((i) => ({
          id: i.id,
          soldBy: i.soldBy,
          grandTotal: i.grandTotal,
          createdAt: i.createdAt,
          status: i.status,
        }));

      const allReturns = store.returns
        .filter((r) => r.status === "returned")
        .map((r) => ({
          amount: r.amount,
          affectsSales: r.affectsSales,
          createdAt: r.createdAt,
          returnedBy: r.returnedBy,
        }));

      const sellerIds = [...new Set(allSales.map((s) => s.soldBy).filter(Boolean))] as number[];
      const nameMap = Object.fromEntries(
        store.users.filter((u) => sellerIds.includes(u.id)).map((u) => [u.id, u.name]),
      );

      const inRange = (from: Date, to?: Date) =>
        allSales.filter((s) => {
          if (!s.createdAt) return false;
          const t = new Date(s.createdAt).getTime();
          if (t < from.getTime()) return false;
          if (to && t >= to.getTime()) return false;
          return true;
        });

      const returnsInRange = (from: Date, to?: Date) =>
        allReturns.filter((r) => {
          if (!returnAffectsSales(r) || !r.createdAt) return false;
          const t = new Date(r.createdAt).getTime();
          if (t < from.getTime()) return false;
          if (to && t >= to.getTime()) return false;
          return true;
        });

      const todayNet = netSalesTotal(allSales, allReturns, today0);
      const weekNet = netSalesTotal(allSales, allReturns, week0);
      const monthNet = netSalesTotal(allSales, allReturns, month0);
      const yearNet = netSalesTotal(allSales, allReturns, year0);
      const prevMonthNet = netSalesTotal(allSales, allReturns, prevMonth0, prevMonthEnd);
      const allNet = netSalesTotal(allSales, allReturns);

      const monthRows = inRange(month0);

      const daily: { date: string; label: string; count: number; total: number; returnsTotal: number }[] = [];
      for (let i = 13; i >= 0; i--) {
        const day = startOfDay(addDays(now, -i));
        const next = addDays(day, 1);
        const dayNet = netSalesTotal(allSales, allReturns, day, next);
        daily.push({
          date: day.toISOString().slice(0, 10),
          label: day.toLocaleDateString("fa-IR", { month: "long", day: "numeric" }),
          count: dayNet.salesCount,
          total: dayNet.net,
          returnsTotal: dayNet.returnsTotal,
        });
      }

      const bySeller = new Map<number, { userId: number; name: string; count: number; total: number }>();
      for (const row of monthRows) {
        const id = row.soldBy ?? 0;
        const cur = bySeller.get(id) ?? {
          userId: id,
          name: id ? (nameMap[id] ?? `کاربر ${id}`) : "نامشخص",
          count: 0,
          total: 0,
        };
        cur.count += 1;
        cur.total += row.grandTotal ?? 0;
        bySeller.set(id, cur);
      }
      for (const r of returnsInRange(month0)) {
        const id = r.returnedBy ?? 0;
        const cur = bySeller.get(id);
        if (!cur) continue;
        cur.total -= Number(r.amount) || 0;
      }
      const ranking = [...bySeller.values()].sort((a, b) => b.total - a.total);

      const nowJ = jalaliParts(now);
      const monthlyMap = new Map<number, { count: number; total: number; returnsTotal: number }>();
      for (let m = 1; m <= 12; m++) monthlyMap.set(m, { count: 0, total: 0, returnsTotal: 0 });
      for (const s of allSales) {
        if (!s.createdAt) continue;
        const j = jalaliParts(new Date(s.createdAt));
        if (j.year !== nowJ.year) continue;
        if (j.month < 1 || j.month > 12) continue;
        const cur = monthlyMap.get(j.month)!;
        cur.count += 1;
        cur.total += s.grandTotal ?? 0;
      }
      for (const r of allReturns.filter(returnAffectsSales)) {
        if (!r.createdAt) continue;
        const j = jalaliParts(new Date(r.createdAt));
        if (j.year !== nowJ.year) continue;
        if (j.month < 1 || j.month > 12) continue;
        const cur = monthlyMap.get(j.month)!;
        cur.returnsTotal += Number(r.amount) || 0;
        cur.total -= Number(r.amount) || 0;
      }
      const monthly = Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const cur = monthlyMap.get(month)!;
        return { month, label: FA_MONTHS[i], count: cur.count, total: cur.total, returnsTotal: cur.returnsTotal };
      });

      return Response.json({
        ok: true,
        data: {
          cards: {
            today: { count: todayNet.salesCount, total: todayNet.net, returnsTotal: todayNet.returnsTotal, salesGross: todayNet.salesGross },
            week: { count: weekNet.salesCount, total: weekNet.net, returnsTotal: weekNet.returnsTotal, salesGross: weekNet.salesGross },
            month: { count: monthNet.salesCount, total: monthNet.net, returnsTotal: monthNet.returnsTotal, salesGross: monthNet.salesGross },
            year: { count: yearNet.salesCount, total: yearNet.net, returnsTotal: yearNet.returnsTotal, salesGross: yearNet.salesGross },
            prevMonth: { count: prevMonthNet.salesCount, total: prevMonthNet.net, returnsTotal: prevMonthNet.returnsTotal, salesGross: prevMonthNet.salesGross },
            all: { count: allNet.salesCount, total: allNet.net, returnsTotal: allNet.returnsTotal, salesGross: allNet.salesGross },
          },
          daily,
          monthly,
          jalaliYear: nowJ.year,
          ranking,
          avgTicketMonth: monthRows.length ? Math.round(monthNet.net / monthRows.length) : 0,
        },
      });
    }

    if (type === "my_sales") {
      if (!hasPermission(user, "report_my_sales") && !isManager(user)) {
        return Response.json({ ok: false, error: "دسترسی به گزارش فروش شخصی ندارید" }, { status: 403 });
      }
      const targetId = isManager(user) && userId ? Number(userId) : user.id;
      const allMine = store.invoices
        .filter((i) => i.soldBy === targetId && i.status === "completed")
        .sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        });

      const myReturns = store.returns
        .filter((r) => r.returnedBy === targetId && r.status === "returned")
        .map((r) => ({ amount: r.amount, affectsSales: r.affectsSales, createdAt: r.createdAt }));

      const rows = allMine.slice(0, limit);
      const withItems = rows.map((inv) => ({
        ...inv,
        items: store.invoiceItems.filter((i) => i.invoiceId === inv.id),
      }));

      const now = new Date();
      const today0 = startOfDay(now);
      const month0 = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
      const todayNet = netSalesTotal(allMine, myReturns, today0);
      const monthNet = netSalesTotal(allMine, myReturns, month0);
      const allNet = netSalesTotal(allMine, myReturns);

      return Response.json({
        ok: true,
        data: {
          invoices: withItems,
          summary: {
            today: { count: todayNet.salesCount, total: todayNet.net, returnsTotal: todayNet.returnsTotal },
            month: { count: monthNet.salesCount, total: monthNet.net, returnsTotal: monthNet.returnsTotal },
            all: { count: allNet.salesCount, total: allNet.net, returnsTotal: allNet.returnsTotal },
          },
        },
      });
    }

    if (type === "sales") {
      if (!hasPermission(user, "report_sales") && !hasPermission(user, "report_financial") && !isManager(user)) {
        return Response.json({ ok: false, error: "دسترسی ندارید" }, { status: 403 });
      }
      const jalaliYear = searchParams.get("jalaliYear") ? Number(searchParams.get("jalaliYear")) : null;
      const jalaliMonth = searchParams.get("jalaliMonth") ? Number(searchParams.get("jalaliMonth")) : null;

      const rows = filterInvoices(store, {
        status: "completed",
        fromDate,
        toDate,
        soldBy: soldByFilter,
        jalaliYear,
        jalaliMonth,
        limit: jalaliYear ? 5000 : limit,
      }).slice(0, limit);

      const withItems = rows.map((inv) => ({
        ...inv,
        items: store.invoiceItems.filter((i) => i.invoiceId === inv.id),
      }));
      const salesGross = rows.reduce((a, r) => a + (r.grandTotal ?? 0), 0);

      const periodReturns = filterReturns(store, {
        status: "returned",
        fromDate,
        toDate,
        returnedBy: soldByFilter,
        jalaliYear,
        jalaliMonth,
        limit: jalaliYear ? 5000 : limit,
        affectsSalesOnly: true,
      }).slice(0, limit);

      const returnsTotal = periodReturns.reduce((a, r) => a + (Number(r.amount) || 0), 0);
      const total = salesGross - returnsTotal;
      const enrichedReturns = enrichReturnRows(store, periodReturns);

      return Response.json({
        ok: true,
        data: withItems,
        returns: enrichedReturns,
        summary: {
          count: rows.length,
          returnCount: periodReturns.length,
          total,
          salesGross,
          returnsTotal,
        },
      });
    }

    if (type === "returns") {
      if (!hasPermission(user, "report_returns") && !isManager(user)) {
        return Response.json({ ok: false, error: "دسترسی ندارید" }, { status: 403 });
      }
      let rows = [...store.returns];
      if (fromDate) rows = rows.filter((r) => r.createdAt && new Date(r.createdAt) >= fromDate);
      if (toDate) rows = rows.filter((r) => r.createdAt && new Date(r.createdAt) <= toDate);
      rows = rows.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      }).slice(0, limit);
      return Response.json({ ok: true, data: enrichReturnRows(store, rows) });
    }

    if (type === "audit") {
      if (!hasPermission(user, "report_audit") && !isManager(user)) {
        return Response.json({ ok: false, error: "دسترسی ندارید" }, { status: 403 });
      }
      const rows = [...store.auditLogs]
        .sort((a, b) => {
          const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        })
        .slice(0, limit);
      return Response.json({ ok: true, data: rows });
    }

    if (type === "stock" && isManager(user)) {
      return Response.json({
        ok: true,
        data: {
          warehouses: store.warehouses,
          products: store.products,
          stocks: store.warehouseStock,
        },
      });
    }

    if (type === "ledger") {
      if (!hasPermission(user, "report_ledger") && !isManager(user)) {
        return Response.json({ ok: false, error: "دسترسی ندارید" }, { status: 403 });
      }
      let rows = [...store.inventoryLedger].sort((a, b) => b.id - a.id);
      if (fromDate) rows = rows.filter((r) => r.createdAt && new Date(r.createdAt) >= fromDate);
      if (toDate) rows = rows.filter((r) => r.createdAt && new Date(r.createdAt) <= toDate);
      const warehouseId = searchParams.get("warehouseId");
      if (warehouseId) {
        const wid = Number(warehouseId);
        rows = rows.filter((r) => r.sourceWarehouseId === wid || r.destWarehouseId === wid);
      }
      rows = rows.slice(0, limit);
      const data = rows.map((r) => ({
        ...r,
        sourceWarehouse: store.warehouses.find((w) => w.id === r.sourceWarehouseId) ?? null,
        destWarehouse: store.warehouses.find((w) => w.id === r.destWarehouseId) ?? null,
        incoming: (r.quantity ?? 0) > 0,
        outgoing: (r.quantity ?? 0) < 0,
      }));
      return Response.json({ ok: true, data });
    }

    if (type === "transfers") {
      if (!hasPermission(user, "report_transfers") && !isManager(user)) {
        return Response.json({ ok: false, error: "دسترسی ندارید" }, { status: 403 });
      }
      let docs = [...store.stockDocuments].sort((a, b) => b.id - a.id);
      if (fromDate) docs = docs.filter((d) => d.createdAt && new Date(d.createdAt) >= fromDate);
      if (toDate) docs = docs.filter((d) => d.createdAt && new Date(d.createdAt) <= toDate);
      const warehouseId = searchParams.get("warehouseId");
      if (warehouseId) {
        const wid = Number(warehouseId);
        docs = docs.filter((d) => d.sourceWarehouseId === wid || d.destWarehouseId === wid);
      }
      docs = docs.slice(0, limit);
      const data = docs.map((d) => ({
        ...d,
        sourceWarehouse: store.warehouses.find((w) => w.id === d.sourceWarehouseId) ?? null,
        destWarehouse: store.warehouses.find((w) => w.id === d.destWarehouseId) ?? null,
      }));
      return Response.json({ ok: true, data });
    }

    if (type === "advanced") {
      if (!hasPermission(user, "report_advanced") && !isManager(user)) {
        return Response.json({ ok: false, error: "دسترسی به گزارش پیشرفته ندارید" }, { status: 403 });
      }

      const kind = searchParams.get("kind") ?? "all";
      const category = (searchParams.get("category") ?? "").trim();
      const productName = (searchParams.get("productName") ?? "").trim();
      const productId = searchParams.get("productId") ? Number(searchParams.get("productId")) : null;
      const color = (searchParams.get("color") ?? "").trim();
      const size = (searchParams.get("size") ?? "").trim();
      const salesMethod = (searchParams.get("salesMethod") ?? "").trim();
      const warehouseId = searchParams.get("warehouseId") ? Number(searchParams.get("warehouseId")) : null;
      const sellerId = searchParams.get("sellerId") ? Number(searchParams.get("sellerId")) : null;

      type AdvRow = {
        kind: "sale" | "return" | "edit";
        id: number;
        ref: string;
        date: string | Date | null;
        productName: string;
        category: string | null;
        color: string | null;
        size: string | null;
        quantity: number;
        amount: number;
        salesMethod: string | null;
        salesMethodLabel: string;
        warehouseName: string | null;
        sellerName: string | null;
        customerName: string | null;
        detail: string | null;
      };

      const rows: AdvRow[] = [];
      const sellerMap = Object.fromEntries(store.users.map((u) => [u.id, u.name]));
      const whMap = Object.fromEntries(store.warehouses.map((w) => [w.id, w.name]));
      const prodCatMap = Object.fromEntries(
        store.products.map((p) => [p.id, { category: p.category, name: p.name }]),
      );

      const matchProductFilters = (opts: {
        productId?: number | null;
        productName?: string | null;
        category?: string | null;
        color?: string | null;
        size?: string | null;
      }) => {
        if (productId && opts.productId !== productId) return false;
        if (category) {
          const cat = opts.category ?? (opts.productId ? prodCatMap[opts.productId]?.category : null);
          if (cat !== category) return false;
        }
        if (productName) {
          const n = (opts.productName ?? "").toLowerCase();
          if (!n.includes(productName.toLowerCase())) return false;
        }
        if (color && (opts.color ?? "") !== color) return false;
        if (size && (opts.size ?? "") !== size) return false;
        return true;
      };

      if (kind === "all" || kind === "sales") {
        let invs = store.invoices.filter((i) => i.status === "completed");
        if (fromDate) invs = invs.filter((i) => i.createdAt && new Date(i.createdAt) >= fromDate);
        if (toDate) invs = invs.filter((i) => i.createdAt && new Date(i.createdAt) <= toDate);
        if (sellerId) invs = invs.filter((i) => i.soldBy === sellerId);
        if (warehouseId) invs = invs.filter((i) => i.warehouseId === warehouseId);
        if (salesMethod) invs = invs.filter((i) => i.salesMethod === salesMethod);
        invs = invs.sort((a, b) => b.id - a.id).slice(0, limit);

        for (const inv of invs) {
          const items = store.invoiceItems.filter((i) => i.invoiceId === inv.id);
          const filtered = items.filter((it) => matchProductFilters({
            productId: it.productId,
            productName: it.productName,
            category: prodCatMap[it.productId]?.category,
            color: it.color,
            size: it.size,
          }));
          if ((category || productName || productId || color || size) && !filtered.length) continue;
          const useItems = (category || productName || productId || color || size) ? filtered : items;
          if (!useItems.length) {
            rows.push({
              kind: "sale",
              id: inv.id,
              ref: inv.invoiceNumber,
              date: inv.createdAt,
              productName: "—",
              category: null,
              color: null,
              size: null,
              quantity: 0,
              amount: inv.grandTotal ?? 0,
              salesMethod: inv.salesMethod,
              salesMethodLabel: salesMethodLabel(inv.salesMethod),
              warehouseName: inv.warehouseId ? whMap[inv.warehouseId] ?? null : null,
              sellerName: inv.soldBy ? sellerMap[inv.soldBy] ?? null : null,
              customerName: inv.customerName,
              detail: inv.notes,
            });
            continue;
          }
          for (const it of useItems) {
            rows.push({
              kind: "sale",
              id: inv.id,
              ref: inv.invoiceNumber,
              date: inv.createdAt,
              productName: it.productName,
              category: prodCatMap[it.productId]?.category ?? null,
              color: it.color,
              size: it.size,
              quantity: it.quantity,
              amount: it.lineTotal ?? 0,
              salesMethod: inv.salesMethod,
              salesMethodLabel: salesMethodLabel(inv.salesMethod),
              warehouseName: inv.warehouseId ? whMap[inv.warehouseId] ?? null : null,
              sellerName: inv.soldBy ? sellerMap[inv.soldBy] ?? null : null,
              customerName: inv.customerName,
              detail: null,
            });
          }
        }
      }

      if (kind === "all" || kind === "returns") {
        let rets = [...store.returns];
        if (fromDate) rets = rets.filter((r) => r.createdAt && new Date(r.createdAt) >= fromDate);
        if (toDate) rets = rets.filter((r) => r.createdAt && new Date(r.createdAt) <= toDate);
        if (sellerId) rets = rets.filter((r) => r.returnedBy === sellerId);
        if (warehouseId) rets = rets.filter((r) => r.returnWarehouseId === warehouseId);
        if (productId) rets = rets.filter((r) => r.productId === productId);
        if (productName) {
          const pl = productName.toLowerCase();
          rets = rets.filter((r) => (r.productName ?? "").toLowerCase().includes(pl));
        }
        rets = rets.sort((a, b) => b.id - a.id).slice(0, limit);

        const varMap = Object.fromEntries(
          store.productVariations
            .filter((v) => rets.some((r) => r.variationId === v.id))
            .map((v) => [v.id, v]),
        );

        for (const r of rets) {
          const v = r.variationId ? varMap[r.variationId] : null;
          if (!matchProductFilters({
            productId: r.productId,
            productName: r.productName,
            category: prodCatMap[r.productId]?.category,
            color: v?.color ?? null,
            size: v?.size ?? null,
          })) continue;
          rows.push({
            kind: "return",
            id: r.id,
            ref: r.returnId,
            date: r.createdAt,
            productName: r.productName,
            category: prodCatMap[r.productId]?.category ?? null,
            color: v?.color ?? null,
            size: v?.size ?? null,
            quantity: r.quantity,
            amount: Number(r.amount) || 0,
            salesMethod: null,
            salesMethodLabel: "—",
            warehouseName: r.returnWarehouseId ? whMap[r.returnWarehouseId] ?? null : null,
            sellerName: r.returnedBy ? sellerMap[r.returnedBy] ?? null : null,
            customerName: null,
            detail: r.reason,
          });
        }
      }

      if (kind === "all" || kind === "edits") {
        let edits = store.auditLogs.filter((e) =>
          e.action === "ویرایش سفارش" ||
          e.action === "ویرایش سفارش (مرجوعی)" ||
          (e.action ?? "").includes("ویرایش"),
        );
        if (fromDate) edits = edits.filter((e) => e.createdAt && new Date(e.createdAt) >= fromDate);
        if (toDate) edits = edits.filter((e) => e.createdAt && new Date(e.createdAt) <= toDate);
        if (sellerId) edits = edits.filter((e) => e.userId === sellerId);
        if (warehouseId) edits = edits.filter((e) => e.warehouseId === warehouseId);
        edits = edits.sort((a, b) => b.id - a.id).slice(0, limit);

        for (const e of edits) {
          if (productName && !(e.detail ?? "").toLowerCase().includes(productName.toLowerCase())) continue;
          if (category || productId || color || size || salesMethod) continue;
          rows.push({
            kind: "edit",
            id: e.id,
            ref: e.relatedInvoice ?? String(e.entityId ?? e.id),
            date: e.createdAt,
            productName: "ویرایش سفارش",
            category: null,
            color: null,
            size: null,
            quantity: 0,
            amount: 0,
            salesMethod: null,
            salesMethodLabel: "—",
            warehouseName: e.warehouseId ? whMap[e.warehouseId] ?? null : null,
            sellerName: e.userName ?? (e.userId ? sellerMap[e.userId] ?? null : null),
            customerName: null,
            detail: e.detail,
          });
        }
      }

      rows.sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() : 0;
        const tb = b.date ? new Date(b.date).getTime() : 0;
        return tb - ta;
      });

      const sliced = rows.slice(0, limit);
      const salesAmt = sliced.filter((r) => r.kind === "sale").reduce((a, r) => a + r.amount, 0);
      const salesQty = sliced.filter((r) => r.kind === "sale").reduce((a, r) => a + r.quantity, 0);
      const returnQty = sliced.filter((r) => r.kind === "return").reduce((a, r) => a + r.quantity, 0);
      const returnAmount = sliced.filter((r) => r.kind === "return").reduce((a, r) => a + r.amount, 0);
      const editCount = sliced.filter((r) => r.kind === "edit").length;

      return Response.json({
        ok: true,
        data: sliced,
        summary: {
          count: sliced.length,
          salesAmount: salesAmt,
          netSalesAmount: salesAmt - returnAmount,
          salesQty,
          returnQty,
          returnAmount,
          editCount,
          saleRows: sliced.filter((r) => r.kind === "sale").length,
          returnRows: sliced.filter((r) => r.kind === "return").length,
        },
      });
    }

    if (type === "my_activity") {
      const myInvoices = store.invoices
        .filter((i) => i.soldBy === user.id)
        .sort((a, b) => b.id - a.id)
        .slice(0, limit);
      const myReturns = store.returns
        .filter((r) => r.returnedBy === user.id)
        .sort((a, b) => b.id - a.id)
        .slice(0, 20);
      const myProducts = store.products
        .filter((p) => p.createdBy === user.id)
        .sort((a, b) => b.id - a.id)
        .slice(0, 20);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todaySales = myInvoices.filter((i) => i.createdAt && i.createdAt >= todayStart);
      const todayReturns = myReturns.filter((r) =>
        r.createdAt && r.createdAt >= todayStart && returnAffectsSales(r),
      );
      const todayCount = todaySales.length;
      const todayTotal = todaySales.reduce((a, i) => a + (i.grandTotal ?? 0), 0)
        - todayReturns.reduce((a, r) => a + (Number(r.amount) || 0), 0);

      return Response.json({
        ok: true,
        data: { invoices: myInvoices, returns: myReturns, products: myProducts, todayCount, todayTotal },
      });
    }

    return Response.json({ ok: false, error: "نوع گزارش نامعتبر است" }, { status: 400 });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
