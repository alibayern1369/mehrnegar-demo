import { demoModeBlockedMessage } from "@/lib/demo";

export async function resetAllData() {
  throw new Error(demoModeBlockedMessage());
}
