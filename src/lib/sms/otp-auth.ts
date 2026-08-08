/** OTP auth — not used in demo API routes (handled in /api/auth/otp/*). Stubs for compatibility. */
export { encodeToken, hashPassword, verifyPassword, type SessionUser } from "@/lib/auth";

export async function requestLoginOtp() {
  return { ok: false as const, error: "Use /api/auth/otp/request in demo", status: 400 };
}

export async function verifyLoginOtp() {
  return { ok: false as const, error: "Use /api/auth/otp/verify in demo", status: 400 };
}

export async function bootstrapPasswordLogin() {
  return { ok: false as const, error: "Use /api/auth/login in demo", status: 400 };
}
