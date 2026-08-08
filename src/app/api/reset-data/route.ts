import { demoModeBlockedMessage } from "@/lib/demo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  return Response.json({ ok: false, error: demoModeBlockedMessage() }, { status: 403 });
}
