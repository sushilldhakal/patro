/**
 * Reference tables for the Surya Siddhanta reader, in the manner of
 * Burgess's translation: the revolutions and mean motions, the sine table,
 * the epicycles, the stations, the nakshatras, the orbits. Numbers the text
 * gives are computed from it (periods, daily motions); numbers it does not
 * give (modern values, Ptolemy, Bentley, Bailly) are quoted from Burgess's
 * tables and say so. The first cell of each row is its name, so a phone can
 * show the table as an accordion. copy-ok-file
 */
import { ahargana, grp } from "./surya-classical";
import { SURYA_NAKSHATRAS } from "./surya-figures";
import { NAKSHATRA27 as NAK27 } from "./surya-more-a";
import { charaKhanda, RASHI, risingAsusClean } from "./surya-more-b";
import { dms, fmt, L, num, SURYA_SINES, TRIJYA, type Lang, type MathPart, type Step } from "./surya-kit";

export type SuryaTable = {
  title: string;
  note?: string;
  columns: string[];
  rows: string[][];
  /** The first column is a running number; a phone titles each row "number. name". */
  numbered?: boolean;
  /** Row to mark, e.g. the current year of the cycle. */
  highlight?: number;
  steps?: Step[];
};

export type TableKey =
  | "mean-motions"
  | "bija"
  | "compare-revolutions"
  | "apsis-node"
  | "kali-positions"
  | "samvatsara"
  | "sine-values"
  | "epicycles"
  | "stations"
  | "nakshatra-list"
  | "kalamsha"
  | "kaksha-list"
  | "rising-times"
  | "special-stars"
  | "star-visibility"
  | "month-names"
  | "eight-motions"
  | "graha-yuddha";

export const SURYA_TABLE_PLACES: { chapter: number; verse: number; key: TableKey }[] = [
  { chapter: 1, verse: 34, key: "mean-motions" },
  { chapter: 1, verse: 40, key: "compare-revolutions" },
  { chapter: 1, verse: 40, key: "bija" },
  { chapter: 1, verse: 41, key: "apsis-node" },
  { chapter: 1, verse: 55, key: "samvatsara" },
  { chapter: 1, verse: 57, key: "kali-positions" },
  { chapter: 2, verse: 22, key: "sine-values" },
  { chapter: 2, verse: 34, key: "epicycles" },
  { chapter: 2, verse: 53, key: "stations" },
  { chapter: 8, verse: 2, key: "nakshatra-list" },
  { chapter: 9, verse: 6, key: "kalamsha" },
  { chapter: 12, verse: 85, key: "kaksha-list" },
  { chapter: 3, verse: 44, key: "rising-times" },
  { chapter: 8, verse: 10, key: "special-stars" },
  { chapter: 9, verse: 13, key: "star-visibility" },
  { chapter: 14, verse: 15, key: "month-names" },
  { chapter: 2, verse: 12, key: "eight-motions" },
  { chapter: 7, verse: 18, key: "graha-yuddha" },
];

export function suryaTablesFor(chapter: number): { verse: number; key: TableKey }[] {
  return SURYA_TABLE_PLACES.filter((p) => p.chapter === chapter);
}

const fr = (n: string, d: string): MathPart => ({ n, d });
const CIVIL = 1577917828;

type Body = { ne: string; en: string; rev: number };
const BODIES: Body[] = [
  { ne: "सूर्य", en: "Sun", rev: 4320000 },
  { ne: "बुध (शीघ्र)", en: "Mercury (śīghra)", rev: 17937060 },
  { ne: "शुक्र (शीघ्र)", en: "Venus (śīghra)", rev: 7022376 },
  { ne: "मङ्गल", en: "Mars", rev: 2296832 },
  { ne: "बृहस्पति", en: "Jupiter", rev: 364220 },
  { ne: "शनि", en: "Saturn", rev: 146568 },
  { ne: "चन्द्र (नाक्षत्र)", en: "Moon (sidereal)", rev: 57753336 },
  { ne: "चन्द्र (सावन मास)", en: "Moon (synodic)", rev: 53433336 },
  { ne: "चन्द्रोच्च", en: "Moon's apsis", rev: 488203 },
  { ne: "राहु (पात)", en: "Moon's node", rev: 232238 },
];

/** days → "३६५ दि १५ घ ३१ प ३१.४ वि" (days, ghaṭī, pala, vipala). */
function dgpv(lang: Lang, days: number): string {
  const d = Math.floor(days);
  let r = (days - d) * 60;
  const g = Math.floor(r);
  r = (r - g) * 60;
  const p = Math.floor(r);
  const v = (r - p) * 60;
  return L(lang, `${grp(lang, d)} दि ${num(lang, g)} घ ${num(lang, p)} प ${fmt(lang, v, 1)} वि`, `${grp(lang, d)}d ${g}g ${p}p ${v.toFixed(1)}v`);
}
/** days → "365d 6h 12m 36.6s". */
function dhms(lang: Lang, days: number): string {
  const d = Math.floor(days);
  let r = (days - d) * 24;
  const h = Math.floor(r);
  r = (r - h) * 60;
  const m = Math.floor(r);
  const s = (r - m) * 60;
  return L(lang, `${grp(lang, d)} दि ${num(lang, h)} घं ${num(lang, m)} मि ${fmt(lang, s, 1)} से`, `${grp(lang, d)}d ${h}h ${m}m ${s.toFixed(1)}s`);
}
/** degrees → 59′8″10‴ with thirds. */
function motion(lang: Lang, deg: number): string {
  const d = Math.floor(deg);
  let r = (deg - d) * 60;
  const m = Math.floor(r);
  r = (r - m) * 60;
  const s = Math.floor(r);
  const th = (r - s) * 60;
  return `${d ? num(lang, d) + "° " : ""}${num(lang, m)}′ ${num(lang, s)}″ ${fmt(lang, th, 1)}‴`;
}

function meanMotions(lang: Lang): SuryaTable {
  const sun = BODIES[0]!;
  const moon = BODIES[6]!;
  return {
    title: L(lang, "ग्रहहरूको मध्यम गति", "Mean motions of the planets"),
    note: L(
      lang,
      "महायुगको भगण पाठबाट (१.२९–३४)। भगणकाल = कुदिन ÷ भगण, दैनिक गति = भगण × ३६०° ÷ कुदिन। बुध र शुक्रका भगण शीघ्रोच्चका हुन्; तिनको मध्यम स्थान सूर्यकै हो। राहु उल्टो चल्छ।",
      "Revolutions in a mahāyuga from the text (1.29–34). Period = civil days ÷ revolutions; daily motion = revolutions × 360° ÷ civil days. For Mercury and Venus these are their śīghra revolutions; their mean place is the sun's. The node goes backwards.",
    ),
    columns: [L(lang, "ग्रह", "Body"), L(lang, "महायुगमा भगण", "Revolutions in 4,320,000 yrs"), L(lang, "कलियुगमा (÷४)", "In 1,080,000 yrs (÷4)"), L(lang, "एक भगणको समय", "Length of a revolution"), L(lang, "दैनिक मध्यम गति", "Mean daily motion")],
    rows: BODIES.map((b) => [L(lang, b.ne, b.en), grp(lang, b.rev), b.rev % 4 === 0 ? grp(lang, b.rev / 4) : `${grp(lang, Math.floor(b.rev / 4))}${["", "¼", "½", "¾"][b.rev % 4]}`, dgpv(lang, CIVIL / b.rev), motion(lang, (b.rev * 360) / CIVIL)]),
    steps: [
      { say: L(lang, "कुदिन (सावन दिन) = नक्षत्र उदय − सूर्य भगण", "Civil days = star risings − sun's revolutions"), eq: [`${grp(lang, 1582237828)} − ${grp(lang, 4320000)} = ${grp(lang, CIVIL)}`] },
      { say: L(lang, "सूर्यको भगणकाल (सौर वर्ष)", "The sun's period (the solar year)"), eq: [fr(grp(lang, CIVIL), grp(lang, sun.rev)), ` = ${fmt(lang, CIVIL / sun.rev, 6)} ${L(lang, "दिन", "days")} = ${dgpv(lang, CIVIL / sun.rev)}`] },
      { say: L(lang, "चन्द्रको दैनिक गति", "The moon's daily motion"), eq: [fr(`${grp(lang, moon.rev)} × ${num(lang, 360)}°`, grp(lang, CIVIL)), ` = ${fmt(lang, (moon.rev * 360) / CIVIL, 6)}° = ${motion(lang, (moon.rev * 360) / CIVIL)}`] },
      { say: L(lang, "चान्द्र मास = चन्द्र भगण − सूर्य भगण (१.३५)", "Lunar months = moon's revolutions − sun's (1.35)"), eq: [`${grp(lang, moon.rev)} − ${grp(lang, sun.rev)} = ${grp(lang, 53433336)}`] },
    ],
  };
}

/** Burgess's comparative table: d h m s. Surya Siddhanta column computed; the others quoted. */
const COMPARE: { ne: string; en: string; rev: number; siromani: string; ptolemy: string; modern: string }[] = [
  { ne: "सूर्य", en: "Sun", rev: 4320000, siromani: "365 6 12 9.0", ptolemy: "365 6 9 48.6", modern: "365 6 9 10.8" },
  { ne: "बुध", en: "Mercury", rev: 17937060, siromani: "87 23 16 41.5", ptolemy: "87 23 16 42.9", modern: "87 23 15 43.9" },
  { ne: "शुक्र", en: "Venus", rev: 7022376, siromani: "224 16 45 1.9", ptolemy: "224 16 51 56.8", modern: "224 16 49 8.0" },
  { ne: "मङ्गल", en: "Mars", rev: 2296832, siromani: "686 23 57 1.5", ptolemy: "686 23 31 56.1", modern: "686 23 30 41.4" },
  { ne: "बृहस्पति", en: "Jupiter", rev: 364220, siromani: "4332 5 45 43.7", ptolemy: "4332 18 9 10.5", modern: "4332 14 2 8.6" },
  { ne: "शनि", en: "Saturn", rev: 146568, siromani: "10765 19 33 56.5", ptolemy: "10758 17 48 14.9", modern: "10759 5 16 32.2" },
  { ne: "चन्द्र (नाक्षत्र)", en: "Moon (sidereal)", rev: 57753336, siromani: "27 7 43 12.1", ptolemy: "27 7 43 12.1", modern: "27 7 43 11.4" },
  { ne: "चन्द्र (सावन)", en: "Moon (synodic)", rev: 53433336, siromani: "29 12 44 2.3", ptolemy: "29 12 44 3.3", modern: "29 12 44 2.9" },
  { ne: "चन्द्रोच्च", en: "Moon's apsis", rev: 488203, siromani: "3232 17 37 6.0", ptolemy: "3232 9 52 13.6", modern: "3232 13 48 29.6" },
  { ne: "राहु", en: "Moon's node", rev: 232238, siromani: "6792 6 5 41.9", ptolemy: "6799 23 18 39.4", modern: "6798 6 41 45.6" },
];

function quotedDhms(lang: Lang, s: string): string {
  const [d, h, m, sec] = s.split(" ");
  return L(lang, `${grp(lang, Number(d))} दि ${num(lang, h!)} घं ${num(lang, m!)} मि ${num(lang, sec!)} से`, `${grp(lang, Number(d))}d ${h}h ${m}m ${sec}s`);
}

function compareRevolutions(lang: Lang): SuryaTable {
  return {
    title: L(lang, "भगणकालको तुलना", "Sidereal revolutions compared"),
    note: L(
      lang,
      "सूर्यसिद्धान्तको स्तम्भ पाठका भगणबाट निकालिएको; सिद्धान्तशिरोमणि, टोलेमी र आधुनिक मान बर्गेसको तालिकाबाट। सूर्यसिद्धान्तको वर्ष आधुनिक नाक्षत्र वर्षभन्दा करिब ३ मिनेट २६ सेकेन्ड लामो छ।",
      "The Surya Siddhanta column is computed from the text's revolutions; Siddhānta-Śiromaṇi, Ptolemy and the moderns are quoted from Burgess. The text's year is about 3m 26s longer than the modern sidereal year.",
    ),
    columns: [L(lang, "ग्रह", "Body"), L(lang, "सूर्यसिद्धान्त", "Sūrya-Siddhānta"), L(lang, "सिद्धान्तशिरोमणि", "Siddhānta-Śiromaṇi"), L(lang, "टोलेमी", "Ptolemy"), L(lang, "आधुनिक", "Modern")],
    rows: COMPARE.map((c) => [L(lang, c.ne, c.en), dhms(lang, CIVIL / c.rev), quotedDhms(lang, c.siromani), quotedDhms(lang, c.ptolemy), quotedDhms(lang, c.modern)]),
    steps: [
      { say: L(lang, "सूर्यसिद्धान्तको सौर वर्ष घण्टामा", "The text's year in hours"), eq: [fr(grp(lang, CIVIL), grp(lang, 4320000)), ` = ${fmt(lang, CIVIL / 4320000, 7)} ${L(lang, "दिन", "days")} = ${dhms(lang, CIVIL / 4320000)}`] },
      { say: L(lang, "आधुनिक नाक्षत्र वर्षसँग फरक", "Against the modern sidereal year"), eq: [`${fmt(lang, CIVIL / 4320000, 6)} − ${fmt(lang, 365.256363, 6)} = ${fmt(lang, (CIVIL / 4320000 - 365.256363) * 1440, 2)} ${L(lang, "मिनेट", "minutes")}`] },
      { say: L(lang, "चन्द्रको सावन मास झन्डै ठ्याक्कै मिल्छ", "The synodic month is almost exact"), eq: [`${fmt(lang, CIVIL / 53433336, 7)} − ${fmt(lang, 29.530589, 6)} ≈ ${fmt(lang, (CIVIL / 53433336 - 29.530589) * 86400, 1)} ${L(lang, "सेकेन्ड", "seconds")}`] },
    ],
  };
}

function bija(lang: Lang): SuryaTable {
  const rows: [string, string, number, number][] = [
    ["सूर्य", "Sun", 0, 4320000],
    ["बुध (शीघ्र)", "Mercury (śīghra)", -16, 17937060],
    ["शुक्र (शीघ्र)", "Venus (śīghra)", -12, 7022376],
    ["मङ्गल", "Mars", 0, 2296832],
    ["बृहस्पति", "Jupiter", -8, 364220],
    ["शनि", "Saturn", 12, 146568],
    ["चन्द्र", "Moon", 0, 57753336],
    ["चन्द्रोच्च", "Moon's apsis", -4, 488203],
    ["राहु", "Moon's node", 4, 232238],
  ];
  return {
    title: L(lang, "बीज संशोधन (पछि थपिएको)", "The bīja correction (a later addition)"),
    note: L(
      lang,
      "बीज मूल पाठमा छैन। करिब ई.सं. १५०० तिर वेधसँग मिलाउन महायुगका भगणमा थपघट गरियो (बर्गेसको तालिका)। यहाँ गणना मूल पाठकै भगणले गरिएको छ।",
      "The bīja is not in the text. Around AD 1500 the mahāyuga revolutions were adjusted to agree with observation (Burgess's table). The figures here use the text's own revolutions.",
    ),
    columns: [L(lang, "ग्रह", "Body"), L(lang, "संशोधन", "Correction"), L(lang, "संशोधित भगण", "Corrected revolutions"), L(lang, "संशोधित भगणकाल", "Corrected period"), L(lang, "संशोधित दैनिक गति", "Corrected daily motion")],
    rows: rows.map(([ne, en, c, rev]) => {
      const r = rev + c;
      return [L(lang, ne, en), c === 0 ? num(lang, 0) : `${c > 0 ? "+" : "−"}${num(lang, Math.abs(c))}`, grp(lang, r), dgpv(lang, CIVIL / r), motion(lang, (r * 360) / CIVIL)];
    }),
  };
}

function apsisNode(lang: Lang): SuryaTable {
  const rows: [string, string, number, number | null][] = [
    ["सूर्य", "Sun", 387, null],
    ["मङ्गल", "Mars", 204, 214],
    ["बुध", "Mercury", 368, 488],
    ["बृहस्पति", "Jupiter", 900, 174],
    ["शुक्र", "Venus", 535, 903],
    ["शनि", "Saturn", 39, 662],
  ];
  return {
    title: L(lang, "मन्दोच्च र पातका कल्पभगण", "Revolutions of the apsides and nodes in a kalpa"),
    note: L(
      lang,
      "१.४१–४४। मन्दोच्च पूर्वतिर, पात पश्चिमतिर चल्छन्। कल्पभरि यति थोरै घुम्ने भएकाले मानव जीवनकालमा यी स्थिर जस्तै देखिन्छन्।",
      "1.41–44. The apsides move east, the nodes west. So few turns in a whole kalpa that they seem fixed over a human life.",
    ),
    columns: [L(lang, "ग्रह", "Planet"), L(lang, "मन्दोच्च भगण", "Apsis revolutions"), L(lang, "एक भगण (वर्ष)", "One turn (years)"), L(lang, "पात भगण", "Node revolutions")],
    rows: rows.map(([ne, en, a, n]) => [L(lang, ne, en), num(lang, a), grp(lang, 4320000000 / a), n === null ? "—" : num(lang, n)]),
    steps: [
      { say: L(lang, "कल्प = १००० महायुग", "A kalpa = 1000 mahāyugas"), eq: [`${num(lang, 1000)} × ${grp(lang, 4320000)} = ${grp(lang, 4320000000)} ${L(lang, "वर्ष", "years")}`] },
      { say: L(lang, "सूर्यको मन्दोच्च एक पटक घुम्न", "The sun's apsis takes for one turn"), eq: [fr(grp(lang, 4320000000), num(lang, 387)), ` = ${grp(lang, 4320000000 / 387)} ${L(lang, "वर्ष", "years")}`] },
      { say: L(lang, "त्यसैले एक वर्षमा", "So in one year it moves"), eq: [fr(`${num(lang, 387)} × ${num(lang, 360)}° × ${num(lang, 3600)}″`, grp(lang, 4320000000)), ` = ${fmt(lang, (387 * 360 * 3600) / 4320000000, 3)}″`] },
    ],
  };
}

const KALI_POS: { ne: string; en: string; off: string; lon: string; bentley: string; bailly: string }[] = [
  { ne: "सूर्य", en: "Sun", off: "−7 51 48", lon: "301 45 43", bentley: "301 1 1", bailly: "301 5 57" },
  { ne: "बुध", en: "Mercury", off: "−41 3 26", lon: "268 34 5", bentley: "267 35 26", bailly: "261 14 21" },
  { ne: "शुक्र", en: "Venus", off: "+24 58 59", lon: "334 36 30", bentley: "333 44 37", bailly: "334 22 18" },
  { ne: "मङ्गल", en: "Mars", off: "−19 49 26", lon: "289 48 5", bentley: "288 55 19", bailly: "288 55 56" },
  { ne: "बृहस्पति", en: "Jupiter", off: "+8 38 35", lon: "318 16 7", bentley: "318 3 54", bailly: "310 22 10" },
  { ne: "शनि", en: "Saturn", off: "−28 1 13", lon: "281 36 18", bentley: "280 1 53", bailly: "298 8 21" },
  { ne: "चन्द्र", en: "Moon", off: "−1 33 41", lon: "308 3 50", bentley: "306 53 42", bailly: "300 51 16" },
  { ne: "चन्द्रोच्च", en: "Moon's apsis", off: "+95 19 21", lon: "44 56 42", bentley: "61 12 26", bailly: "61 13 33" },
  { ne: "राहु", en: "Moon's node", off: "+198 24 45", lon: "148 2 16", bentley: "144 38 32", bailly: "144 37 41" },
];

function angle3(lang: Lang, s: string): string {
  const sign = s.startsWith("−") ? "−" : s.startsWith("+") ? "+" : "";
  const [d, m, sec] = s.replace(/^[−+]/, "").split(" ");
  return `${sign}${num(lang, d!)}° ${num(lang, m!)}′ ${num(lang, sec!)}″`;
}

function kaliPositions(lang: Lang): SuryaTable {
  return {
    title: L(lang, "कलि आरम्भमा ग्रहहरू साँच्चै कहाँ थिए?", "Where were the planets really at the start of Kali?"),
    note: L(
      lang,
      "पाठ (१.५७–५८) अनुसार ई.पू. ३१०२ फेब्रुअरी १७–१८ को उज्जयिनी मध्यरातमा सबै मध्यम ग्रह मेष ०° मा थिए। आधुनिक गणना (बर्गेसको तालिका) ले देखाउँछ यो वास्तविक युति थिएन: पहिलो स्तम्भ हिन्दू मेष ०° बाट दूरी हो। भोग सायन हुन्।",
      "The text (1.57–58) puts every mean planet at Aries 0° at Ujjayinī midnight, 17–18 February 3102 BC. Modern reckoning (Burgess's table) shows it was no real conjunction: the first column is the distance from the Hindu Aries 0°. Longitudes are tropical.",
    ),
    columns: [L(lang, "ग्रह", "Body"), L(lang, "हिन्दू मेष ०° बाट", "From the Hindu 0°"), L(lang, "भोग (आधुनिक)", "Longitude (modern)"), L(lang, "बेन्टली", "Bentley"), L(lang, "बेली", "Bailly")],
    rows: KALI_POS.map((p) => [L(lang, p.ne, p.en), angle3(lang, p.off), angle3(lang, p.lon), angle3(lang, p.bentley), angle3(lang, p.bailly)]),
  };
}

export const SAMVATSARA: [string, string][] = [
  ["विजय", "Vijaya"], ["जय", "Jaya"], ["मन्मथ", "Manmatha"], ["दुर्मुख", "Durmukha"], ["हेमलम्ब", "Hemalamba"],
  ["विलम्ब", "Vilamba"], ["विकारी", "Vikārin"], ["शार्वरी", "Śārvarī"], ["प्लव", "Plava"], ["शुभकृत्", "Śubhakṛt"],
  ["शोभन", "Śobhana"], ["क्रोधी", "Krodhin"], ["विश्वावसु", "Viśvāvasu"], ["पराभव", "Parābhava"], ["प्लवङ्ग", "Plavaṅga"],
  ["कीलक", "Kīlaka"], ["सौम्य", "Saumya"], ["साधारण", "Sādhāraṇa"], ["विरोधकृत्", "Virodhakṛt"], ["परिधावी", "Paridhāvin"],
  ["प्रमादी", "Pramādin"], ["आनन्द", "Ānanda"], ["राक्षस", "Rākṣasa"], ["अनल", "Anala"], ["पिङ्गल", "Piṅgala"],
  ["कालयुक्त", "Kālayukta"], ["सिद्धार्थी", "Siddhārthin"], ["रौद्र", "Raudra"], ["दुर्मति", "Durmati"], ["दुन्दुभि", "Dundubhi"],
  ["रुधिरोद्गारी", "Rudhirodgārin"], ["रक्ताक्ष", "Raktākṣa"], ["क्रोधन", "Krodhana"], ["क्षय", "Kṣaya"], ["प्रभव", "Prabhava"],
  ["विभव", "Vibhava"], ["शुक्ल", "Śukla"], ["प्रमोद", "Pramoda"], ["प्रजापति", "Prajāpati"], ["अङ्गिरा", "Aṅgiras"],
  ["श्रीमुख", "Śrīmukha"], ["भाव", "Bhāva"], ["युवा", "Yuvan"], ["धाता", "Dhātṛ"], ["ईश्वर", "Īśvara"],
  ["बहुधान्य", "Bahudhānya"], ["प्रमाथी", "Pramāthin"], ["विक्रम", "Vikrama"], ["वृष", "Vṛṣa"], ["चित्रभानु", "Citrabhānu"],
  ["सुभानु", "Subhānu"], ["तारण", "Tāraṇa"], ["पार्थिव", "Pārthiva"], ["व्यय", "Vyaya"], ["सर्वजित्", "Sarvajit"],
  ["सर्वधारी", "Sarvadhārin"], ["विरोधी", "Virodhin"], ["विकृति", "Vikṛta"], ["खर", "Khara"], ["नन्दन", "Nandana"],
];

/** 1.55: Jupiter's year of the sixty-year cycle, counted from Vijaya at the start of Kali. */
export function jupiterYear(kaliDays: number) {
  const revs = (kaliDays * 364220) / CIVIL;
  const whole = Math.floor(revs);
  const signs = Math.floor((revs - whole) * 12);
  const elapsed = 12 * whole + signs;
  return { revs, whole, signs, elapsed, index: elapsed % 60 };
}

function samvatsara(lang: Lang): SuryaTable {
  const days = ahargana(5127, 7, 9).days; // about mid-November 2026
  const j = jupiterYear(days);
  const name = SAMVATSARA[j.index]!;
  return {
    numbered: true,
    title: L(lang, "बार्हस्पत्य ६० संवत्सर", "Jupiter's cycle of sixty years"),
    note: L(
      lang,
      "बृहस्पति मध्यम गतिले एक राशि पार गर्दा एक संवत्सर। पाठ विजयबाट गन्छ (१.५५)। पञ्चाङ्गमा प्रयोग हुने चान्द्र-सौर संवत्सर (प्रभवबाट गनिने) यो भन्दा फरक हुन सक्छ। नाम बर्गेसले डेभिसबाट लिएका।",
      "One year for each sign Jupiter passes by its mean motion. The text counts from Vijaya (1.55). The luni-solar saṃvatsara of almanacs, counted from Prabhava, may differ. Names as Burgess gives them from Davis.",
    ),
    columns: [num(lang, "#"), L(lang, "नाम", "Name"), L(lang, "IAST", "देवनागरी")],
    rows: SAMVATSARA.map(([ne, en], i) => [num(lang, i + 1), L(lang, ne, en), L(lang, en, ne)]),
    highlight: j.index,
    steps: [
      { say: L(lang, "कलि आरम्भदेखि आजसम्मको अहर्गण (मङ्सिर २०८३)", "Days since the start of Kali, to about now (November 2026)"), eq: [grp(lang, days)] },
      { say: L(lang, "बृहस्पतिका गत भगण = अहर्गण × भगण ÷ कुदिन", "Jupiter's revolutions = days × revolutions ÷ civil days"), eq: [fr(`${grp(lang, days)} × ${grp(lang, 364220)}`, grp(lang, CIVIL)), ` = ${fmt(lang, j.revs, 4)}`] },
      { say: L(lang, "चालु भगणका गत राशि", "Signs passed in the current revolution"), eq: [`${fmt(lang, j.revs - j.whole, 4)} × ${num(lang, 12)} = ${fmt(lang, (j.revs - j.whole) * 12, 2)} → ${num(lang, j.signs)}`] },
      { say: L(lang, "गत भगण × १२ + राशि (१.५५)", "Past revolutions × 12 + signs (1.55)"), eq: [`${grp(lang, j.whole)} × ${num(lang, 12)} + ${num(lang, j.signs)} = ${grp(lang, j.elapsed)}`] },
      { say: L(lang, "६० ले भाग गर्दा शेष, विजयबाट गनेर", "The remainder on dividing by 60, counted from Vijaya"), eq: [`${L(lang, `${grp(lang, j.elapsed)} ÷ ६० को शेष`, `${j.elapsed} mod 60`)} = ${num(lang, j.index)} → ${num(lang, j.index + 1)}${L(lang, "औँ", "th")}: ${L(lang, name[0], name[1])}`] },
    ],
  };
}

function sineValues(lang: Lang): SuryaTable {
  return {
    numbered: true,
    title: L(lang, "ज्यापिण्ड र उत्क्रमज्या", "The sines and versed sines"),
    note: L(lang, "२.१५–२७। त्रिज्या ३४३८′, चाप २२५′ (३°४५′) का अन्तरमा। आधुनिक स्तम्भ = ३४३८ × sin।", "2.15–27. Radius 3438′, at steps of 225′ (3°45′). The modern column is 3438 × sin."),
    columns: [num(lang, "#"), L(lang, "चाप", "Arc"), L(lang, "ज्या", "Sine"), L(lang, "खण्ड", "Difference"), L(lang, "उत्क्रमज्या", "Versed sine"), L(lang, "आधुनिक", "Modern")],
    rows: SURYA_SINES.map((s, i) => {
      const arc = (i + 1) * 3.75;
      const versed = TRIJYA - (i === 23 ? 0 : SURYA_SINES[22 - i]!);
      return [num(lang, i + 1), `${grp(lang, (i + 1) * 225)}′ = ${dms(lang, arc)}`, num(lang, s), num(lang, i === 0 ? s : s - SURYA_SINES[i - 1]!), num(lang, versed), fmt(lang, TRIJYA * Math.sin((arc * Math.PI) / 180), 1)];
    }),
    steps: [
      { say: L(lang, "उत्क्रमज्या = त्रिज्या − पूरक चापको ज्या (२.२२)", "Versed sine = radius − sine of the complement (2.22)"), eq: [`${num(lang, 3438)} − ${num(lang, 3431)} = ${num(lang, 7)}`] },
      { say: L(lang, "खण्डको नियम (२.१६)", "The rule of differences (2.16)"), eq: [`${num(lang, 224)} = ${num(lang, 225)} − `, fr(num(lang, 225), num(lang, 225)), ` · ${num(lang, 222)} ≈ ${num(lang, 224)} − `, fr(num(lang, 449), num(lang, 225))] },
    ],
  };
}

function epicycles(lang: Lang): SuryaTable {
  const rows: [string, string, string, string, string, string, number | null][] = [
    ["सूर्य", "Sun", "14°", "13°40′", "—", "—", null],
    ["चन्द्र", "Moon", "32°", "31°40′", "—", "—", null],
    ["मङ्गल", "Mars", "75°", "72°", "235°", "232°", 1 / 1.5237],
    ["बुध", "Mercury", "30°", "28°", "133°", "132°", 0.3871],
    ["बृहस्पति", "Jupiter", "33°", "32°", "70°", "72°", 1 / 5.2026],
    ["शुक्र", "Venus", "12°", "11°", "262°", "260°", 0.7233],
    ["शनि", "Saturn", "49°", "48°", "39°", "40°", 1 / 9.5549],
  ];
  return {
    title: L(lang, "मन्द र शीघ्र परिधि", "The manda and śīghra epicycles"),
    note: L(
      lang,
      "२.३४–३८। सम पदान्त (०°, १८०°) र विषम पदान्त (९०°, २७०°) मा परिधि; बीचमा भुजज्याको अनुपातले। शीघ्र परिधि ÷ ३६० नै पृथ्वी र ग्रहको कक्षाको अनुपात हो, आधुनिक मानसँग तुलना गर्नुहोस्।",
      "2.34–38. The epicycle at the even quadrant ends (0°, 180°) and the odd (90°, 270°); between, in proportion to the sine. Śīghra epicycle ÷ 360 is the ratio of the earth's and the planet's orbits: compare the modern value.",
    ),
    columns: [L(lang, "ग्रह", "Planet"), L(lang, "मन्द (सम)", "Manda (even)"), L(lang, "मन्द (विषम)", "Manda (odd)"), L(lang, "शीघ्र (सम)", "Śīghra (even)"), L(lang, "शीघ्र (विषम)", "Śīghra (odd)"), L(lang, "शीघ्र ÷ ३६०", "Śīghra ÷ 360"), L(lang, "आधुनिक अनुपात", "Modern ratio")],
    rows: rows.map(([ne, en, me, mo, se, so, modern]) => [
      L(lang, ne, en),
      num(lang, me),
      num(lang, mo),
      num(lang, se),
      num(lang, so),
      se === "—" ? "—" : fmt(lang, Number.parseFloat(se) / 360, 3),
      modern === null ? "—" : fmt(lang, modern, 3),
    ]),
    steps: [
      { say: L(lang, "उदाहरण: केन्द्र ४५° मा मङ्गलको शीघ्र परिधि (२.३८)", "Example: Mars's śīghra epicycle at κ = 45° (2.38)"), eq: [`${num(lang, 235)}° − `, fr(`(${num(lang, 235)} − ${num(lang, 232)}) × ${num(lang, 2431)}`, num(lang, 3438)), ` = ${fmt(lang, 235 - (3 * 2431) / 3438, 2)}°`] },
      { say: L(lang, "शुक्र: पाठको अनुपात र आधुनिक", "Venus: the text's ratio and the modern"), eq: [fr(num(lang, 262), num(lang, 360)), ` = ${fmt(lang, 262 / 360, 3)} · ${fmt(lang, 0.7233, 3)}`] },
    ],
  };
}

function stations(lang: Lang): SuryaTable {
  const rows: [string, string, number][] = [
    ["मङ्गल", "Mars", 164],
    ["बुध", "Mercury", 144],
    ["बृहस्पति", "Jupiter", 130],
    ["शुक्र", "Venus", 163],
    ["शनि", "Saturn", 115],
  ];
  return {
    title: L(lang, "वक्री र मार्गी हुने केन्द्र", "Where the planets turn retrograde and direct"),
    note: L(lang, "२.५३–५४। शीघ्रकेन्द्र यति अंश पुगेपछि वक्री, ३६०° बाट त्यति घटाएको अंशमा फेरि मार्गी।", "2.53–54. Retrograde when the śīghra anomaly reaches these degrees; direct again at 360° less the same."),
    columns: [L(lang, "ग्रह", "Planet"), L(lang, "वक्री आरम्भ", "Retrograde from"), L(lang, "मार्गी", "Direct at"), L(lang, "वक्री भाग", "Arc retrograde")],
    rows: rows.map(([ne, en, k]) => [L(lang, ne, en), `${num(lang, k)}°`, `${num(lang, 360 - k)}°`, `${num(lang, 360 - 2 * k)}°`]),
    steps: [{ say: L(lang, "उदाहरण: मङ्गल", "Example: Mars"), eq: [`${num(lang, 360)}° − ${num(lang, 164)}° = ${num(lang, 196)}° · ${L(lang, "वक्री भाग", "retrograde arc")} ${num(lang, 196)}° − ${num(lang, 164)}° = ${num(lang, 32)}°`] }],
  };
}

function nakshatraList(lang: Lang): SuryaTable {
  return {
    numbered: true,
    title: L(lang, "नक्षत्रका योगतारा: ध्रुवक र शर", "Junction stars: polar longitude and latitude"),
    note: L(lang, "८.२–९। ध्रुवक भोग (मेष ०° बाट) र शर (क्रान्तिवृत्तबाट उत्तर वा दक्षिण)।", "8.2–9. Polar longitude from Aries 0°, and latitude north or south of the ecliptic."),
    columns: [num(lang, "#"), L(lang, "नक्षत्र", "Nakshatra"), L(lang, "ध्रुवक", "Polar longitude"), L(lang, "शर", "Latitude")],
    rows: SURYA_NAKSHATRAS.map((n, i) => [
      num(lang, i + 1),
      L(lang, n.ne, n.en),
      dms(lang, n.lon),
      n.lat === 0 ? num(lang, "0°") : `${dms(lang, Math.abs(n.lat))} ${n.lat > 0 ? L(lang, "उ", "N") : L(lang, "द", "S")}`,
    ]),
  };
}

function kalamsha(lang: Lang): SuryaTable {
  const rows: [string, string, string, string][] = [
    ["चन्द्र", "Moon", "12°", ""],
    ["मङ्गल", "Mars", "17°", ""],
    ["बुध", "Mercury", "14° / 12°", L(lang, "शीघ्र गतिमा १४, वक्रीमा १२", "14 when fast, 12 when retrograde")],
    ["बृहस्पति", "Jupiter", "11°", ""],
    ["शुक्र", "Venus", "10° / 8°", L(lang, "पूर्वमा अस्त र पश्चिममा उदय १०; पश्चिममा अस्त र पूर्वमा उदय ८", "set in the east, rise in the west at 10; set in the west, rise in the east at 8")],
    ["शनि", "Saturn", "15°", ""],
  ];
  return {
    title: L(lang, "कालांश: अस्त र उदयको दूरी", "Degrees of visibility (kālāṃśa)"),
    note: L(lang, "९.६–८। सूर्यबाट यति कालांशभन्दा नजिक भए ग्रह देखिँदैन (अस्त)।", "9.6–8. Closer to the sun than this, in degrees of time, the planet is not seen (set)."),
    columns: [L(lang, "ग्रह", "Planet"), L(lang, "कालांश", "Degrees"), L(lang, "टिप्पणी", "Note")],
    rows: rows.map(([ne, en, d, note]) => [L(lang, ne, en), num(lang, d), note || "—"]),
  };
}

const SKY = 18712080864000000;

function kakshaList(lang: Lang): SuryaTable {
  const rows: [string, string, number, number][] = [
    ["चन्द्र", "Moon", 324000, 57753336000],
    ["बुध (शीघ्र)", "Mercury (śīghra)", 1043209, 17937060000],
    ["शुक्र (शीघ्र)", "Venus (śīghra)", 2664637, 7022376000],
    ["सूर्य, बुध, शुक्र", "Sun, Mercury, Venus", 4331500, 4320000000],
    ["मङ्गल", "Mars", 8146909, 2296832000],
    ["चन्द्रोच्च", "Moon's apsis", 38328484, 488203000],
    ["बृहस्पति", "Jupiter", 51375764, 364220000],
    ["राहु", "Moon's node", 80572864, 232238000],
    ["शनि", "Saturn", 127668255, 146568000],
    ["नक्षत्र", "Asterisms", 259890012, 0],
  ];
  const daily = (324000 * 57753336) / CIVIL;
  return {
    title: L(lang, "ग्रहकक्षा योजनमा", "The orbits in yojanas"),
    note: L(
      lang,
      "१२.८०–९०। आकाशकक्षा = १८,७१,२०,८०,८६,४०,००,००० योजन। हरेक कक्षा = आकाशकक्षा ÷ कल्पभगण, त्यसैले सबै ग्रह दिनमा बराबर योजन हिँड्छन्। नक्षत्रकक्षा = सूर्यकक्षा × ६०।",
      "12.80–90. The sky's orbit = 18,712,080,864,000,000 yojanas. Each orbit = that ÷ revolutions in a kalpa, so every planet travels the same yojanas a day. The asterisms' orbit = the sun's × 60.",
    ),
    columns: [L(lang, "कक्षा", "Orbit"), L(lang, "योजन", "Yojanas"), L(lang, "कल्पभगण", "Revolutions in a kalpa"), L(lang, "आकाशकक्षा ÷ भगण", "Sky ÷ revolutions")],
    rows: rows.map(([ne, en, y, rev]) => [L(lang, ne, en), grp(lang, y), rev ? grp(lang, rev) : "—", rev ? grp(lang, SKY / rev) : `${grp(lang, 4331500)} × ${num(lang, 60)}`]),
    steps: [
      { say: L(lang, "चन्द्रकक्षा", "The moon's orbit"), eq: [fr(grp(lang, SKY), grp(lang, 57753336000)), ` = ${grp(lang, SKY / 57753336000)} ${L(lang, "योजन", "yojanas")}`] },
      { say: L(lang, "हरेक ग्रहले दिनमा हिँड्ने योजन", "Yojanas every planet travels a day"), eq: [fr(`${grp(lang, 324000)} × ${grp(lang, 57753336)}`, grp(lang, CIVIL)), ` = ${fmt(lang, daily, 1)}`] },
      { say: L(lang, "त्यसैले शनिलाई एक भगणमा", "So Saturn needs for one revolution"), eq: [fr(grp(lang, 127668255), fmt(lang, daily, 1)), ` = ${grp(lang, 127668255 / daily)} ${L(lang, "दिन", "days")}`] },
    ],
  };
}


function risingTimes(lang: Lang): SuryaTable {
  const r = risingAsusClean();
  const c = charaKhanda();
  const lanka = [1670, 1795, 1935, 1935, 1795, 1670, 1670, 1795, 1935, 1935, 1795, 1670];
  const ci = [0, 1, 2, 2, 1, 0, 0, 1, 2, 2, 1, 0];
  return {
    title: L(lang, "राशिहरूको उदयकाल: लङ्का र काठमाडौँ", "Rising times of the signs: Laṅkā and Kathmandu"),
    note: L(lang, "३.४३–४५। काठमाडौँको पलभा ६.३ अङ्गुल। मेष–मिथुन र मकर–मीनमा चरखण्ड घटाउने, कर्क–धनुमा जोड्ने। ३६० असु = १ घटी।", "3.43–45. Kathmandu's equinoctial shadow 6.3 digits. Subtract the ascensional parts for Capricorn–Gemini, add for Cancer–Sagittarius. 360 asus = 1 ghaṭī."),
    columns: [L(lang, "राशि", "Sign"), L(lang, "लङ्का (असु)", "Laṅkā (asus)"), L(lang, "चरखण्ड", "Ascensional part"), L(lang, "काठमाडौँ (असु)", "Kathmandu (asus)"), L(lang, "घटी–पल", "Ghaṭī–pala")],
    rows: RASHI.map(([ne, en], i) => {
      const v = r[i]!;
      const g = Math.floor(v / 360);
      const pl = (v - g * 360) / 6;
      return [L(lang, ne, en), grp(lang, lanka[i]!), `${i < 3 || i >= 9 ? "−" : "+"}${fmt(lang, c[ci[i]!]!)}`, grp(lang, Math.round(v)), L(lang, `${num(lang, g)} घ ${fmt(lang, pl)} प`, `${g}g ${pl.toFixed(0)}p`)];
    }),
    steps: [{ say: L(lang, "जाँच: बाह्रै राशिको योग एक अहोरात्र", "Check: all twelve add to one day"), eq: [`${grp(lang, Math.round(r.reduce((a, b) => a + b, 0)))} ${L(lang, "असु", "asus")} = ${num(lang, 60)} ${L(lang, "घटी", "ghaṭī")}`] }],
  };
}

function specialStars(lang: Lang): SuryaTable {
  const rows: [string, string, string, number, string][] = [
    ["अगस्त्य", "Agastya", "Canopus", 90, "80° S"],
    ["मृगव्याध (लुब्धक)", "Mṛgavyādha", "Sirius", 80, "40° S"],
    ["अग्नि (हुतभुक्)", "Agni", "β Tauri", 52, "8° N"],
    ["ब्रह्महृदय", "Brahmahṛdaya", "Capella", 52, "30° N"],
    ["प्रजापति", "Prajāpati", "δ Aurigae", 60, "38° N"],
    ["अपांवत्स", "Apāṃvatsa", "θ Virginis", 180, L(lang, "चित्राबाट ५° उत्तर", "5° N of Citrā")],
    ["आपस्", "Āpas", "δ Virginis", 180, L(lang, "अपांवत्सबाट ६° उत्तर", "6° N of Apāṃvatsa")],
  ];
  return {
    title: L(lang, "नक्षत्रबाहिरका विशेष तारा", "Stars outside the nakshatras"),
    note: L(lang, "८.१०–१२, ८.२०–२१। ध्रुवक र शर पाठअनुसार; आधुनिक नाम बर्गेसअनुसार।", "8.10–12, 8.20–21. Polar longitude and latitude from the text; modern names after Burgess."),
    columns: [L(lang, "तारा", "Star"), L(lang, "आधुनिक नाम", "Modern name"), L(lang, "ध्रुवक", "Polar longitude"), L(lang, "शर", "Latitude")],
    rows: rows.map(([ne, en, modern, lon, lat]) => [L(lang, ne, en), modern, `${num(lang, lon)}°`, num(lang, lat).replace("S", L(lang, "द", "S")).replace("N", L(lang, "उ", "N"))]),
  };
}

function starVisibility(lang: Lang): SuryaTable {
  const groups: [string, number[], string][] = [
    ["13°", [14, 13, 17, 6], L(lang, "स्वाती, चित्रा, ज्येष्ठा, पुनर्वसु; अगस्त्य, मृगव्याध, अभिजित्, ब्रह्महृदय पनि", "Svātī, Citrā, Jyeṣṭhā, Punarvasu; also Agastya, Mṛgavyādha, Abhijit, Brahmahṛdaya")],
    ["14°", [12, 21, 10, 11, 22, 3, 9, 15, 0], ""],
    ["15°", [2, 16, 18, 8, 5, 19, 20], ""],
    ["17°", [23, 24, 25, 26], L(lang, "बाँकी सबै", "all the rest")],
    ["21°", [1, 7, 4], L(lang, "बिम्ब सानो भएकाले", "being small")],
  ];
  const names = groups.map(([, ids]) => ids.map((i) => L(lang, NAK27[i]![0], NAK27[i]![1])).join(", "));
  return {
    title: L(lang, "नक्षत्र देखिने कालांश", "Time-degrees at which the nakshatras are seen"),
    note: L(lang, "९.१२–१५, ९.१८। सूर्यबाट यति कालांशभन्दा नजिक भए तारा देखिँदैन। अभिजित्, ब्रह्महृदय, स्वाती, श्रवण, धनिष्ठा, उत्तरभाद्रपदा उत्तरमा टाढा भएकाले कहिल्यै अस्त हुँदैनन्।", "9.12–15, 9.18. Closer to the sun than this they are not seen. Abhijit, Brahmahṛdaya, Svātī, Śravaṇa, Dhaniṣṭhā, Uttara Bhādrapadā lie so far north they never set."),
    columns: [L(lang, "कालांश", "Degrees"), L(lang, "नक्षत्र", "Nakshatras"), L(lang, "टिप्पणी", "Note")],
    rows: groups.map(([d, , note], i) => [num(lang, d), names[i]!, note || "—"]),
  };
}

function monthNames(lang: Lang): SuryaTable {
  const rows: [string, string, number[]][] = [
    ["कार्तिक", "Kārttika", [2, 3]],
    ["मार्गशीर्ष", "Mārgaśīrṣa", [4, 5]],
    ["पौष", "Pauṣa", [6, 7]],
    ["माघ", "Māgha", [8, 9]],
    ["फाल्गुन", "Phālguna", [10, 11, 12]],
    ["चैत्र", "Caitra", [13, 14]],
    ["वैशाख", "Vaiśākha", [15, 16]],
    ["ज्येष्ठ", "Jyaiṣṭha", [17, 18]],
    ["आषाढ", "Āṣāḍha", [19, 20]],
    ["श्रावण", "Śrāvaṇa", [21, 22]],
    ["भाद्रपद", "Bhādrapada", [23, 24, 25]],
    ["आश्विन", "Āśvina", [26, 0, 1]],
  ];
  return {
    title: L(lang, "चान्द्र मासका नाम", "Names of the lunar months"),
    note: L(lang, "१४.१५–१६। पूर्णिमामा चन्द्र जुन नक्षत्रमा हुन्छ, मासको नाम त्यसैबाट। कृत्तिकादेखि दुई–दुई नक्षत्र; पाँचौँ, एघारौँ र बाह्रौँ मासलाई तीन।", "14.15–16. Each month is named from the nakshatra of its full moon: two each from Kṛttikā, three for the fifth, eleventh and twelfth."),
    columns: [L(lang, "मास", "Month"), L(lang, "पूर्णिमाका नक्षत्र", "Full-moon nakshatras")],
    rows: rows.map(([ne, en, ids]) => [L(lang, ne, en), ids.map((i) => L(lang, NAK27[i]![0], NAK27[i]![1])).join(", ")]),
  };
}


function eightMotions(lang: Lang): SuryaTable {
  const rows: [string, string, string, string][] = [
    ["अतिशीघ्र", "Atiśīghra", L(lang, "मार्गी", "direct"), L(lang, "शीघ्रोच्चतिर सबैभन्दा छिटो", "fastest, toward the śīghrocca")],
    ["शीघ्र", "Śīghra", L(lang, "मार्गी", "direct"), L(lang, "मध्यम गतिभन्दा छिटो", "faster than mean")],
    ["सम", "Sama", L(lang, "मार्गी", "direct"), L(lang, "मध्यम गति", "the mean motion")],
    ["मन्द", "Manda", L(lang, "मार्गी", "direct"), L(lang, "मध्यमभन्दा ढिलो", "slower than mean")],
    ["मन्दतर", "Mandatara", L(lang, "मार्गी", "direct"), L(lang, "अझ ढिलो, स्थिर हुन लागेको", "slower still, nearly stationary")],
    ["वक्र", "Vakra", L(lang, "वक्री", "retrograde"), L(lang, "पछाडि सर्न थालेको", "beginning to go back")],
    ["अतिवक्र", "Ativakra", L(lang, "वक्री", "retrograde"), L(lang, "सबैभन्दा छिटो पछाडि", "fastest backward")],
    ["कुटिल", "Kuṭila", L(lang, "वक्री", "retrograde"), L(lang, "घुमाउरो, फेरि मार्गी हुन लागेको", "winding, turning direct again")],
  ];
  return {
    title: L(lang, "ग्रहका आठ गति", "The eight motions of a planet"),
    note: L(lang, "२.१२–१३। पाँच मार्गी, तीन वक्री। स्पष्ट गतिको चित्र (२.४६) मा रेखा शून्यमुनि जाँदा यी वक्र गति।", "2.12–13. Five direct, three retrograde. In the true-motion figure (2.46) the curve dips below zero for the retrograde ones."),
    columns: [L(lang, "गति", "Motion"), L(lang, "दिशा", "Direction"), L(lang, "अर्थ", "Meaning")],
    rows: rows.map(([ne, en, dir, m]) => [L(lang, ne, en), dir, m]),
  };
}

function grahaYuddha(lang: Lang): SuryaTable {
  const rows: [string, string, string][] = [
    ["उल्लेख", "Ullekha", L(lang, "बिम्ब मात्र छोइन्छन्", "the discs only graze")],
    ["भेद", "Bheda", L(lang, "एउटाले अर्कोलाई छेड्छ", "one pierces the other")],
    ["अंशुमर्दन", "Aṃśumardana", L(lang, "किरण मिसिन्छन्", "their rays mingle")],
    ["अपसव्य", "Apasavya", L(lang, "दक्षिणतिरको, सानो वा मधुरो ग्रह हार्छ", "the southern, small or dim one loses")],
    ["समागम", "Samāgama", L(lang, "उत्तर–दक्षिण अन्तर १° भन्दा बढी; दुवै बलियो", "more than 1° apart north–south; both strong")],
  ];
  return {
    title: L(lang, "ग्रहयुद्धका प्रकार", "Kinds of planetary encounter"),
    note: L(lang, "७.१८–२३। १° भित्र आउँदा युद्ध; उत्तरमा रहेको, चम्किलो र ठूलो बिम्बको ग्रह विजयी। शुक्र प्रायः जित्छ।", "7.18–23. Within a degree it is a battle; the northern, bright, broad-disced planet wins. Venus usually wins."),
    columns: [L(lang, "प्रकार", "Kind"), L(lang, "लक्षण", "Sign")],
    rows: rows.map(([ne, en, m]) => [L(lang, ne, en), m]),
  };
}

const BUILD: Record<TableKey, (lang: Lang) => SuryaTable> = {
  "mean-motions": meanMotions,
  bija,
  "compare-revolutions": compareRevolutions,
  "apsis-node": apsisNode,
  "kali-positions": kaliPositions,
  samvatsara,
  "sine-values": sineValues,
  epicycles,
  stations,
  "nakshatra-list": nakshatraList,
  kalamsha,
  "kaksha-list": kakshaList,
  "rising-times": risingTimes,
  "special-stars": specialStars,
  "star-visibility": starVisibility,
  "month-names": monthNames,
  "eight-motions": eightMotions,
  "graha-yuddha": grahaYuddha,
};

export function suryaTable(key: TableKey, lang: Lang): SuryaTable {
  return BUILD[key](lang);
}
