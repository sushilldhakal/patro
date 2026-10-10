const NEPALI_DIGITS: Record<string, string> = {
  "0": "०", "1": "१", "2": "२", "3": "३", "4": "४",
  "5": "५", "6": "६", "7": "७", "8": "८", "9": "९",
};

export type Lang = "en" | "ne";

export function normalizeLang(lang?: string): Lang {
  return (lang ?? "ne").slice(0, 2) === "en" ? "en" : "ne";
}

export function pickLocale<T>(lang: string | undefined, ne: T, en: T): T {
  return normalizeLang(lang) === "en" ? en : ne;
}

export function formatLocaleDigits(value: string | number, lang?: string): string {
  if (normalizeLang(lang) === "en") return String(value);
  return String(value).replace(/[0-9]/g, (d) => NEPALI_DIGITS[d] ?? d);
}
