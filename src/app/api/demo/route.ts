import { DEMO_ACCOUNTS } from "@/lib/demo";

export const dynamic = "force-dynamic";

/** Public demo metadata for login UI. */
export async function GET() {
  return Response.json({
    ok: true,
    demo: true,
    accounts: DEMO_ACCOUNTS.map((a) => ({
      username: a.username,
      password: a.password,
      label: a.label,
      role: a.role,
    })),
  });
}
