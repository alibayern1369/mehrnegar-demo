import { ensureSeeded, getStore, nextId } from "@/mock";
import { getCurrentUserAsync, isManager } from "@/mock/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    ensureSeeded();
    const [s] = getStore().invoiceSettings;
    return Response.json({ ok: true, settings: s ?? null });
  } catch (e) {
    return Response.json({ ok: false, settings: null, error: String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    ensureSeeded();
    const user = await getCurrentUserAsync(req);
    if (!isManager(user)) return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const store = getStore();
    const now = new Date();

    let result = store.invoiceSettings[0];
    if (!result) {
      result = {
        id: nextId(store, "invoiceSettings"),
        businessName: body.businessName ?? null,
        businessLogo: body.businessLogo ?? null,
        address: body.address ?? null,
        phone: body.phone ?? null,
        website: body.website ?? null,
        socialNetwork: body.socialNetwork ?? null,
        socialUrl: body.socialUrl ?? null,
        taxId: body.taxId ?? null,
        invoiceTitle: body.invoiceTitle ?? null,
        invoicePrefix: body.invoicePrefix ?? null,
        footerText: body.footerText ?? null,
        returnPolicy: body.returnPolicy ?? null,
        customNotes: body.customNotes ?? null,
        updatedAt: now,
      };
      store.invoiceSettings.push(result);
    } else {
      result.businessName = body.businessName ?? result.businessName;
      result.businessLogo = body.businessLogo !== undefined ? body.businessLogo : result.businessLogo;
      result.address = body.address ?? result.address;
      result.phone = body.phone ?? result.phone;
      result.website = body.website ?? result.website;
      result.socialNetwork = body.socialNetwork !== undefined ? body.socialNetwork : result.socialNetwork;
      result.socialUrl = body.socialUrl !== undefined ? body.socialUrl : result.socialUrl;
      result.taxId = body.taxId ?? result.taxId;
      result.invoiceTitle = body.invoiceTitle ?? result.invoiceTitle;
      result.invoicePrefix = body.invoicePrefix ?? result.invoicePrefix;
      result.footerText = body.footerText ?? result.footerText;
      result.returnPolicy = body.returnPolicy ?? result.returnPolicy;
      result.customNotes = body.customNotes ?? result.customNotes;
      result.updatedAt = now;
    }

    store.auditLogs.push({
      id: nextId(store, "auditLogs"),
      userId: user!.id,
      userName: user!.name,
      action: "ویرایش تنظیمات فاکتور",
      entity: "setting",
      entityId: null,
      detail: null,
      prevValue: null,
      newValue: null,
      warehouseId: null,
      relatedInvoice: null,
      kind: "info",
      createdAt: now,
    });

    return Response.json({ ok: true, settings: result });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
