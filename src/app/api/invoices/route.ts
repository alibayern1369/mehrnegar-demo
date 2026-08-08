import { ensureSeeded } from "@/mock/ensure-seeded";
import { getStore, nextId, type MockStore } from "@/mock/store";
import type { Invoice, InvoiceItem, Product, ProductUnit, ProductVariation, Return } from "@/mock/types";
import { getCurrentUser, isManager } from "@/mock/auth-helpers";
import { runInTransaction, bumpStock, writeLedger, writeAudit } from "@/mock/inventory";
import { isValidSalesMethod } from "@/lib/sales-methods";
import { isValidIranMobile, notifySaleFinalized, normalizePhone } from "@/lib/sms";
import { hasPermission, hasAnyReportPermission } from "@/lib/permissions";
import { parseJalali, formatJalali, isValidJalaliDate } from "@/lib/jalali";

export const dynamic = "force-dynamic";

const DEFAULT_BUYER_NAME = "خریدار محترم";

function genInvoiceNumber(prefix: string) {
  const d = new Date();
  const ts = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${ts}-${rand}`;
}

function ilikeMatch(value: string | null | undefined, q: string) {
  return (value ?? "").toLowerCase().includes(q.toLowerCase());
}

function enrichInvoice(store: MockStore, inv: Invoice, fallbackBiz: Record<string, string>) {
  const items = store.invoiceItems.filter((i) => i.invoiceId === inv.id);
  const wh = inv.warehouseId ? store.warehouses.find((w) => w.id === inv.warehouseId) : null;
  const seller = inv.soldBy ? store.users.find((u) => u.id === inv.soldBy) : null;
  const snap = inv.businessSnapshot && Object.keys(inv.businessSnapshot).length
    ? inv.businessSnapshot
    : fallbackBiz;
  return {
    ...inv,
    items,
    warehouseName: wh?.name ?? null,
    sellerName: seller?.name ?? null,
    business: snap,
  };
}

export async function GET(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const store = getStore();
    const url = new URL(req.url);
    const q = String(url.searchParams.get("q") ?? "").trim();
    const reprint = url.searchParams.get("reprint") === "1";
    const recent = url.searchParams.get("recent") === "1";
    const limit = Math.min(40, Math.max(5, Number(url.searchParams.get("limit") || 12)));

    if (reprint || recent) {
      const canReprint = hasPermission(user, "reprint_invoice") || hasAnyReportPermission(user);
      const canReturn = hasPermission(user, "return");
      const canTrack = hasPermission(user, "barcode_tracking");
      const canEdit = hasPermission(user, "edit_order");
      if (reprint && !canReprint) {
        return Response.json({ ok: false, error: "دسترسی به مشاهده/چاپ فاکتور ندارید" }, { status: 403 });
      }
      if (!reprint && recent && !canReturn && !canTrack && !canEdit && !canReprint) {
        return Response.json({ ok: false, error: "دسترسی ندارید" }, { status: 403 });
      }
      if (!q && !recent) {
        return Response.json({ ok: false, error: "نام خریدار یا شماره فاکتور را وارد کنید" }, { status: 400 });
      }

      const canSeeAll =
        isManager(user) ||
        hasPermission(user, "report_sales") ||
        hasPermission(user, "report_advanced") ||
        hasPermission(user, "report_financial");

      let invRows: Invoice[];
      if (recent && !q) {
        const base = store.invoices
          .filter((i) => i.status === "completed")
          .sort((a, b) => b.id - a.id);
        invRows = (canSeeAll ? base : base.filter((i) => i.soldBy === user.id)).slice(0, limit);
      } else {
        const base = store.invoices
          .filter((i) =>
            ilikeMatch(i.invoiceNumber, q) ||
            ilikeMatch(i.customerName, q) ||
            ilikeMatch(i.customerPhone, q),
          )
          .sort((a, b) => b.id - a.id)
          .slice(0, 40);
        invRows = canSeeAll ? base : base.filter((i) => i.soldBy === user.id);
      }

      const settings = store.invoiceSettings[0];
      const fallbackBiz = {
        businessName: settings?.businessName ?? "",
        businessLogo: settings?.businessLogo ?? "",
        address: settings?.address ?? "",
        phone: settings?.phone ?? "",
        website: settings?.website ?? "",
        socialNetwork: settings?.socialNetwork ?? "",
        socialUrl: settings?.socialUrl ?? "",
        taxId: settings?.taxId ?? "",
        invoiceTitle: settings?.invoiceTitle ?? "فاکتور فروش",
        footerText: settings?.footerText ?? "",
        returnPolicy: settings?.returnPolicy ?? "",
      };

      return Response.json({
        ok: true,
        invoices: invRows.map((inv) => enrichInvoice(store, inv, fallbackBiz)),
      });
    }

    const rows = (isManager(user)
      ? store.invoices
      : store.invoices.filter((i) => i.soldBy === user.id)
    )
      .sort((a, b) => b.id - a.id)
      .slice(0, isManager(user) ? 200 : 100);

    const withItems = rows.map((inv) => ({
      ...inv,
      items: store.invoiceItems.filter((i) => i.invoiceId === inv.id),
    }));

    return Response.json({ ok: true, invoices: withItems });
  } catch (e) {
    return Response.json({ ok: false, invoices: [], error: String(e) }, { status: 500 });
  }
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

type SaleReturnItem = {
  barcode: string;
  productId: number;
  variationId?: number;
  productName: string;
  color?: string;
  size?: string;
  unitPrice: number;
  returnWarehouseId: number;
};

export async function POST(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!hasPermission(user, "sell")) {
      return Response.json({ ok: false, error: "دسترسی فروش برای شما فعال نیست" }, { status: 403 });
    }

    const body = await req.json();
    const {
      warehouseId, items = [], returnItems = [], customerName, customerPhone, customerAddress, customerBirthDate,
      notes, discount, salesMethod,
    } = body as {
      warehouseId: number; items?: SaleItem[]; returnItems?: SaleReturnItem[];
      customerName?: string; customerPhone?: string;
      customerAddress?: string; customerBirthDate?: string;
      notes?: string; discount?: number; salesMethod?: string;
    };

    if (!warehouseId || (!items.length && !returnItems.length)) {
      return Response.json({ ok: false, error: "انبار و حداقل یک قلم خرید یا مرجوعی الزامی است" }, { status: 400 });
    }

    const phoneRaw = String(customerPhone ?? "").trim();
    let phone: string | null = null;
    if (phoneRaw) {
      phone = normalizePhone(phoneRaw);
      if (!isValidIranMobile(phone)) {
        return Response.json({ ok: false, error: "شماره موبایل نامعتبر است (09xxxxxxxxx)" }, { status: 400 });
      }
    }

    const nameTrim = String(customerName ?? "").trim();
    const addressTrim = String(customerAddress ?? "").trim();
    const birthRaw = String(customerBirthDate ?? "").trim();
    let birthDate: string | null = null;
    if (birthRaw) {
      const parsed = parseJalali(birthRaw);
      if (!parsed || !isValidJalaliDate(parsed.jy, parsed.jm, parsed.jd)) {
        return Response.json({ ok: false, error: "تاریخ تولد شمسی نامعتبر است" }, { status: 400 });
      }
      birthDate = formatJalali(parsed.jy, parsed.jm, parsed.jd);
    }

    const resolvedName = nameTrim || DEFAULT_BUYER_NAME;
    const method = String(salesMethod || "normal");
    if (!isValidSalesMethod(method)) {
      return Response.json({ ok: false, error: "روش فروش نامعتبر است" }, { status: 400 });
    }

    const store = getStore();

    if (!isManager(user)) {
      const perm = store.userSalesPermissions.find(
        (p) => p.userId === user.id && p.warehouseId === warehouseId,
      );
      if (!perm?.enabled) {
        return Response.json({ ok: false, error: "شما اجازه فروش در این انبار را ندارید" }, { status: 403 });
      }
      const allowed = perm.salesMethods ?? [];
      if (!allowed.includes(method)) {
        return Response.json({ ok: false, error: "این روش فروش برای شما در این انبار مجاز نیست" }, { status: 403 });
      }
    }

    const settings = store.invoiceSettings[0];
    const prefix = settings?.invoicePrefix ?? "CF";
    const invoiceNumber = genInvoiceNumber(prefix);

    const purchaseSubtotal = items.reduce((a, i) => a + i.lineTotal, 0);
    const returnCredit = returnItems.reduce((a, i) => a + Math.max(0, Number(i.unitPrice) || 0), 0);
    let subtotal = purchaseSubtotal - returnCredit;
    const totalDiscount = Number(discount) || 0;
    let grandTotal = subtotal - totalDiscount;

    const businessSnapshot: Record<string, string> = {
      businessName: settings?.businessName ?? "",
      businessLogo: settings?.businessLogo ?? "",
      address: settings?.address ?? "",
      phone: settings?.phone ?? "",
      website: settings?.website ?? "",
      socialNetwork: settings?.socialNetwork ?? "",
      socialUrl: settings?.socialUrl ?? "",
      taxId: settings?.taxId ?? "",
      invoiceTitle: settings?.invoiceTitle ?? "فاکتور فروش",
      footerText: settings?.footerText ?? "",
      returnPolicy: settings?.returnPolicy ?? "",
    };

    const invoice = runInTransaction((tx) => {
      const allocatedPerLine: {
        barcodes: string[]; variationId: number; productId: number; color: string | null; size: string | null;
      }[] = [];
      const allocatedReturns: {
        input: SaleReturnItem;
        unit: ProductUnit;
        product: Product;
        variation: ProductVariation;
        targetWarehouse: { id: number; name: string; isActive: boolean | null };
        originalInvoiceId: number | null;
        originalInvoiceItemId: number | null;
        originalWarehouseId: number | null;
        originalSoldBy: number | null;
        unitPrice: number;
      }[] = [];

      for (const item of items) {
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) throw new Error("تعداد نامعتبر");

        let units: ProductUnit[] = [];

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
            if (qty !== 1) throw new Error("هر بارکد واحد فقط یک عدد است — برای تعداد بیشتر اسکن جداگانه انجام دهید");
            units = [byUnit];
          } else {
            let variationId = item.variationId;
            if (!variationId) {
              variationId = tx.productVariations.find((v) => v.productId === item.productId)?.id;
            }
            if (!variationId) throw new Error(`ورییشن برای «${item.productName}» یافت نشد`);

            units = tx.productUnits
              .filter((u) =>
                u.variationId === variationId &&
                u.warehouseId === warehouseId &&
                u.status === "in_stock",
              )
              .slice(0, qty);

            if (units.length < qty) {
              throw new Error(`موجودی انبار برای «${item.productName}» کافی نیست`);
            }
          }
        }

        if (units.length < qty) throw new Error(`موجودی کافی نیست برای «${item.productName}»`);

        const take = units.slice(0, qty);
        const variation = tx.productVariations.find((v) => v.id === take[0].variationId);
        allocatedPerLine.push({
          barcodes: take.map((u) => u.barcode),
          variationId: take[0].variationId,
          productId: take[0].productId,
          color: item.color ?? variation?.color ?? null,
          size: item.size ?? variation?.size ?? null,
        });
      }

      const seenReturnBarcodes = new Set<string>();
      for (const input of returnItems) {
        const barcode = String(input.barcode ?? "").trim();
        if (!barcode || seenReturnBarcodes.has(barcode)) {
          throw new Error(barcode ? `بارکد مرجوعی ${barcode} تکراری است` : "بارکد مرجوعی نامعتبر است");
        }
        seenReturnBarcodes.add(barcode);

        const unit = tx.productUnits.find((u) => u.barcode === barcode);
        if (!unit || unit.status !== "sold") {
          throw new Error(`بارکد ${barcode} فروخته نشده یا قبلاً مرجوع شده است`);
        }
        const product = tx.products.find((p) => p.id === unit.productId);
        const variation = tx.productVariations.find((v) => v.id === unit.variationId);
        const targetWarehouse = tx.warehouses.find((w) => w.id === Number(input.returnWarehouseId));
        if (!product || !variation || !targetWarehouse?.isActive) {
          throw new Error(`اطلاعات محصول یا انبار مقصد برای ${barcode} معتبر نیست`);
        }

        let originalInvoiceId: number | null = unit.soldInvoiceId ?? null;
        let originalInvoiceItemId: number | null = null;
        let originalWarehouseId: number | null = null;
        let originalSoldBy: number | null = null;
        let unitPrice = Math.max(0, Number(input.unitPrice) || Number(variation.price ?? product.price ?? 0));
        if (unit.soldInvoiceId) {
          const originalInvoice = tx.invoices.find((i) => i.id === unit.soldInvoiceId);
          originalWarehouseId = originalInvoice?.warehouseId ?? null;
          originalSoldBy = originalInvoice?.soldBy ?? null;
          const originalItems = tx.invoiceItems.filter((i) => i.invoiceId === unit.soldInvoiceId);
          const originalItem = originalItems.find((i) =>
            i.barcode === barcode || (i.unitBarcodes ?? []).includes(barcode),
          );
          if (originalItem) {
            originalInvoiceItemId = originalItem.id;
            unitPrice = Math.max(0, Number(originalItem.unitPrice) || unitPrice);
          }
        }

        allocatedReturns.push({
          input: { ...input, barcode },
          unit,
          product,
          variation,
          targetWarehouse,
          originalInvoiceId,
          originalInvoiceItemId,
          originalWarehouseId,
          originalSoldBy,
          unitPrice,
        });
      }

      const verifiedReturnCredit = allocatedReturns.reduce((sum, item) => sum + item.unitPrice, 0);
      subtotal = purchaseSubtotal - verifiedReturnCredit;
      grandTotal = subtotal - totalDiscount;

      const now = new Date();
      const inv: Invoice = {
        id: nextId(tx, "invoices"),
        invoiceNumber,
        soldBy: user.id,
        warehouseId,
        salesMethod: method,
        customerName: resolvedName,
        customerPhone: phone,
        customerAddress: addressTrim || null,
        customerBirthDate: birthDate,
        notes: notes || null,
        subtotal,
        totalDiscount,
        totalTax: 0,
        grandTotal,
        businessSnapshot,
        status: "completed",
        customerSmsSentAt: null,
        adminSmsSentAt: null,
        lastSmsError: null,
        createdAt: now,
      };
      tx.invoices.push(inv);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const alloc = allocatedPerLine[i];
        const qty = alloc.barcodes.length;

        tx.invoiceItems.push({
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
        });

        for (const bc of alloc.barcodes) {
          const u = tx.productUnits.find((x) => x.barcode === bc);
          if (!u) continue;
          u.status = "sold";
          u.soldInvoiceId = inv.id;
          u.soldAt = now;
          u.warehouseId = null;
          u.updatedAt = now;

          bumpStock(tx, u.productId, u.variationId, warehouseId, -1);

          const variation = tx.productVariations.find((v) => v.id === u.variationId);
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
            reference: invoiceNumber,
          }]);
        }
      }

      for (let i = 0; i < allocatedReturns.length; i++) {
        const returned = allocatedReturns[i];
        const returnId = `RTN-${Date.now().toString(36).toUpperCase()}-${i + 1}`;

        tx.invoiceItems.push({
          id: nextId(tx, "invoiceItems"),
          invoiceId: inv.id,
          productId: returned.product.id,
          variationId: returned.variation.id,
          barcode: returned.unit.barcode,
          productName: returned.product.name,
          color: returned.variation.color,
          size: returned.variation.size,
          quantity: -1,
          unitPrice: returned.unitPrice,
          discount: 0,
          lineTotal: -returned.unitPrice,
          unitBarcodes: [returned.unit.barcode],
        });

        const ret: Return = {
          id: nextId(tx, "returns"),
          returnId,
          invoiceId: returned.originalInvoiceId,
          invoiceItemId: returned.originalInvoiceItemId,
          productId: returned.product.id,
          variationId: returned.variation.id,
          unitId: returned.unit.id,
          barcode: returned.unit.barcode,
          productName: returned.product.name,
          quantity: 1,
          unitPrice: returned.unitPrice,
          amount: returned.unitPrice,
          affectsSales: false,
          originalWarehouseId: returned.originalWarehouseId,
          returnWarehouseId: returned.targetWarehouse.id,
          originalSoldBy: returned.originalSoldBy,
          returnedBy: user.id,
          reason: "مرجوعی همزمان با ثبت فروش",
          notes: notes || null,
          status: "returned",
          createdAt: now,
        };
        tx.returns.push(ret);

        returned.unit.status = "in_stock";
        returned.unit.warehouseId = returned.targetWarehouse.id;
        returned.unit.soldInvoiceId = null;
        returned.unit.soldAt = null;
        returned.unit.updatedAt = now;

        bumpStock(tx, returned.product.id, returned.variation.id, returned.targetWarehouse.id, 1);
        writeLedger(tx, [{
          productId: returned.product.id,
          variationId: returned.variation.id,
          unitId: returned.unit.id,
          barcode: returned.unit.barcode,
          productName: returned.product.name,
          color: returned.variation.color,
          size: returned.variation.size,
          quantity: 1,
          sourceWarehouseId: returned.originalWarehouseId,
          destWarehouseId: returned.targetWarehouse.id,
          transactionType: "return",
          operatorId: user.id,
          operatorName: user.name,
          documentNumber: returnId,
          reference: invoiceNumber,
        }]);
      }

      if (phone) {
        const existing = tx.customers.find((c) => c.phone === phone);
        if (existing) {
          existing.name = nameTrim || existing.name;
          existing.address = addressTrim || existing.address;
          existing.birthDate = birthDate || existing.birthDate;
          existing.updatedAt = now;
        } else {
          tx.customers.push({
            id: nextId(tx, "customers"),
            name: resolvedName,
            phone,
            address: addressTrim || "",
            birthDate: birthDate || "",
            createdBy: user.id,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      writeAudit(tx, user, "ثبت فروش", "invoice", inv.id,
        `فاکتور ${invoiceNumber} — ${method} — مبلغ: ${grandTotal} تومان`,
        { relatedInvoice: invoiceNumber, warehouseId, kind: "success" },
      );

      return inv;
    });

    let smsSent = false;
    if (items.length > 0) {
      try {
        const sms = await notifySaleFinalized({ invoiceId: invoice.id, sentBy: user.id });
        smsSent = sms.customerSent;
      } catch (err) {
        console.error("Sale SMS failed:", err);
      }
    }

    const savedItems = getStore().invoiceItems.filter((i) => i.invoiceId === invoice.id);
    const wh = getStore().warehouses.find((w) => w.id === warehouseId);

    return Response.json({
      ok: true,
      smsSent,
      invoice: {
        ...invoice,
        items: savedItems,
        warehouseName: wh?.name ?? null,
        sellerName: user.name,
        business: businessSnapshot,
      },
    });
  } catch (e) {
    console.error("Invoice error:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 400 });
  }
}
