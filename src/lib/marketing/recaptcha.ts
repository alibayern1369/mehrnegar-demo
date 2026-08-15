export async function verifyRecaptcha(
  token: string | undefined,
  secretKey: string,
): Promise<boolean> {
  if (!secretKey) {
    // Not configured — skip verification in local/dev
    return true;
  }
  if (!token) return false;
  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: secretKey, response: token }),
    });
    const data = (await res.json()) as { success?: boolean };
    return Boolean(data.success);
  } catch {
    return false;
  }
}
