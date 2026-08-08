export type SocialNetworkId =
  | "instagram"
  | "x"
  | "facebook"
  | "telegram"
  | "linkedin"
  | "youtube"
  | "aparat"
  | "other";

export const SOCIAL_NETWORKS: { id: SocialNetworkId; label: string; placeholder: string }[] = [
  { id: "instagram", label: "اینستاگرام", placeholder: "instagram.com/..." },
  { id: "x",         label: "ایکس (توییتر)", placeholder: "x.com/..." },
  { id: "facebook",  label: "فیس‌بوک", placeholder: "facebook.com/..." },
  { id: "telegram",  label: "تلگرام", placeholder: "t.me/..." },
  { id: "linkedin",  label: "لینکدین", placeholder: "linkedin.com/..." },
  { id: "youtube",   label: "یوتیوب", placeholder: "youtube.com/..." },
  { id: "aparat",    label: "آپارات", placeholder: "aparat.com/..." },
  { id: "other",     label: "سایر", placeholder: "آدرس شبکه اجتماعی" },
];

export function socialNetworkLabel(id?: string | null): string {
  if (!id) return "";
  return SOCIAL_NETWORKS.find((n) => n.id === id)?.label ?? id;
}

/** Compact line for receipts / letterheads, e.g. "اینستاگرام: @shop". */
export function formatSocialLine(network?: string | null, url?: string | null): string {
  const address = (url ?? "").trim();
  if (!address) return "";
  const label = socialNetworkLabel(network);
  return label ? `${label}: ${address}` : address;
}
