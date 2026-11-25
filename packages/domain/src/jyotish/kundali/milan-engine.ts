/** कुण्डली मिलान made on the device: Ashtakoota (Guna Milan) from the two birth Moons (`jyotish::milan` in apps/rust). */
import { pyInt, pyMod, pyRound } from "../../panchanga/engine/py";
import { NAKSHATRA_NAMES, RASHI_NAMES, RASHI_NAMES_NE } from "../../panchanga/engine/tables.generated";
import { EN, ENEMIES, FRIENDS, NE, SIGN_LORD, signOf, type GrahaKey } from "./chart-facts";
import * as T from "./milan-tables.generated";

type Json = Record<string, unknown>;
type Label = [string, string];

/** (0-based nakshatra, pada with no upper clamp). */
function nakshatraOf(lon0: number): [number, number] {
  const span = 360 / 27;
  const lon = pyMod(lon0, 360);
  return [pyInt(lon / span) % 27, pyInt(pyMod(lon, span) / (span / 4)) + 1];
}
const roundPoints = (v: number) => (Number.isInteger(v) ? v : pyRound(v, 1));
const relation = (a: GrahaKey, b: GrahaKey) => (FRIENDS[a].includes(b) ? 1 : ENEMIES[a].includes(b) ? -1 : 0);

function kutas(br: number, bn: number, gr: number, gn: number): [number, Label, Label][] {
  const vb = T.VARNA_OF_SIGN[br];
  const vg = T.VARNA_OF_SIGN[gr];
  const bCtrl = (T.VASHYA_CONTROLS[br] as readonly number[]).includes(gr);
  const gCtrl = (T.VASHYA_CONTROLS[gr] as readonly number[]).includes(br);
  const [bc, gc] = [T.VASHYA_CLASS_OF_SIGN[br], T.VASHYA_CLASS_OF_SIGN[gr]];
  const half = (from: number, to: number) => {
    const count = ((to + 27 - from) % 27) + 1;
    const tara = count % 9 === 0 ? 9 : count % 9;
    return [3, 5, 7].includes(tara) ? 0 : 1.5;
  };
  const [by, gy] = [T.YONI_OF_NAKSHATRA[bn], T.YONI_OF_NAKSHATRA[gn]];
  const [bl, gl] = [SIGN_LORD[br], SIGN_LORD[gr]];
  const rel = `${relation(bl, gl)},${relation(gl, bl)}`;
  const maitri = bl === gl ? 5 : ({ "1,1": 5, "1,0": 4, "0,1": 4, "0,0": 3, "1,-1": 1, "-1,1": 1, "0,-1": 0.5, "-1,0": 0.5 } as Record<string, number>)[rel] ?? 0;
  const [bg, gg] = [T.GANA_OF_NAKSHATRA[bn], T.GANA_OF_NAKSHATRA[gn]];
  const [nb, ng] = [T.NADI_OF_NAKSHATRA[bn], T.NADI_OF_NAKSHATRA[gn]];
  return [
    [vb >= vg ? 1 : 0, [T.VARNA_EN[vb - 1], T.VARNA_NE[vb - 1]], [T.VARNA_EN[vg - 1], T.VARNA_NE[vg - 1]]],
    [br === gr || (bCtrl && gCtrl) ? 2 : bCtrl || gCtrl ? 1 : 0, [T.VASHYA_EN[bc], T.VASHYA_NE[bc]], [T.VASHYA_EN[gc], T.VASHYA_NE[gc]]],
    [half(bn, gn) + half(gn, bn), [NAKSHATRA_NAMES[bn], T.NAKSHATRA_NE[bn]], [NAKSHATRA_NAMES[gn], T.NAKSHATRA_NE[gn]]],
    [T.YONI_MATRIX[by][gy], [T.YONI_EN[by], T.YONI_NE[by]], [T.YONI_EN[gy], T.YONI_NE[gy]]],
    [maitri, [EN[bl], NE[bl]], [EN[gl], NE[gl]]],
    [T.GANA_MATRIX[bg][gg], [T.GANA_EN[bg], T.GANA_NE[bg]], [T.GANA_EN[gg], T.GANA_NE[gg]]],
    [[1, 4, 5, 7, 8, 11].includes((gr + 12 - br) % 12) ? 0 : 7, [RASHI_NAMES[br], RASHI_NAMES_NE[br]], [RASHI_NAMES[gr], RASHI_NAMES_NE[gr]]],
    [nb === ng ? 0 : 8, [T.NADI_EN[nb], T.NADI_NE[nb]], [T.NADI_EN[ng], T.NADI_NE[ng]]],
  ];
}

function ashtakuta(br: number, bn: number, gr: number, gn: number, en: boolean): Json {
  const rows = kutas(br, bn, gr, gn);
  const total = rows.reduce((a, r) => a + r[0], 0);
  const nadiDosha = T.NADI_OF_NAKSHATRA[bn] === T.NADI_OF_NAKSHATRA[gn];
  const bhakutaBad = rows[6][0] === 0;
  const [rec, recEn, recNe] =
    total >= 32 ? ["excellent", "Excellent match", "उत्तम मिलन"]
    : total >= 25 ? ["very_good", "Very good match", "धेरै राम्रो मिलन"]
    : total >= 18 ? ["middling", "Acceptable match", "स्वीकार्य मिलन"]
    : ["inauspicious", "Not recommended", "मिलन उपयुक्त छैन"];
  const totalText = Number.isInteger(total) ? String(total) : String(pyRound(total, 1));
  const notes = [`Total compatibility score is ${totalText} out of 36 gunas.`];
  const notesNe = [`कुल मिलन अङ्क ३६ मध्ये ${totalText} गुण।`];
  if (nadiDosha) { notes.push(T.NOTE_NADI); notesNe.push(T.NOTE_NADI_NE); }
  if (bhakutaBad) { notes.push(T.NOTE_BHAKUTA); notesNe.push(T.NOTE_BHAKUTA_NE); }
  if (total < 18) { notes.push(T.NOTE_LOW); notesNe.push(T.NOTE_LOW_NE); }
  return {
    kutas: rows.map(([obtained, b, g], i) => ({
      id: T.KUTA_IDS[i], max: T.KUTA_MAX[i], obtained: roundPoints(obtained), boyValue: en ? b[0] : b[1], girlValue: en ? g[0] : g[1],
      areaOfLife: T.KUTA_AREAOFLIFE[i], areaOfLifeNe: T.KUTA_AREAOFLIFENE[i], info: T.KUTA_INFO[i], infoNe: T.KUTA_INFONE[i],
    })),
    totalObtained: roundPoints(total),
    totalMax: 36,
    recommendation: rec,
    recommendationLabel: recEn,
    recommendationLabelNe: recNe,
    nadiDosha,
    nadiDoshaAdvisory: nadiDosha ? T.NADI_ADVISORY : null,
    nadiDoshaAdvisoryNe: nadiDosha ? T.NADI_ADVISORY_NE : null,
    bhakutaUnfavorable: bhakutaBad,
    doshaAnalysis: [
      { id: "nadi", labelEn: "Nadi Dosha", labelNe: "नाडी दोष", present: nadiDosha },
      { id: "bhakuta", labelEn: "Bhakuta Dosha", labelNe: "भकूट दोष", present: bhakutaBad },
      { id: "gana", labelEn: "Gana Dosha", labelNe: "गण दोष", present: rows[5][0] <= 1 },
    ],
    notes,
    notesNe,
  };
}

/** One partner: the birth Moon (sidereal), the birth instant as printed, and the location echoed. */
export interface MilanPartner {
  moonLongitude: number;
  birthInstant: string;
  location: { lat: number | null; lon: number | null; timezone: string };
}
function personJson(p: MilanPartner): [number, number, Json] {
  const rashi = signOf(p.moonLongitude);
  const [nak, pada] = nakshatraOf(p.moonLongitude);
  return [rashi, nak, {
    moonLongitude: pyRound(p.moonLongitude, 6), moonRashiNum: rashi + 1, moonRashiNe: RASHI_NAMES_NE[rashi], moonRashiEn: RASHI_NAMES[rashi],
    nakshatraIndex: nak, nakshatraNe: T.NAKSHATRA_NE[nak], nakshatraEn: NAKSHATRA_NAMES[nak], pada, birth_instant: p.birthInstant, location: p.location,
  }];
}

/** `build_kundali_milan(boy, girl, lang)`. */
export function kundaliMilan(boy: MilanPartner, girl: MilanPartner, lang = "ne"): Json {
  const en = lang.startsWith("en");
  const [br, bn, boyJson] = personJson(boy);
  const [gr, gn, girlJson] = personJson(girl);
  return { result: ashtakuta(br, bn, gr, gn, en), boy: boyJson, girl: girlJson, ayanamsha: "surya_siddhanta", lang: en ? "en" : "ne" };
}
