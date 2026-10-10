import { ERA_CODES, type Era } from "@/lib/era";
import { getPatroLimits } from "@/lib/patro-year-axis";

const DEVANAGARI_TO_ASCII: Record<string, string> = {
  "०": "0",
  "१": "1",
  "२": "2",
  "३": "3",
  "४": "4",
  "५": "5",
  "६": "6",
  "७": "7",
  "८": "8",
  "९": "9",
};

function asciiDigitsFromQuery(q: string): string {
  return q.replace(/[०-९]/g, (ch) => DEVANAGARI_TO_ASCII[ch] ?? ch).replace(/[^\d]/g, "");
}

type YearSearchEra = Era | "any";

/** Parse "510 bs", "5 bc", "५१०" → positive year + era hint. */
export function parsePatroYearSearchQuery(
  raw: string,
  activeEra?: Era,
): {
  n: number | null;
  era: YearSearchEra;
} {
  const q = raw.trim().toLowerCase();
  if (!q) return { n: null, era: activeEra ?? "any" };

  let era: YearSearchEra = activeEra ?? "any";
  for (const code of ERA_CODES) {
    const re = new RegExp(`\\b${code}\\b`);
    if (re.test(q)) {
      era = code;
      break;
    }
  }
  if (era === "any" || era === activeEra) {
    const hasBbs =
      q.includes("पू. वि.सं") || q.includes("पूर्व") || q.includes("purba") || /\bbbs\b/.test(q);
    const hasBs =
      !hasBbs && (/\bbs\b/.test(q) || /\bvi\.?\s*san\b/.test(q) || q.includes("वि.सं"));
    const hasBc = /\bbc\b/.test(q) || q.includes("bce");
    const hasAd = /\bad\b/.test(q) || q.includes("ce");
    if (hasBbs) era = "bbs";
    else if (hasBs) era = "bs";
    else if (hasBc) era = "bc";
    else if (hasAd) era = "ad";
  }

  const digitsOnly = asciiDigitsFromQuery(q);
  if (!digitsOnly) return { n: null, era };

  const n = parseInt(digitsOnly, 10);
  return Number.isFinite(n) && n >= 1 ? { n, era } : { n: null, era };
}

/** Signed axis values to look up for an exact calendar year number (legacy month nav). */
export function signedTargetsForYearSearch(n: number, era: YearSearchEra): number[] {
  if (n <= 0) return [];
  if (era === "bbs") return [-n];
  if (era === "bs") return n <= getPatroLimits().ephemerisSignedMax ? [n] : [];
  return [n, -n];
}
