/** Display labels for divisional charts — all varga math lives in the API. */

export type ChartAnchor =
  | "lagna"
  | "sun"
  | "moon"
  | "mars"
  | "mercury"
  | "jupiter"
  | "venus"
  | "saturn"
  | "rahu"
  | "ketu";

export const GRAHA_ANCHOR_ORDER: ChartAnchor[] = [
  "sun",
  "moon",
  "mars",
  "mercury",
  "jupiter",
  "venus",
  "saturn",
  "rahu",
  "ketu",
];

export const CHART_ANCHOR_LABELS: Record<
  ChartAnchor,
  { labelNe: string; labelEn: string }
> = {
  lagna: { labelNe: "लग्न", labelEn: "Lagna" },
  sun: { labelNe: "सूर्य", labelEn: "Sun" },
  moon: { labelNe: "चन्द्र", labelEn: "Moon" },
  mars: { labelNe: "मंगल", labelEn: "Mars" },
  mercury: { labelNe: "बुध", labelEn: "Mercury" },
  jupiter: { labelNe: "बृहस्पति", labelEn: "Jupiter" },
  venus: { labelNe: "शुक्र", labelEn: "Venus" },
  saturn: { labelNe: "शनि", labelEn: "Saturn" },
  rahu: { labelNe: "राहु", labelEn: "Rahu" },
  ketu: { labelNe: "केतु", labelEn: "Ketu" },
};

export const VARGA_OPTIONS: {
  division: number;
  labelNe: string;
  labelEn: string;
  short: string;
}[] = [
  { division: 1, labelNe: "राशि", labelEn: "Rashi", short: "D1" },
  { division: 2, labelNe: "होरा", labelEn: "Hora", short: "D2" },
  { division: 3, labelNe: "द्रेष्काण", labelEn: "Drekkana", short: "D3" },
  { division: 4, labelNe: "चतुर्थांश", labelEn: "Chaturthamsa", short: "D4" },
  { division: 5, labelNe: "पञ्चांश", labelEn: "Panchamsa", short: "D5" },
  { division: 6, labelNe: "षष्ठांश", labelEn: "Shashthamsa", short: "D6" },
  { division: 7, labelNe: "सप्तांश", labelEn: "Saptamsa", short: "D7" },
  { division: 8, labelNe: "अष्टांश", labelEn: "Ashtamsa", short: "D8" },
  { division: 9, labelNe: "नवांश", labelEn: "Navamsa", short: "D9" },
  { division: 10, labelNe: "दशांश", labelEn: "Dasamsa", short: "D10" },
  { division: 11, labelNe: "एकादशांश", labelEn: "Ekadashamsa", short: "D11" },
  { division: 12, labelNe: "द्वादशांश", labelEn: "Dwadashamsa", short: "D12" },
  { division: 16, labelNe: "षोडशांश", labelEn: "Shodashamsa", short: "D16" },
  { division: 20, labelNe: "विंशांश", labelEn: "Vimsamsa", short: "D20" },
  { division: 24, labelNe: "चतुर्विंशांश", labelEn: "Chaturvimsamsa", short: "D24" },
  { division: 27, labelNe: "सप्तविंशांश", labelEn: "Saptavimsamsa", short: "D27" },
  { division: 30, labelNe: "त्रिंशांश", labelEn: "Trimsamsa", short: "D30" },
  { division: 40, labelNe: "खवेदांश", labelEn: "Khavedamsa", short: "D40" },
  { division: 45, labelNe: "अक्षवेदांश", labelEn: "Akshavedamsa", short: "D45" },
  { division: 60, labelNe: "षष्ट्यंश", labelEn: "Shashtiamsa", short: "D60" },
];

export function vargaOption(division: number) {
  return VARGA_OPTIONS.find((v) => v.division === division) ?? VARGA_OPTIONS[0]!;
}
