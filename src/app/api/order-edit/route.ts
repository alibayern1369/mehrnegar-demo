import { getCurrentUser, isManager } from "@/mock/auth-helpers";
import { ensureSeeded, getStore, nextId } from "@/mock";
import {
  bumpStock,
  getCentralWarehouse,
  runInTransaction,
  writeAudit,
  writeLedger,
} from "@/mock/inventory";
import { isValidSalesMethod } from "@/lib/sales-methods";
import { hasPermission } from "@/lib/permissions";
import { isValidIranMobile } from "@/lib/phone";
import type { Invoice, InvoiceItem } from "@/mock/types";

export const dynamic = "force-dynamic";

function genInvoiceNumber(prefix: string) {
  const d = new Date();
  const ts = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-EX-${ts}-${rand}`;
}

type SaleItem = {
  productId: number;
  variationId?: number;
  barcode: string;
  productName: string;
  color?: string;
  size?: string;
  quantity: number;
  unitPrice: number;
  itemDiscount?: number;
  lineTotal: number;
  unitBarcodes?: string[];
};

export async function GET(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "edit_order")) {
      return Response.json({ ok: false, error: "دسترسی ویرایش سفارش برای شما فعال نیست" }, { status: 403 });
    }

    const store = getStore();
    const url = new URL(req.url);
    const q = String(url.searchParams.get("q") ?? "").trim();
    const id = Number(url.searchParams.get("id") || 0);
    const recent = url.searchParams.get("recent") === "1";

    if (!q && !id && !recent) {
      return Response.json({ ok: false, error: "شماره سفارش یا نام مشتری را وارد کنید" }, { status: 400 });
    }

    let invRows: Invoice[];
    if (id) {
      invRows = store.invoices.filter((i) => i.id === id).slice(0, 1);
    } else if (recent || !q) {
      const limit = Math.min(40, Math.max(10, Number(url.searchParams.get("limit") || 12)));
      const completed = store.invoices
        .filter((i) => i.status === "completed")
        .sort((a, b) => b.id - a.id);
      invRows = isManager(user)
        ? completed.slice(0, limit)
        : completed.filter((i) => i.soldBy === user.id).slice(0, limit);
    } else {
      const ql = q.toLowerCase();
      const matches = store.invoices.filter((i) =>
        (i.invoiceNumber ?? "").toLowerCase().includes(ql) ||
        (i.customerName ?? "").toLowerCase().includes(ql) ||
        (i.customerPhone ?? "").includes(q),
      ).sort((a, b) => b.id - a.id);
      invRows = isManager(user)
        ? matches.slice(0, 30)
        : matches.filter((i) => i.soldBy === user.id).slice(0, 30);
    }

    const enriched = invRows.map((inv) => {
      const items = store.invoiceItems.filter((i) => i.invoiceId === inv.id);
      const wh = inv.warehouseId
        ? store.warehouses.find((w) => w.id === inv.warehouseId) ?? null
        : null;

      const itemDetails = items.map((item) => {
        const barcodes = (item.unitBarcodes?.length ? item.unitBarcodes : [item.barcode]).filter(Boolean);
        const units = barcodes.map((bc) => {
          const u = store.productUnits.find((x) => x.barcode === bc);
          const alreadyReturned = u
            ? store.returns.some((r) => r.unitId === u.id && r.status === "returned")
            : false;
          const returnable = !!u && u.status === "sold" && u.soldInvoiceId === inv.id && !alreadyReturned;
          const unitCredit = Math.round((Number(item.lineTotal) || 0) / Math.max(1, Number(item.quantity) || 1));
          return {
            barcode: bc,
            unitId: u?.id ?? null,
            status: u?.status ?? "unknown",
            returnable,
            credit: unitCredit,
          };
        });
        return { ...item, units };
      });

      return {
        ...inv,
        warehouseName: wh?.name ?? null,
        items: itemDetails,
      };
    });

    return Response.json({ ok: true, invoices: enriched });
  } catch (e) {
    console.error("order-edit GET:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "edit_order")) {
      return Response.json({ ok: false, error: "دسترسی ویرایش سفارش برای شما فعال نیست" }, { status: 403 });
    }

    const body = await req.json();
    const invoiceId = Number(body.invoiceId);
    const returnBarcodes: string[] = Array.isArray(body.returnBarcodes)
      ? body.returnBarcodes.map((b: string) => String(b).trim()).filter(Boolean)
      : [];
    const newItems: SaleItem[] = Array.isArray(body.newItems) ? body.newItems : [];
    const warehouseId = Number(body.warehouseId);
    const notes = body.notes ? String(body.notes) : null;
    const method = String(body.salesMethod || "normal");

    if (!invoiceId) return Response.json({ ok: false, error: "فاکتور الزامی است" }, { status: 400 });
    if (!returnBarcodes.length && !newItems.length) {
      return Response.json({ ok: false, error: "حداقل یک مرجوعی یا کالای جدید لازم است" }, { status: 400 });
    }
    if (newItems.length && !warehouseId) {
      return Response.json({ ok: false, error: "انبار برای فروش جدید الزامی است" }, { status: 400 });
    }
    if (newItems.length && !isValidSalesMethod(method)) {
      return Response.json({ ok: false, error: "روش پرداخت نامعتبر است" }, { status: 400 });
    }

    const store = getStore();
    const orig = store.invoices.find((i) => i.id === invoiceId);
    if (!orig) return Response.json({ ok: false, error: "فاکتور یافت نشد" }, { status: 404 });
    if (!isManager(user) && orig.soldBy !== user.id) {
      return Response.json({ ok: false, error: "دسترسی به این فاکتور مجاز نیست" }, { status: 403 });
    }

    if (newItems.length && !isManager(user)) {
      const perm = store.userSalesPermissions.find(
        (p) => p.userId === user.id && p.warehouseId === warehouseId,
      );
      if (!perm?.enabled) {
        return Response.json({ ok: false, error: "شما اجازه فروش در این انبار را ندارید" }, { status: 403 });
      }
      const allowed = perm.salesMethods ?? [];
      if (!allowed.includes(method)) {
        return Response.json({ ok: false, error: "این روش پرداخت برای شما در این انبار مجاز نیست" }, { status: 403 });
      }
    }

    const mainWh = getCentralWarehouse();
    if (!mainWh) return Response.json({ ok: false, error: "انبار مرکزی یافت نشد" }, { status: 500 });

    const settings = store.invoiceSettings[0];
    const prefix = settings?.invoicePrefix ?? "CF";
    const origItems = store.invoiceItems.filter((i) => i.invoiceId === invoiceId);

    const result = runInTransaction((tx) => {
      let returnCredit = 0;
      const returned: {
        barcode: string;
        productName: string;
        color?: string | null;
        size?: string | null;
        unitPrice: number;
        credit: number;
      }[] = [];

      for (const bc of returnBarcodes) {
        const unit = tx.productUnits.find((u) => u.barcode === bc);
        if (!unit) throw new Error(`بارکد ${bc} یافت نشد`);
        if (unit.status !== "sold" || unit.soldInvoiceId !== invoiceId) {
          throw new Error(`بارکد ${bc} قابل مرجوعی از این فاکتور نیست`);
        }

        const items = tx.invoiceItems.filter((i) => i.invoiceId === invoiceId);
        const item = items.find((it) => (it.unitBarcodes ?? []).includes(bc) || it.barcode === bc);
        const credit = item
          ? Math.round((Number(item.lineTotal) || 0) / Math.max(1, Number(item.quantity) || 1))
          : 0;
        const unitPrice = item ? Math.round(Number(item.unitPrice) || credit) : credit;

        const p = tx.products.find((x) => x.id === unit.productId);
        const v = tx.productVariations.find((x) => x.id === unit.variationId);
        const productName = item?.productName ?? p?.name ?? "محصول";
        const color = item?.color ?? v?.color ?? null;
        const size = item?.size ?? v?.size ?? null;
        const returnId = `RTN-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 999)}`;

        tx.returns.push({
          id: nextId(tx, "returns"),
          returnId,
          invoiceId,
          invoiceItemId: item?.id ?? null,
          productId: unit.productId,
          variationId: unit.variationId,
          unitId: unit.id,
          barcode: bc,
          productName,
          quantity: 1,
          unitPrice: credit,
          amount: credit,
          affectsSales: true,
          originalWarehouseId: orig.warehouseId,
          returnWarehouseId: mainWh.id,
          originalSoldBy: orig.soldBy,
          returnedBy: user.id,
          reason: "ویرایش سفارش / تعویض",
          notes,
          status: "returned",
          createdAt: new Date(),
        });

        unit.status = "in_stock";
        unit.warehouseId = mainWh.id;
        unit.soldInvoiceId = null;
        unit.soldAt = null;
        unit.updatedAt = new Date();

        bumpStock(tx, unit.productId, unit.variationId, mainWh.id, 1);
        writeLedger(tx, [{
          productId: unit.productId,
          variationId: unit.variationId,
          unitId: unit.id,
          barcode: bc,
          productName,
          color: v?.color,
          size: v?.size,
          quantity: 1,
          sourceWarehouseId: orig.warehouseId,
          destWarehouseId: mainWh.id,
          transactionType: "return",
          operatorId: user.id,
          operatorName: user.name,
          documentNumber: returnId,
          reference: orig.invoiceNumber,
        }]);

        returnCredit += credit;
        returned.push({ barcode: bc, productName, color, size, unitPrice, credit });
      }

      let newInvoice: Invoice | null = null;
      let newTotal = 0;
      let savedNewItems: InvoiceItem[] = [];

      if (newItems.length) {
        const phone = String(orig.customerPhone ?? "").trim();
        if (!isValidIranMobile(phone)) {
          throw new Error("موبایل مشتری روی فاکتور اصلی نامعتبر است — امکان صدور فاکتور جدید نیست");
        }

        const allocatedPerLine: {
          barcodes: string[]; variationId: number; productId: number; color: string | null; size: string | null;
        }[] = [];

        for (const item of newItems) {
          const qty = Number(item.quantity) || 0;
          if (qty <= 0) throw new Error("تعداد نامعتبر");
          let units = [];

          if (item.unitBarcodes?.length) {
            for (const bc of item.unitBarcodes) {
              const u = tx.productUnits.find((x) => x.barcode === bc);
              if (!u || u.status !== "in_stock" || u.warehouseId !== warehouseId) {
                throw new Error(`بارکد ${bc} در این انبار موجود نیست`);
              }
              units.push(u);
            }
          } else {
            const byUnit = tx.productUnits.find((x) => x.barcode === item.barcode);
            if (byUnit) {
              if (byUnit.status !== "in_stock" || byUnit.warehouseId !== warehouseId) {
                throw new Error(`بارکد ${item.barcode} در این انبار موجود نیست`);
              }
              if (qty !== 1) throw new Error("هر بارکد واحد فقط یک عدد است");
              units = [byUnit];
            } else {
              throw new Error(`برای «${item.productName}» بارکد واحد اسکن کنید`);
            }
          }

          const take = units.slice(0, qty);
          const variation = tx.productVariations.find((x) => x.id === take[0].variationId);
          allocatedPerLine.push({
            barcodes: take.map((u) => u.barcode),
            variationId: take[0].variationId,
            productId: take[0].productId,
            color: item.color ?? variation?.color ?? null,
            size: item.size ?? variation?.size ?? null,
          });
        }

        const subtotal = newItems.reduce((a, i) => a + i.lineTotal, 0);
        newTotal = subtotal;
        const invoiceNumber = genInvoiceNumber(prefix);
        const businessSnapshot = {
          businessName: settings?.businessName ?? "",
          businessLogo: settings?.businessLogo ?? "",
          address: settings?.address ?? "",
          phone: settings?.phone ?? "",
          website: settings?.website ?? "",
          socialNetwork: settings?.socialNetwork ?? "",
          socialUrl: settings?.socialUrl ?? "",
          taxId: settings?.taxId ?? "",
          invoiceTitle: "فاکتور تعویض / ویرایش سفارش",
          footerText: settings?.footerText ?? "",
          returnPolicy: settings?.returnPolicy ?? "",
        };

        const now = new Date();
        const inv: Invoice = {
          id: nextId(tx, "invoices"),
          invoiceNumber,
          soldBy: user.id,
          warehouseId,
          salesMethod: method,
          customerName: orig.customerName,
          customerPhone: phone,
          customerAddress: orig.customerAddress,
          customerBirthDate: orig.customerBirthDate,
          notes: notes || `تعویض/ویرایش سفارش ${orig.invoiceNumber}`,
          subtotal,
          totalDiscount: 0,
          totalTax: 0,
          grandTotal: newTotal,
          businessSnapshot,
          status: "completed",
          customerSmsSentAt: now,
          adminSmsSentAt: null,
          lastSmsError: null,
          createdAt: now,
        };
        tx.invoices.push(inv);
        newInvoice = inv;

        for (let i = 0; i < newItems.length; i++) {
          const item = newItems[i];
          const alloc = allocatedPerLine[i];
          const qty = alloc.barcodes.length;

          const saved: InvoiceItem = {
            id: nextId(tx, "invoiceItems"),
            invoiceId: inv.id,
            productId: alloc.productId,
            variationId: alloc.variationId,
            barcode: alloc.barcodes[0] ?? item.barcode,
            productName: item.productName,
            color: alloc.color,
            size: alloc.size,
            quantity: qty,
            unitPrice: item.unitPrice,
            discount: item.itemDiscount || 0,
            lineTotal: item.lineTotal,
            unitBarcodes: alloc.barcodes,
          };
          tx.invoiceItems.push(saved);
          savedNewItems.push(saved);

          for (const bc of alloc.barcodes) {
            const u = tx.productUnits.find((x) => x.barcode === bc);
            if (!u) continue;
            u.status = "sold";
            u.soldInvoiceId = inv.id;
            u.soldAt = new Date();
            u.warehouseId = null;
            u.updatedAt = new Date();

            bumpStock(tx, u.productId, u.variationId, warehouseId, -1);
            const variation = tx.productVariations.find((x) => x.id === u.variationId);
            writeLedger(tx, [{
              productId: u.productId,
              variationId: u.variationId,
              unitId: u.id,
              barcode: u.barcode,
              productName: item.productName,
              color: variation?.color,
              size: variation?.size,
              quantity: -1,
              sourceWarehouseId: warehouseId,
              destWarehouseId: null,
              transactionType: "sale",
              operatorId: user.id,
              operatorName: user.name,
              documentNumber: invoiceNumber,
              reference: orig.invoiceNumber,
            }]);
          }
        }

        writeAudit(tx, user, "ویرایش سفارش", "invoice", inv.id,
          `تعویض از ${orig.invoiceNumber} — مرجوعی: ${returnCredit} — خرید جدید: ${newTotal}`,
          { relatedInvoice: orig.invoiceNumber, warehouseId, kind: "success" },
        );
      } else if (returnBarcodes.length) {
        writeAudit(tx, user, "ویرایش سفارش (مرجوعی)", "invoice", invoiceId,
          `مرجوعی از ${orig.invoiceNumber} — مبلغ: ${returnCredit}`,
          { relatedInvoice: orig.invoiceNumber, kind: "info" },
        );
      }

      const balance = newTotal - returnCredit;
      return {
        returnCredit,
        newTotal,
        balance,
        status: balance > 0 ? "debtor" : balance < 0 ? "creditor" : "settled",
        returned,
        newInvoice,
        newItems: savedNewItems,
      };
    });

    const wh = warehouseId ? store.warehouses.find((w) => w.id === warehouseId) ?? null : null;

    const status = result.status as "debtor" | "creditor" | "settled";
    const settleMessage = result.balance > 0
      ? `مشتری بدهکار است — باید ${result.balance.toLocaleString("fa-IR")} تومان بپردازد`
      : result.balance < 0
        ? `مشتری بستانکار است — باید ${Math.abs(result.balance).toLocaleString("fa-IR")} تومان پس بگیرد`
        : "حساب تسویه است — مبلغ مرجوعی و خرید جدید برابرند";

    const exchangeNumber = result.newInvoice?.invoiceNumber
      ?? `${prefix}-EX-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    const business = result.newInvoice?.businessSnapshot ?? {
      businessName: settings?.businessName ?? "",
      businessLogo: settings?.businessLogo ?? "",
      address: settings?.address ?? "",
      phone: settings?.phone ?? "",
      website: settings?.website ?? "",
      socialNetwork: settings?.socialNetwork ?? "",
      socialUrl: settings?.socialUrl ?? "",
      taxId: settings?.taxId ?? "",
      invoiceTitle: "فاکتور تعویض / ویرایش سفارش",
      footerText: settings?.footerText ?? "",
      returnPolicy: settings?.returnPolicy ?? "",
    };

    const receiptItems = [
      ...origItems.map((it) => ({
        productName: it.productName,
        barcode: it.barcode,
        unitBarcodes: it.unitBarcodes,
        color: it.color,
        size: it.size,
        quantity: it.quantity,
        unitPrice: it.unitPrice ?? 0,
        discount: it.discount ?? 0,
        lineTotal: it.lineTotal ?? 0,
        section: "original" as const,
      })),
      ...result.returned.map((r) => ({
        productName: r.productName,
        barcode: r.barcode,
        unitBarcodes: [r.barcode],
        color: r.color,
        size: r.size,
        quantity: 1,
        unitPrice: r.unitPrice,
        discount: 0,
        lineTotal: r.credit,
        section: "returned" as const,
      })),
      ...result.newItems.map((it) => ({
        productName: it.productName,
        barcode: it.barcode,
        unitBarcodes: it.unitBarcodes,
        color: it.color,
        size: it.size,
        quantity: it.quantity,
        unitPrice: it.unitPrice ?? 0,
        discount: it.discount ?? 0,
        lineTotal: it.lineTotal ?? 0,
        section: "added" as const,
      })),
    ];

    return Response.json({
      ok: true,
      summary: {
        originalInvoice: orig.invoiceNumber,
        customerName: orig.customerName,
        customerPhone: orig.customerPhone,
        returnCredit: result.returnCredit,
        newPurchase: result.newTotal,
        balance: result.balance,
        status,
        message: settleMessage,
        returned: result.returned,
        newInvoiceNumber: result.newInvoice?.invoiceNumber ?? exchangeNumber,
        warehouseName: wh?.name ?? null,
      },
      receipt: {
        kind: "exchange",
        invoiceNumber: exchangeNumber,
        originalInvoiceNumber: orig.invoiceNumber,
        createdAt: result.newInvoice?.createdAt ?? new Date().toISOString(),
        customerName: orig.customerName,
        customerPhone: orig.customerPhone,
        customerAddress: orig.customerAddress,
        customerBirthDate: orig.customerBirthDate,
        salesMethod: result.newInvoice?.salesMethod ?? orig.salesMethod ?? method,
        warehouseName: wh?.name ?? null,
        sellerName: user.name,
        notes: notes || `تعویض/ویرایش سفارش ${orig.invoiceNumber}`,
        subtotal: result.newTotal,
        totalDiscount: 0,
        grandTotal: Math.abs(result.balance),
        items: receiptItems,
        settlement: {
          returnCredit: result.returnCredit,
          newPurchase: result.newTotal,
          balance: result.balance,
          status,
          message: settleMessage,
        },
        business,
      },
    });
  } catch (e) {
    console.error("order-edit POST:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 400 });
  }
}
