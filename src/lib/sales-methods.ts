export const SALES_METHODS = [
  { id: "normal",  label: "پرداخت عادی" },
  { id: "snappay", label: "پرداخت با اسنپ پی حضوری" },
] as const;

export type SalesMethodId = (typeof SALES_METHODS)[number]["id"];

const LEGACY_LABELS: Record<string, string> = {
  website: "وب‌سایت",
  digikala: "دیجی‌کالا",
};

export function salesMethodLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return SALES_METHODS.find((m) => m.id === id)?.label ?? LEGACY_LABELS[id] ?? id;
}

export function isValidSalesMethod(id: string): id is SalesMethodId {
  return SALES_METHODS.some((m) => m.id === id);
}
