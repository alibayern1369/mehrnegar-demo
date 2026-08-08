/** Public demo / portfolio deploy helpers. Never enable on production with real customer data. */

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
  return "در نسخه دمو این عملیات غیرفعال است";
}

export function findDemoAccount(username: string): DemoAccount | undefined {
  const key = username.trim().toLowerCase();
  return DEMO_ACCOUNTS.find((a) => a.username === key);
}
