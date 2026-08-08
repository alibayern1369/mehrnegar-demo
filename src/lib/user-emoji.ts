/** Avatar emoji derived from user gender (and role as fallback). */
export function userEmoji(u: { gender?: string | null; role?: string } | null | undefined): string {
  if (!u) return "👤";
  if (u.gender === "female") return "👩";
  if (u.gender === "male") return "👨";
  return u.role === "manager" ? "🛡️" : "👤";
}
