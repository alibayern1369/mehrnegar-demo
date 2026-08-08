import { appIconResponse } from "@/lib/generate-app-icon";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** PWA / Android icon — 512×512 */
export async function GET() {
  return appIconResponse(512);
}
