const E164_REGEX = /^\+[1-9]\d{6,14}$/;

const COUNTRY_PHONE_CODES: Record<string, string> = {
  NG: "+234",
  GH: "+233",
  KE: "+254",
  ZA: "+27",
  US: "+1",
  GB: "+44",
};

export function isValidE164(phone: string): boolean {
  return E164_REGEX.test(phone);
}

export function normalizePhone(
  raw: string,
  countryIso?: string,
): string | null {
  const stripped = raw.replace(/[\s\-().]/g, "");

  if (stripped.startsWith("+")) {
    return E164_REGEX.test(stripped) ? stripped : null;
  }

  if (countryIso && stripped.startsWith("0")) {
    const code = COUNTRY_PHONE_CODES[countryIso.toUpperCase()];
    if (code) {
      const normalized = code + stripped.slice(1);
      return E164_REGEX.test(normalized) ? normalized : null;
    }
  }

  return null;
}

export function formatPhoneForDisplay(e164: string): string {
  return e164;
}
