import { getCurrentUser, isManager } from "@/mock/auth-helpers";
import { ensureSeeded, getStore } from "@/mock";
import { hasPermission } from "@/lib/permissions";
import { APP_VERSION_FA } from "@/lib/version";

export const dynamic = "force-dynamic";

function productNotDeleted(p: { status?: string | null }) {
  return p.status !== "deleted";
}

export async function GET(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!isManager(user) && !hasPermission(user, "settings")) {
      return Response.json({ ok: false, error: "دسترسی پشتیبان‌گیری ندارید" }, { status: 403 });
    }

    const store = getStore();
    const appRow = store.appSettings[0] ?? null;
    const inv = store.invoiceSettings[0] ?? null;
    const productRows = store.products.filter(productNotDeleted).sort((a, b) => a.id - b.id);
    const varsByProduct = new Map<number, typeof store.productVariations>();
    for (const v of store.productVariations) {
      const list = varsByProduct.get(v.productId) ?? [];
      list.push(v);
      varsByProduct.set(v.productId, list);
    }

    const payload = {
      ok: true,
      format: "mehrnegar-backup",
      version: 1,
      appVersion: APP_VERSION_FA,
      exportedAt: new Date().toISOString(),
      exportedBy: { id: user.id, name: user.name },
      settings: {
        app: {
          appName: appRow?.appName ?? "مهرنگار",
          appLogo: appRow?.appLogo ?? null,
          developerUrl: appRow?.developerUrl ?? null,
        },
        invoice: inv
          ? {
              businessName: inv.businessName,
              businessLogo: inv.businessLogo,
              address: inv.address,
              phone: inv.phone,
              website: inv.website,
              socialNetwork: inv.socialNetwork,
              socialUrl: inv.socialUrl,
              taxId: inv.taxId,
              invoiceTitle: inv.invoiceTitle,
              invoicePrefix: inv.invoicePrefix,
              footerText: inv.footerText,
              returnPolicy: inv.returnPolicy,
              customNotes: inv.customNotes,
            }
          : null,
      },
      products: productRows.map((p) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        barcode: p.barcode,
        category: p.category,
        brand: p.brand,
        supplier: p.supplier,
        description: p.description,
        color: p.color,
        size: p.size,
        price: p.price ?? p.sellingPrice ?? 0,
        tax: p.tax,
        status: p.status,
        createdAt: p.createdAt,
        variations: (varsByProduct.get(p.id) ?? []).map((v) => ({
          id: v.id,
          sku: v.sku,
          color: v.color,
          size: v.size,
          price: v.price,
          status: v.status,
        })),
      })),
    };

    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const filename = `mehrnegar-backup-${stamp}.json`;
    const body = JSON.stringify(payload, null, 2);

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
