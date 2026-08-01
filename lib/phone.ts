import {
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export type Country = {
  iso: string;
  name: string;
  flag: string;
  callingCode: string;
};

/** Regional-indicator letters render as a flag: "MY" -> 🇲🇾. */
function flagFor(iso: string): string {
  return String.fromCodePoint(
    ...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

const COUNTRY_NAMES: [string, string][] = [
  ["MY", "Malaysia"],
  ["SG", "Singapore"],
  ["HK", "Hong Kong"],
  ["TW", "Taiwan"],
  ["CN", "China"],
  ["ID", "Indonesia"],
  ["TH", "Thailand"],
  ["PH", "Philippines"],
  ["VN", "Vietnam"],
  ["BN", "Brunei"],
  ["IN", "India"],
  ["JP", "Japan"],
  ["KR", "South Korea"],
  ["AU", "Australia"],
  ["NZ", "New Zealand"],
  ["GB", "United Kingdom"],
  ["US", "United States"],
  ["CA", "Canada"],
  ["AE", "United Arab Emirates"],
];

export const COUNTRIES: Country[] = COUNTRY_NAMES.filter(([iso]) =>
  isSupportedCountry(iso),
).map(([iso, name]) => ({
  iso,
  name,
  flag: flagFor(iso),
  callingCode: getCountryCallingCode(iso as CountryCode),
}));

/** Older installs configured a dialling code; map the common ones to ISO. */
const LEGACY_CODE_TO_ISO: Record<string, string> = {
  "60": "MY",
  "65": "SG",
  "852": "HK",
  "886": "TW",
  "86": "CN",
  "62": "ID",
  "66": "TH",
  "63": "PH",
  "84": "VN",
  "91": "IN",
  "61": "AU",
  "44": "GB",
  "1": "US",
};

function resolveDefaultCountry(): string {
  const explicit = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY?.toUpperCase();
  if (explicit && isSupportedCountry(explicit)) return explicit;

  const legacy = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY_CODE;
  if (legacy && LEGACY_CODE_TO_ISO[legacy]) return LEGACY_CODE_TO_ISO[legacy];

  return "MY";
}

export const DEFAULT_COUNTRY = resolveDefaultCountry();

export type ParsedPhone = { e164: string; display: string };

const INVALID =
  "That WhatsApp number doesn't look right for the country you picked. Check the digits.";

/**
 * Validates a number against the selected country's real numbering rules, so a
 * typo is rejected here rather than becoming a dead wa.me link later.
 *
 * The country acts as a default only: a number typed with an explicit "+"
 * prefix keeps its own country. National trunk prefixes (a leading 0 in MY, SG,
 * GB, AU) are handled by the parser.
 */
export function parsePhone(
  country: string,
  localNumber: string,
): ParsedPhone | { error: string } {
  const iso = country.trim().toUpperCase();
  if (!iso || !isSupportedCountry(iso)) {
    return { error: "Please choose a country." };
  }

  const raw = localNumber.trim();
  if (!raw) return { error: "Please enter your WhatsApp number." };
  if (!/\d/.test(raw)) return { error: INVALID };

  const parsed = parsePhoneNumberFromString(raw, iso as CountryCode);
  if (!parsed || !parsed.isValid()) return { error: INVALID };

  // WhatsApp cannot be reached on a fixed line.
  const type = parsed.getType();
  if (type === "FIXED_LINE") {
    return {
      error: "That looks like a landline. Please enter a mobile number for WhatsApp.",
    };
  }

  return {
    e164: parsed.number.replace(/\D/g, ""),
    display: parsed.formatInternational(),
  };
}

/** Deep link that opens a chat with this number in WhatsApp. */
export function whatsappLink(e164: string, message?: string): string {
  const base = `https://wa.me/${e164.replace(/\D/g, "")}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
