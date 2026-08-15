import { NextResponse } from "next/server";
import { getMarketingContent, publicMarketingContent } from "@/lib/marketing/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const content = await getMarketingContent();
  return NextResponse.json({ ok: true, content: publicMarketingContent(content) });
}
