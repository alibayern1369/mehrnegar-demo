import { getStore } from "./store";
import { seedMockData } from "./seed";

/** Ensure mock store has demo data loaded before API handlers run */
export function ensureSeeded(): void {
  const store = getStore();
  if (!store.seeded) {
    seedMockData();
  }
}
