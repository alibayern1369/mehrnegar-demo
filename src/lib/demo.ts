/** Demo repository helpers. */

/** Default branding asset (served from /public). */
export const DEMO_APP_LOGO = "/logo.png";

export type DemoAccount = {
  username: string;
  password: string;
  label: string;
  role: "manager" | "user";
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    username: "mehrnegaradmin",
    password: "Admin@1234",
    label: "مدیر",
    role: "manager",
  },
  {
    username: "mehrnegaruser",
    password: "User@1234",
    label: "فروشنده",
    role: "user",
  },
];

/** Demo repository — always in demo mode. */
export function isDemoMode(): boolean {
  return true;
}

export function demoModeBlockedMessage(): string {
  return "این عملیات در محیط نمایشی امکان‌پذیر نیست";
}

export function resolveAppLogo(stored: string | null | undefined): string | null {
  if (stored?.trim()) return stored;
  return isDemoMode() ? DEMO_APP_LOGO : null;
}

export function findDemoAccount(username: string): DemoAccount | undefined {
  const key = username.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((a) => a.username === key);
}
