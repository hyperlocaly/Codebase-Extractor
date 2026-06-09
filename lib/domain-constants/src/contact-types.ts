export const CONTACT_TYPES = [
  "phone",
  "whatsapp",
  "email",
  "website",
  "instagram",
  "facebook",
  "twitter",
  "telegram",
  "tiktok",
  "youtube",
  "linkedin",
] as const;

export type ContactType = (typeof CONTACT_TYPES)[number];
