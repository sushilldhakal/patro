import raw from "./nakshatra-icons-data.json";

export interface NakshatraIconData {
  ne: string;
  en: string;
  svg: string;
  sym_ne: string;
  lord_ne: string;
}

export const NAKSHATRA_ICONS = raw as NakshatraIconData[];

const EN_ALIASES: Record<string, string> = {
  mrigashirsha: "mrigashira",
  mrigashiras: "mrigashira",
  ardra: "ardra",
  ashvini: "ashvini",
  ashwini: "ashvini",
  kritika: "krittika",
  krttika: "krittika",
  purvaphalguni: "purvaphalguni",
  uttaraphalguni: "uttaraphalguni",
  purvashadha: "purvashada",
  uttarashadha: "uttarashada",
  purvabhadrapada: "purvabhadrapada",
  uttarabhadrapada: "uttarabhadrapada",
  shatabhisha: "shatabhisha",
  satabhisha: "shatabhisha",
  shravana: "shravana",
  sravana: "shravana",
  dhanishta: "dhanishta",
  dhanishtha: "dhanishta",
  vishakha: "vishakha",
  visakha: "vishakha",
  jyestha: "jyeshtha",
  jyeshta: "jyeshtha",
};

function normKey(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s._-]+/g, "");
}

const byNe = new Map<string, NakshatraIconData>();
const byEn = new Map<string, NakshatraIconData>();

for (const item of NAKSHATRA_ICONS) {
  byNe.set(normKey(item.ne), item);
  byEn.set(normKey(item.en), item);
}

export function findNakshatraIcon(name?: string | null): NakshatraIconData | undefined {
  if (!name?.trim()) return undefined;
  const key = normKey(name);
  const fromNe = byNe.get(key);
  if (fromNe) return fromNe;
  const alias = EN_ALIASES[key] ?? key;
  return byEn.get(alias) ?? byEn.get(key);
}
