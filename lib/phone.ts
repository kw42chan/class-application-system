export type Country = { code: string; name: string; flag: string };

/** Country dialling codes offered in the application form. */
export const COUNTRIES: Country[] = [
  { code: "60", name: "Malaysia", flag: "🇲🇾" },
  { code: "65", name: "Singapore", flag: "🇸🇬" },
  { code: "62", name: "Indonesia", flag: "🇮🇩" },
  { code: "66", name: "Thailand", flag: "🇹🇭" },
  { code: "63", name: "Philippines", flag: "🇵🇭" },
  { code: "84", name: "Vietnam", flag: "🇻🇳" },
  { code: "673", name: "Brunei", flag: "🇧🇳" },
  { code: "852", name: "Hong Kong", flag: "🇭🇰" },
  { code: "886", name: "Taiwan", flag: "🇹🇼" },
  { code: "86", name: "China", flag: "🇨🇳" },
  { code: "91", name: "India", flag: "🇮🇳" },
  { code: "61", name: "Australia", flag: "🇦🇺" },
  { code: "64", name: "New Zealand", flag: "🇳🇿" },
  { code: "44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "1", name: "USA / Canada", flag: "🇺🇸" },
];

export const DEFAULT_COUNTRY_CODE =
  process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE ?? "60";

export type ParsedPhone = { e164: string; display: string };

/**
 * Turns a country dialling code plus a locally-typed number into the digits-only
 * form WhatsApp expects. Local trunk prefixes ("0" in MY/SG/UK/AU, "1" for
 * US/Canada long distance) are dropped, as are spaces, dashes and brackets.
 */
export function parsePhone(
  countryCode: string,
  localNumber: string,
): ParsedPhone | { error: string } {
  const cc = countryCode.replace(/\D/g, "");
  if (!cc) return { error: "Please choose a country code." };

  let local = localNumber.replace(/\D/g, "");
  if (!local) return { error: "Please enter your WhatsApp number." };

  // People often paste the full international number into the local field.
  if (local.startsWith(cc) && local.length > cc.length + 5) {
    local = local.slice(cc.length);
  }
  local = local.replace(/^0+/, "");

  if (local.length < 6 || local.length > 13) {
    return { error: "That WhatsApp number doesn't look right. Check the digits." };
  }

  const e164 = cc + local;
  if (e164.length < 8 || e164.length > 15) {
    return { error: "That WhatsApp number doesn't look right. Check the digits." };
  }

  return { e164, display: `+${cc} ${local}` };
}

/** Deep link that opens a chat with this number in WhatsApp. */
export function whatsappLink(e164: string, message?: string): string {
  const base = `https://wa.me/${e164.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
