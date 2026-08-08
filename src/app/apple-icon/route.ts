import { appIconResponse } from "@/lib/generate-app-icon";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** iOS Add to Home Screen / apple-touch-icon — 180×180 */
export async function GET() {
  return appIconResponse(180);
}
