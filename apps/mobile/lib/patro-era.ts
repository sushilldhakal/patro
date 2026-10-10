/** Calendar browse eras — positive year; era carries epoch (mirrors web `@/lib/era`). */
export const PATRO_BROWSE_ERAS = ["ad", "bc", "bs", "bbs"] as const;
export type PatroBrowseEra = (typeof PATRO_BROWSE_ERAS)[number];

const DESCENDING: ReadonlySet<PatroBrowseEra> = new Set(["bc", "bbs"]);

export function isPatroBrowseEra(value: unknown): value is PatroBrowseEra {
  return typeof value === "string" && (PATRO_BROWSE_ERAS as readonly string[]).includes(value);
}

export function isDescendingBrowseEra(era: PatroBrowseEra): boolean {
  return DESCENDING.has(era);
}

export function isGregorianBrowseEra(era: PatroBrowseEra): boolean {
  return era === "ad" || era === "bc";
}

/** BS↔BBS or AD↔BC. */
export function togglePatroBrowseEra(era: PatroBrowseEra): PatroBrowseEra {
  switch (era) {
    case "bs":
      return "bbs";
    case "bbs":
      return "bs";
    case "ad":
      return "bc";
    case "bc":
      return "ad";
  }
}

/** Default era when a page has not pinned one — Nepali → BS, English → AD. */
export function defaultBrowseEraForLang(lang: "ne" | "en"): PatroBrowseEra {
  return lang === "en" ? "ad" : "bs";
}

/** UI language default: English → AD, Nepali → BS (mirrors web `readCalendarEra`). */
export function readCalendarEraForLang(lang: "ne" | "en"): PatroBrowseEra {
  return defaultBrowseEraForLang(lang);
}

/** Civil “today” is always BS or AD — not BBS coordinates. */
export function patroBrowseTodayEra(era: PatroBrowseEra): PatroBrowseEra {
  if (era === "bbs") return "bs";
  return era;
}

/** Era toggle within the active language pair (Nepali: BS/BBS, English: AD/BC). */
export function toggleBrowseEraForLang(era: PatroBrowseEra, lang: "ne" | "en"): PatroBrowseEra {
  if (lang === "en") {
    if (era === "ad") return "bc";
    if (era === "bc") return "ad";
    return "ad";
  }
  if (era === "bs") return "bbs";
  if (era === "bbs") return "bs";
  return "bs";
}

export function browseEraPairForLang(lang: "ne" | "en"): [PatroBrowseEra, PatroBrowseEra] {
  return lang === "en" ? ["ad", "bc"] : ["bs", "bbs"];
}

/** Map UI browse era to API `era` query (web year endpoints). */
export function browseEraToApi(era: PatroBrowseEra): "bs" | "ad" | "bbs" {
  if (era === "ad" || era === "bc") return "ad";
  if (era === "bbs") return "bbs";
  return "bs";
}
