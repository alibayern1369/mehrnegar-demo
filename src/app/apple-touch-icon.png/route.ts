import { appIconResponse } from "@/lib/generate-app-icon";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Safari auto-requests /apple-touch-icon.png when adding to Home Screen */
export async function GET() {
  return appIconResponse(180);
}
