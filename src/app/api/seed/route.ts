import { getCurrentUser, isManager } from "@/mock/auth-helpers";
import { ensureSeeded, resetAndSeed, seedMockData } from "@/mock";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Re-seed mock demo data (manager only) */
export async function POST(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!isManager(user)) {
      return Response.json({ ok: false, error: "فقط مدیر می‌تواند داده تست بسازد" }, { status: 403 });
    }

    const url = new URL(req.url);
    let force = url.searchParams.get("force") === "1";
    try {
      const body = await req.json().catch(() => ({}));
      if (body?.force) force = true;
    } catch { /* empty body ok */ }

    const result = force ? resetAndSeed() : seedMockData({ force: true });
    return Response.json(result);
  } catch (e) {
    console.error("Test seed error:", e);
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

/** Verify mock inventory integrity */
export async function GET(req: Request) {
  try {
    ensureSeeded();
    const user = getCurrentUser(req);
    if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!isManager(user)) {
      return Response.json({ ok: false, error: "دسترسی مجاز نیست" }, { status: 403 });
    }

    const { getStore } = await import("@/mock");
    const store = getStore();
    const inStock = store.productUnits.filter((u) => u.status === "in_stock").length;
    const sold = store.productUnits.filter((u) => u.status === "sold").length;
    const verification = {
      products: store.products.length,
      variations: store.productVariations.length,
      units: store.productUnits.length,
      inStock,
      sold,
      invoices: store.invoices.length,
      returns: store.returns.length,
      ledgerEntries: store.inventoryLedger.length,
      ok: true,
    };
    return Response.json({ ok: true, verification });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
