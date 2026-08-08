import { encodeToken, getCurrentUserAsync } from "@/mock/auth-helpers";

export const dynamic = "force-dynamic";

/** Refresh session claims (permissions, gender, role) from mock store. */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUserAsync(req);
    if (!user) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const token = encodeToken(user);
    return Response.json({ ok: true, user, token });
  } catch (e) {
    return Response.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
