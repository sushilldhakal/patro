/**
 * The yoga checklist of `/kundali/detail`, made on the device: `jyotish::yogas` in apps/rust
 * (`full_yoga_catalog` + `yogas_api`), every rule in the source's order. The fixed text is
 * generated from the Rust table (`yoga-text.generated.ts`).
 */
import { pyMod } from "../../panchanga/engine/py";
import {
  APOKLIMA, aspects, BENEFICS, DUSTHANA, DUAL_SIGNS, EN, ENEMIES, fact, FIXED_SIGNS, FRIENDS, houseFrom, KAMA_TRIKONA, KENDRA, KENDRA_TRIKONA,
  MALEFICS, MOVABLE_SIGNS, NE, naturalBenefic, naturalMalefic, navamsaDignity, OWN_SIGNS, PANAPARA, SEVEN, SIGN_LORD, TRIKONA,
  dignityPlanet, type Chart, type Dignity, type GrahaKey, type PlanetFact,
} from "./chart-facts";
import { navamsaSign, EXALT_SIGN as EXALT_SIGN_OF } from "./chart-facts";
import { vargaRashi } from "./vargas";
import { YOGA_TEXT } from "./yoga-text.generated";

type Json = Record<string, unknown>;
export interface YogaRow {
  key: string;
  present: boolean;
  name: string;
  nameNe: string;
  polarity: string;
  text: string;
  textNe: string;
  evaluation: Json | null;
}

const YOGA_BENEFICS: GrahaKey[] = ["jupiter", "venus", "mercury", "moon"];
const OEM: Dignity[] = ["own", "exalted", "moolatrikona"];
const OEMF: Dignity[] = ["own", "exalted", "moolatrikona", "friend"];
const OE: Dignity[] = ["own", "exalted"];
const OEF: Dignity[] = ["own", "exalted", "friend"];
const EDB: Dignity[] = ["enemy", "debilitated"];
const DRY_SIGNS = [0, 4, 7, 8, 9, 10];
const WATERY_SIGNS = [3, 7, 11];
const within = (x: number, set: readonly number[]) => set.includes(x);
const dIn = (pf: PlanetFact, set: Dignity[]) => pf.dignity !== null && set.includes(pf.dignity);
const is = (pf: PlanetFact, d: Dignity) => pf.dignity === d;

const EXALT_DEGREE: Partial<Record<GrahaKey, number>> = { sun: 10, moon: 3, mars: 28, mercury: 15, jupiter: 5, venus: 27, saturn: 20 };
const deeplyExalted = (pf: PlanetFact) => is(pf, "exalted") && EXALT_DEGREE[pf.key] !== undefined && Math.abs(pf.degInSign - (EXALT_DEGREE[pf.key] as number)) <= 1;
const SHODASA = [1, 2, 3, 4, 7, 9, 10, 12, 16, 20, 24, 27, 30, 40, 45, 60];
/** `_amsa_grade`: the named amsa for how many Shodasa vargas hold `g` in its own sign. */
function amsaGrade(g: GrahaKey, lon: number): string | null {
  const own = OWN_SIGNS[g];
  if (!own.length) return null;
  const count = SHODASA.filter((d) => own.includes(vargaRashi(d, lon) - 1)).length;
  if (count >= 13) return "vaiseshikamsa";
  return ["", "", "parijatamsa", "uttamamsa", "gopuramsa", "simhasanamsa", "parvatamsa", "devalokamsa", "kunkumamsa", "iravathamsa", "vaishnavamsa", "saivamsa", "bhaswadamsa"][count] || null;
}
const span = (start: number, length: number) => Array.from({ length }, (_, i) => ((start - 1 + i) % 12) + 1);
const subset = (a: number[], b: number[]) => a.every((x) => b.includes(x));
const signInArc = (sign: number, start: number, end: number) => (start <= end ? start <= sign && sign <= end : sign >= start || sign <= end);
function panchadha(c: Chart, a: GrahaKey, b: GrahaKey): string | null {
  if (a === b) return null;
  const temporal = within(houseFrom(fact(c, b).sign, fact(c, a).sign), [2, 3, 4, 10, 11, 12]);
  if (FRIENDS[a].includes(b)) return temporal ? "adhi_mitra" : "sama";
  if (ENEMIES[a].includes(b)) return temporal ? "sama" : "adhi_shatru";
  return temporal ? "mitra" : "shatru";
}
const compoundFriend = (c: Chart, a: GrahaKey, b: GrahaKey) => ["adhi_mitra", "mitra"].includes(panchadha(c, a, b) ?? "");
const compoundEnemy = (c: Chart, a: GrahaKey, b: GrahaKey) => ["shatru", "adhi_shatru"].includes(panchadha(c, a, b) ?? "");
function bhavaArudha(c: Chart, house: number): number {
  const lordHouse = fact(c, c.houseLord[house]).house;
  const x = ((lordHouse + 12 - house) % 12) + 1;
  let arudha = ((lordHouse - 1 + x - 1) % 12) + 1;
  const seventh = ((house - 1 + 6) % 12) + 1;
  if (arudha === house || arudha === seventh) arudha = ((arudha - 1 + 9) % 12) + 1;
  return arudha;
}

class Builder {
  rows: YogaRow[] = [];
  y(key: string, present: boolean): void {
    const [name, nameNe, polarity, text, textNe] = YOGA_TEXT[key] ?? ["", "", "", "", ""];
    this.rows.push({ key, present, name, nameNe, polarity, text, textNe, evaluation: null });
  }
  raja(kl: GrahaKey, tl: GrahaKey, present: boolean): void {
    const [a, b] = [kl, tl].sort() as GrahaKey[];
    this.rows.push({
      key: `raja_${a}_${b}`,
      present,
      name: "Raja Yoga",
      nameNe: "राज योग",
      polarity: "benefic",
      text: `Formed when the angular lord (${EN[kl]}) and the trine lord (${EN[tl]}) join in one house — a Raja-yoga pattern supporting rise in status, provided the planets involved are reasonably strong.`,
      textNe: `केन्द्र स्वामी (${NE[a]}) र त्रिकोण स्वामी (${NE[b]}) एक भावमा मिल्दा राज योग — ग्रहहरू पर्याप्त बलियो भए उन्नति र प्रतिष्ठाका लागि शुभ।`,
      evaluation: null,
    });
  }
}

/** `full_yoga_catalog(chart)`: every rule, in the source's order. */
export function fullYogaCatalog(c: Chart): YogaRow[] {
  const p = (g: GrahaKey) => fact(c, g);
  const h = (g: GrahaKey) => fact(c, g).house;
  const hf = (a: GrahaKey, b: GrahaKey) => houseFrom(fact(c, a).sign, fact(c, b).sign);
  const asp = (g: GrahaKey, house: number) => aspects(c, g, house);
  const lord = (house: number) => c.houseLord[house];
  const { moonSign, sunSign, lagnaSign } = c;
  const hfm = (g: GrahaKey) => houseFrom(fact(c, g).sign, moonSign);
  const hfl = (g: GrahaKey) => houseFrom(fact(c, g).sign, lagnaSign);
  const anyP = (f: (pf: PlanetFact) => boolean) => c.planets.some(f);
  const maleficIn = (house: number) => anyP((pf) => naturalMalefic(pf.key) && pf.house === house);
  const beneficIn = (house: number) => anyP((pf) => naturalBenefic(pf.key) && pf.house === house);
  const nbAspects = (house: number) => BENEFICS.some((g) => asp(g, house));
  const nmAspects = (house: number) => MALEFICS.some((g) => asp(g, house));
  const nbIn = (house: number) => BENEFICS.some((g) => h(g) === house);
  const b = new Builder();

  const lagnesh = lord(1);
  const lp = p(lagnesh);
  const flank = (reference: number, offset: number) => {
    const target = (reference + offset - 1) % 12;
    return c.planets.some((pf) => pf.key !== "sun" && pf.key !== "moon" && pf.sign === target);
  };
  const [chandra2, chandra12] = [flank(moonSign, 2), flank(moonSign, 12)];
  const [surya2, surya12] = [flank(sunSign, 2), flank(sunSign, 12)];

  // ── Dosha & major patterns ──
  b.y("mangala_dosha", within(hfl("mars"), [1, 4, 7, 8, 12]));
  {
    const [r, k] = [p("rahu").sign, p("ketu").sign];
    b.y("kala_sarpa", SEVEN.every((g) => signInArc(p(g).sign, r, k)) || SEVEN.every((g) => signInArc(p(g).sign, k, r)));
  }
  {
    const houses = new Set(YOGA_BENEFICS.map(h).filter((x) => within(x, KENDRA)));
    const maleficKendra = (["sun", "mars", "saturn"] as GrahaKey[]).some((g) => within(h(g), KENDRA));
    b.y("lagna_mallika", houses.size >= 3 && !maleficKendra);
  }

  // ── Chandra yogas ──
  b.y("gajakesari", within(hfm("jupiter"), KENDRA));
  b.y("sunapha", chandra2);
  b.y("anapha", chandra12);
  b.y("durdhara", chandra2 && chandra12);
  const isolated = !chandra2 && !chandra12;
  const kendraOccupied = KENDRA.some((x) => c.houseOccupants[x].length > 0);
  b.y("kemadruma", isolated && !kendraOccupied);
  b.y("kemadruma_bhanga", isolated && kendraOccupied);
  b.y("chandra_mangala", p("moon").sign === p("mars").sign);
  const moonHouses = (gs: GrahaKey[]) => gs.map(hfm);
  b.y("adhi", subset([6, 7, 8], moonHouses(["mercury", "jupiter", "venus"])));
  b.y("chatussagara", KENDRA.every((x) => c.houseOccupants[x].length > 0));
  // Vasumati (source #9): benefics IN the upachayas, from the Lagna (Jupiter, Venus, Mercury, a waxing
  // Moon) or from the Moon (Jupiter, Venus, Mercury). Python checks the reverse and can never form it.
  const waxing = pyMod(p("moon").longitude - p("sun").longitude, 360) < 180;
  const upachaya = [3, 6, 10, 11];
  const fromLagna = ([...(["jupiter", "venus", "mercury"] as GrahaKey[]), ...(waxing ? (["moon"] as GrahaKey[]) : [])]).every((g) => within(hfl(g), upachaya));
  const fromMoon = (["jupiter", "venus", "mercury"] as GrahaKey[]).every((g) => within(hfm(g), upachaya));
  b.y("vasumati", fromLagna || fromMoon);
  b.y("rajalakshana", (["jupiter", "venus", "mercury", "moon"] as GrahaKey[]).every((g) => within(h(g), KENDRA)));
  const ktLordHouses = [1, 4, 7, 10, 5, 9].map((x) => h(lord(x)));
  const vanchana =
    (anyP((pf) => naturalMalefic(pf.key) && pf.house === 1) && c.gulikaHouse !== null && within(c.gulikaHouse, TRIKONA)) ||
    (c.gulikaHouse !== null && ktLordHouses.includes(c.gulikaHouse)) ||
    (["rahu", "saturn", "ketu"] as GrahaKey[]).some((g) => h(g) === lp.house);
  b.y("vanchana_chora_bheeti", vanchana);
  b.y("shakata", within(hf("moon", "jupiter"), [6, 8, 12]));
  b.y("amala", (["jupiter", "venus", "mercury"] as GrahaKey[]).some((g) => hfl(g) === 10 || hfm(g) === 10));
  b.y(
    "parvata",
    YOGA_BENEFICS.some((g) => within(h(g), KENDRA)) && c.houseOccupants[6].every((g) => YOGA_BENEFICS.includes(g)) && c.houseOccupants[8].every((g) => YOGA_BENEFICS.includes(g)),
  );
  b.y("kahala", within(hf(lord(9), lord(4)), KENDRA) && dIn(lp, OEM));
  b.y("veshi", surya2);
  b.y("vasi", surya12);
  b.y("ubhayachari", surya2 && surya12);
  for (const [g, key] of [["mars", "mahapurusha_mars"], ["mercury", "mahapurusha_mercury"], ["jupiter", "mahapurusha_jupiter"], ["venus", "mahapurusha_venus"], ["saturn", "mahapurusha_saturn"]] as [GrahaKey, string][]) {
    b.y(key, within(h(g), KENDRA) && dIn(p(g), ["exalted", "own", "moolatrikona"]));
  }
  b.y("budhaditya", p("sun").sign === p("mercury").sign);
  b.y(
    "mahabhagya",
    c.isDay !== null && lagnaSign % 2 === sunSign % 2 && sunSign % 2 === moonSign % 2 && ((c.isDay && lagnaSign % 2 === 0) || (!c.isDay && lagnaSign % 2 === 1)),
  );
  b.y("pushkala", lp.sign === p("moon").sign);
  const [l2, l3, l4, l5, l6, l7] = [lord(2), lord(3), lord(4), lord(5), lord(6), lord(7)];
  const [l8, l9, l10, l11, l12] = [lord(8), lord(9), lord(10), lord(11), lord(12)];
  b.y("lakshmi", dIn(p(l9), OEM) && within(h(l9), KENDRA) && dIn(lp, OEM));
  {
    const navLord = p(SIGN_LORD[p(l10).navamsa]);
    b.y("gauri", navLord.house === 10 && is(navLord, "exalted") && lp.house === 10);
  }
  b.y("bharati", [l2, l5, l11].every((l) => {
    const nl = p(SIGN_LORD[p(l).navamsa]);
    return is(nl, "exalted") && nl.house === h(l9);
  }));
  b.y("chapa", is(lp, "exalted") && h(l4) === 10 && h(l10) === 4);
  b.y("chapa_nabhasa", SEVEN.every((g) => within(h(g), [10, 11, 12, 1, 2, 3, 4])));
  b.y("shrinatha", is(p(l7), "exalted") && h(l7) === 10 && h(l9) === h(l10));
  b.y("shankha", within(hf(l6, l5), KENDRA) && dIn(lp, OEM));
  b.y("bheri", [lagnesh, "jupiter", "venus"].every((g) => within(h(g as GrahaKey), KENDRA)) && dIn(p(l9), OEM));
  const angleTrineOwn = (pf: PlanetFact) => within(pf.house, KENDRA_TRIKONA) || dIn(pf, OE);
  {
    const d1 = p(SIGN_LORD[lp.sign]);
    const d1Nav = p(SIGN_LORD[d1.navamsa]);
    b.y("parijata", angleTrineOwn(d1) || angleTrineOwn(d1Nav));
  }
  for (const g of SEVEN) {
    const pf = p(g);
    let present = false;
    if (is(pf, "debilitated")) {
      const dispositor = SIGN_LORD[pf.sign];
      const ex = EXALT_SIGN_OF[g];
      present = within(h(dispositor), KENDRA) || (ex !== undefined && within(h(SIGN_LORD[ex]), KENDRA));
    }
    b.y(`neechabhanga_${g}`, present);
  }

  // ── Raja & Dhana ──
  const lordsSorted = (houses: number[]) => [...new Set(houses.map(lord))].sort();
  const seen: [GrahaKey, GrahaKey][] = [];
  for (const kl of lordsSorted(KENDRA)) {
    for (const tl of lordsSorted(TRIKONA)) {
      if (kl === tl || seen.some(([a, b2]) => (a === kl && b2 === tl) || (a === tl && b2 === kl))) continue;
      seen.push([kl, tl]);
      b.raja(kl, tl, h(kl) === h(tl));
    }
  }
  b.y("dhana_2_11", h(l2) === h(l11));
  b.y("mridanga", SEVEN.some((g) => {
    const pf = p(g);
    if (!is(pf, "exalted")) return false;
    const nl = p(SIGN_LORD[pf.navamsa]);
    return within(nl.house, KENDRA_TRIKONA) && dIn(nl, ["friend", "exalted", "own"]) && dIn(lp, OEM);
  }));
  const occHouses = [...new Set(SEVEN.map(h))].sort((x, y) => x - y);
  for (const [key, start] of [["lagna_malika", 1], ["dhana_malika", 2], ["vikrama_malika", 3], ["sukha_malika", 4], ["putra_malika", 5], ["satru_malika", 6], ["kalatra_malika", 7], ["randhra_malika", 8], ["bhagya_malika", 9], ["karma_malika", 10], ["labha_malika", 11], ["vyaya_malika", 12]] as [string, number][]) {
    b.y(key, subset(occHouses, span(start, 7)));
  }
  b.y("gaja", h(l7) === 11 && h("moon") === 11 && asp(l11, 11));
  {
    const jh = h("jupiter");
    const joins = (g: GrahaKey) => h(g) === jh || asp(g, jh);
    b.y("kalanidhi", within(jh, [2, 5]) && joins("mercury") && joins("venus"));
  }
  b.y("amsavatara", within(h("venus"), KENDRA) && within(h("jupiter"), KENDRA) && within(lagnaSign, MOVABLE_SIGNS) && is(p("saturn"), "exalted") && within(h("saturn"), KENDRA));
  {
    const hh1 = YOGA_BENEFICS.some((g) => within(hf(g, l2), [8, 12]));
    const hh2 = hf("jupiter", l7) === 4 && hf("moon", l7) === 9 && hf("mercury", l7) === 8;
    const hh3 = hf("sun", lagnesh) === 4 && hf("venus", lagnesh) === 10 && hf("mars", lagnesh) === 11;
    b.y("harihara_brahma", hh1 || hh2 || hh3);
  }
  b.y("kusuma", h("jupiter") === 1 && h("moon") === 7 && hf("sun", "moon") === 8);
  b.y("matsya", maleficIn(1) && maleficIn(9) && maleficIn(5) && beneficIn(5) && maleficIn(4) && maleficIn(8));
  {
    const kurmaNavamsa = [5, 6, 7].every((x) => YOGA_BENEFICS.some((g) => {
      const pf = p(g);
      const nd = navamsaDignity(pf);
      return pf.house === x && nd !== null && OEF.includes(nd);
    }));
    const kurmaRasi = [1, 3, 11].every((x) => YOGA_BENEFICS.some((g) => p(g).house === x && dIn(p(g), ["own", "exalted", "friend", "moolatrikona"])));
    b.y("kurma", kurmaNavamsa || kurmaRasi);
  }
  b.y("devendra", within(lagnaSign, FIXED_SIGNS) && h(lagnesh) === 11 && h(l11) === 1 && h(l2) === 10 && h(l10) === 2);
  b.y("makuta", hf("jupiter", l9) === 9 && YOGA_BENEFICS.some((g) => hf(g, "jupiter") === 9) && h("saturn") === 10);
  {
    const n6 = SIGN_LORD[p(l6).navamsa];
    const n9 = SIGN_LORD[p(l9).navamsa];
    b.y("chandika", h(n6) === h("sun") && h(n9) === h("sun") && within(lagnaSign, FIXED_SIGNS) && asp(l6, 1));
  }
  b.y("jaya", is(p(l6), "debilitated") && deeplyExalted(p(l10)));
  b.y("vidyut", deeplyExalted(p(l11)) && h("venus") === h(l11) && within(hf(l11, lagnesh), KENDRA));
  b.y("gandharva", within(h(l10), KAMA_TRIKONA) && h("jupiter") === lp.house && is(p("sun"), "exalted") && h("moon") === 9);
  b.y("siva", h(l5) === 9 && h(l9) === 10 && h(l10) === 5);
  b.y("vishnu", h(SIGN_LORD[p(l9).navamsa]) === 2 && h(l10) === 2 && h(l9) === 2);
  b.y("brahma", within(hf("jupiter", l9), KENDRA) && within(hf("venus", l11), KENDRA) && (within(hfl("mercury"), KENDRA) || within(hf("mercury", l10), KENDRA)));
  b.y("indra", h(l5) === 11 && h(l11) === 5 && h("moon") === 5);
  b.y("ravi", h("sun") === 10 && h(l10) === 3 && h("saturn") === 3);
  const elongation = pyMod(p("moon").longitude - p("sun").longitude, 360);
  b.y("garuda", c.isDay === true && is(p(SIGN_LORD[p("moon").navamsa]), "exalted") && elongation < 180);
  b.y("go", is(p("jupiter"), "moolatrikona") && h(l2) === h("jupiter") && is(lp, "exalted"));
  const navLagnaSign = navamsaSign(c.lagnaLon);
  b.y("gola", h("moon") === 9 && elongation >= 165 && elongation <= 195 && h("jupiter") === 9 && h("venus") === 9 && p("mercury").navamsa === navLagnaSign);
  b.y("thrilochana", within(hf("moon", "sun"), TRIKONA) && within(hf("mars", "sun"), TRIKONA));
  // Kulavardhana (source #74) as literally worded — never formed — with the evidence per reference point.
  b.y("kulavardhana", lagnaSign === sunSign && sunSign === moonSign && SEVEN.every((g) => h(g) === 5));
  b.rows[b.rows.length - 1].evaluation = kulavardhanaEvaluation(c);
  for (const [key, allowed] of [["yupa", span(1, 4)], ["ishu", span(4, 4)], ["sakti", span(7, 4)], ["danda", span(10, 4)], ["nav", span(1, 7)], ["kuta", span(4, 7)], ["chhatra", span(7, 7)], ["chakra", [1, 3, 5, 7, 9, 11]], ["sakata_nabhasa", [1, 7]], ["vihaga", [4, 10]], ["sringhataka", TRIKONA], ["kamala", KENDRA], ["samudra_nabhasa", [2, 4, 6, 8, 10, 12]]] as [string, number[]][]) {
    b.y(key, subset(occHouses, allowed));
  }
  b.y("ardha_chandra", [...PANAPARA, ...APOKLIMA].some((s0) => subset(occHouses, span(s0, 7))));
  b.y("gada", [[1, 4], [4, 7], [7, 10], [10, 1]].some((pair) => subset(occHouses, pair)));
  const sevenIn = (houses: number[], f: (g: GrahaKey) => boolean) => SEVEN.filter((g) => within(h(g), houses)).every(f);
  b.y("vajra", subset(occHouses, KENDRA) && sevenIn([1, 7], naturalBenefic) && sevenIn([4, 10], naturalMalefic));
  b.y("yava", subset(occHouses, KENDRA) && sevenIn([1, 7], naturalMalefic) && sevenIn([4, 10], naturalBenefic));
  b.y("hala", [[2, 6, 10], [3, 7, 11], [4, 8, 12]].some((t) => subset(occHouses, t)));
  b.y("vapee", subset(occHouses, PANAPARA) || subset(occHouses, APOKLIMA));
  const occSigns = [...new Set(SEVEN.map((g) => p(g).sign))];
  for (const [key, n] of [["vallaki", 7], ["damni", 6], ["pasa", 5], ["kedara", 4], ["sula", 3], ["yuga", 2], ["gola_nabhasa", 1]] as [string, number][]) b.y(key, occSigns.length === n);
  b.y("rajju", subset(occSigns, MOVABLE_SIGNS));
  b.y("musala", subset(occSigns, FIXED_SIGNS));
  b.y("nala", subset(occSigns, DUAL_SIGNS));

  // ── Combinations #101–162 ──
  const joinedOrAspects = (a: GrahaKey, t: GrahaKey) => h(a) === h(t) || asp(a, h(t));
  b.y("srik_mala", BENEFICS.every((g) => within(h(g), KENDRA)));
  b.y("sarpa_101_200", MALEFICS.every((g) => within(h(g), KENDRA)));
  b.y("duryoga", within(h(l10), DUSTHANA));
  b.y("daridra_101_200", within(h(l11), DUSTHANA));
  b.y("harsha", h(l6) === 6);
  b.y("sarala", h(l8) === 8);
  b.y("vimala", h(l12) === 12);
  b.y("sareera_soukhya", within(lp.house, KENDRA) || within(h("jupiter"), KENDRA) || within(h("venus"), KENDRA));
  b.y("dehapushti", within(lp.sign, MOVABLE_SIGNS) && nbAspects(lp.house));
  b.y("dehakashta", lp.house === 8 || anyP((pf) => naturalMalefic(pf.key) && pf.house === lp.house));
  b.y("rogagrastha", (lp.house === 1 && [l6, l8, l12].some((l) => h(l) === 1)) || (!dIn(lp, OEMF) && within(lp.house, KENDRA_TRIKONA)));
  const dryPlanet = (g: GrahaKey) => g === "sun" || g === "mars" || g === "saturn";
  b.y("krisanga_1", within(lp.sign, DRY_SIGNS) || dryPlanet(SIGN_LORD[lp.sign]));
  b.y("krisanga_2", dryPlanet(SIGN_LORD[navLagnaSign]) && maleficIn(1));
  b.y("dehasthoulya_1", within(lp.sign, WATERY_SIGNS) && within(p(SIGN_LORD[lp.navamsa]).sign, WATERY_SIGNS));
  b.y("dehasthoulya_2", h("jupiter") === 1 || (within(p("jupiter").sign, WATERY_SIGNS) && asp("jupiter", 1)));
  b.y("dehasthoulya_3", (within(lagnaSign, WATERY_SIGNS) && nbIn(1)) || lagnesh === "moon" || lagnesh === "venus");
  b.y("sada_sanchara", within(lp.sign, MOVABLE_SIGNS) || within(p(SIGN_LORD[lp.sign]).sign, MOVABLE_SIGNS));
  const fifthSign = (lagnaSign + 4) % 12;
  for (const [key, signs, planet, eleventh] of [
    ["dhana_118", [1, 6], "venus", ["saturn"]],
    ["dhana_119", [2, 5], "mercury", ["moon", "mars"]],
    ["dhana_120", [9, 10], "saturn", ["mercury", "mars"]],
    ["dhana_121", [4], "sun", ["jupiter", "moon"]],
    ["dhana_122", [8, 11], "jupiter", ["mars", "moon"]],
  ] as [string, number[], GrahaKey, GrahaKey[]][]) {
    b.y(key, within(fifthSign, signs) && h(planet) === 5 && eleventh.every((g) => h(g) === 11));
  }
  for (const [key, signs, planet, aspecting] of [
    ["dhana_123", [4], "sun", ["mars", "jupiter"]],
    ["dhana_124", [3], "moon", ["jupiter", "mars"]],
    ["dhana_125", [0, 7], "mars", ["moon", "venus", "saturn"]],
    ["dhana_126", [2, 5], "mercury", ["saturn", "venus"]],
    ["dhana_127", [8, 11], "jupiter", ["mercury", "mars"]],
    ["dhana_128", [1, 6], "venus", ["saturn", "mercury"]],
  ] as [string, number[], GrahaKey, GrahaKey[]][]) {
    b.y(key, within(lagnaSign, signs) && h(planet) === 1 && aspecting.every((a) => joinedOrAspects(a, planet)));
  }
  b.y("bahudravyarjana", lp.house === 2 && h(l2) === 11 && h(l11) === 1);
  b.y("swaveeryaddhana_1", within(lp.house, KENDRA) && h("jupiter") === lp.house && amsaGrade(l2, p(l2).longitude) === "vaiseshikamsa");
  {
    const navLord = SIGN_LORD[lp.navamsa];
    const fin = p(SIGN_LORD[p(navLord).sign]);
    b.y("swaveeryaddhana_2", dIn(fin, OE) || within(houseFrom(fin.sign, p(l2).sign), KENDRA_TRIKONA));
  }
  b.y("swaveeryaddhana_3", within(hf(l2, lagnesh), KENDRA_TRIKONA) || (naturalBenefic(l2) && (deeplyExalted(p(l2)) || anyP((pf) => pf.key !== l2 && pf.house === h(l2) && is(pf, "exalted")))));
  b.y("madhya_vayasi_dhana", within(hf(l2, lagnesh), KENDRA_TRIKONA) && within(hf(l2, l11), KENDRA_TRIKONA) && nbAspects(h(l2)));
  {
    let anthya = false;
    if (h(l2) === lp.house) {
      const hasBenefic = anyP((pf) => naturalBenefic(pf.key) && pf.house === lp.house);
      const disp = p(SIGN_LORD[lp.sign]);
      anthya = hasBenefic && disp.house === 1 && dIn(disp, OE);
    }
    b.y("anthya_vayasi_dhana", anthya);
  }
  b.y("balya_dhana", h(l2) === h(l10) && within(h(l2), KENDRA) && asp(SIGN_LORD[lp.navamsa], h(l2)));
  b.y("bhratrumooladdhanaprapti_1", lp.house === 3 && h(l2) === 3 && nbAspects(3));
  b.y("bhratrumooladdhanaprapti_2", h(l3) === 2 && h("jupiter") === 2 && (lp.house === 2 || asp(lagnesh, 2)));
  b.y("matrumooladdhana", joinedOrAspects(l2, l4));
  const vaiseshikaLagnesh = amsaGrade(lagnesh, lp.longitude) === "vaiseshikamsa";
  b.y("putramooladdhana", (h(l2) === h(l5) || h(l2) === h("jupiter")) && vaiseshikaLagnesh);
  b.y("satrumooladdhana", (h(l2) === h(l6) || h(l2) === h("mars")) && vaiseshikaLagnesh);
  b.y("kalatramooladdhana", (h(l2) === h(l7) || asp(l7, h(l2))) && (h(l2) === h("venus") || asp("venus", h(l2))) && dIn(lp, OEMF));
  const count2nd = SEVEN.filter((g) => h(g) === 2).length;
  b.y("amaranantha_dhana", count2nd >= 3 && (dIn(p(l2), OE) || dIn(p("jupiter"), OE)));
  b.y("ayatnadhanalabha", lp.house === 2 && h(l2) === 1);
  b.y("daridra_144", lp.house === 12 && h(l12) === 1 && (within(h(l7), [1, 12]) || asp(l7, 1) || asp(l7, 12)));
  b.y("daridra_145", lp.house === 6 && h(l6) === 1 && (asp(l2, h("moon")) || asp(l7, h("moon"))));
  b.y("daridra_146", h("ketu") === 1 && h("moon") === 1);
  b.y("daridra_147", lp.house === 8 && (h(l2) === 8 || asp(l2, 8) || h(l7) === 8 || asp(l7, 8)));
  const lh = lp.house;
  b.y("daridra_148", within(lh, DUSTHANA) && anyP((pf) => naturalMalefic(pf.key) && pf.house === lh) && (h(l2) === lh || asp(l2, lh) || h(l7) === lh || asp(l7, lh)));
  b.y("daridra_149", [l6, l8, l12].some((l) => h(l) === lh) && nmAspects(lh));
  b.y("daridra_150", [l6, l8, l12].some((l) => h(l) === h(l5)) && !BENEFICS.some((g) => asp(g, h(l5)) || h(g) === h(l5)));
  b.y("daridra_151", within(h(l5), [6, 10]) && [l2, l6, l7, l8, l12].some((l) => asp(l, h(l5))));
  const has152Malefic = MALEFICS.some((g) => h(g) === 1 && g !== lord(9) && g !== l10);
  b.y("daridra_152", has152Malefic && ([l2, l7].some((m) => h(m) === 1) || [l2, l7].some((m) => asp(m, 1))));
  b.y("daridra_153", within(lh, DUSTHANA) && within(h(SIGN_LORD[navLagnaSign]), DUSTHANA) && (h(l2) === lh || asp(l2, lh)) && (h(l7) === lh || asp(l7, lh)));
  b.y("yukthi_1", (within(h(l2), KENDRA_TRIKONA) && nbIn(h(l2))) || (deeplyExalted(p(l2)) && h("jupiter") === h(l2)));
  b.y("yukthi_2", within(h(l2), KENDRA) && deeplyExalted(p(l2)) && amsaGrade(l2, p(l2).longitude) === "parvatamsa" && (amsaGrade("jupiter", p("jupiter").longitude) === "simhasanamsa" || amsaGrade("venus", p("venus").longitude) === "simhasanamsa"));
  const pari = SIGN_LORD[p("sun").navamsa];
  b.y("parihasaka", h(pari) === 2 && amsaGrade(pari, p(pari).longitude) === "vaiseshikamsa");
  b.y("asatyavadi", within(p(l2).sign, [9, 10, 0, 7]) && anyP((pf) => naturalMalefic(pf.key) && within(pf.house, KENDRA)) && anyP((pf) => naturalMalefic(pf.key) && within(pf.house, TRIKONA)));
  b.y("jada_101_200", (h(l2) === 10 && maleficIn(10)) || (h(l2) === h("sun") && c.mandiHouse === h("sun")));
  b.y("bhaskara", hf("mercury", "sun") === 2 && hf("moon", "mercury") === 11 && within(hf("jupiter", "moon"), [5, 9]));
  b.y("marud", within(hf("jupiter", "venus"), [5, 9]) && hf("moon", "jupiter") === 5 && within(hf("sun", "moon"), KENDRA));
  const sar = [1, 2, 4, 5, 7, 9, 10];
  b.y("saraswathi", within(h("jupiter"), sar) && dIn(p("jupiter"), OEMF) && within(h("venus"), sar) && within(h("mercury"), sar));
  b.y("budha_yoga", h("jupiter") === 1 && within(h("moon"), KENDRA) && hf("rahu", "moon") === 2 && hf("sun", "rahu") === 3 && hf("mars", "rahu") === 3);
  const hemmed = (pf: PlanetFact) => maleficIn((pf.house % 12) + 1) && maleficIn(((pf.house + 10) % 12) + 1);
  const waning = elongation >= 180;
  const weak = (pf: PlanetFact) => dIn(pf, EDB);
  const linked = (a: GrahaKey, others: GrahaKey[]) => others.some((o) => h(a) === h(o) || asp(o, h(a)));
  const hasDigbala = (g: GrahaKey) => (p(g).digBala ?? -Infinity) > 30;
  const eighthSign = (lagnaSign + 7) % 12;
  const thirdSign = (lagnaSign + 2) % 12;
  b.y("mooka", h(l2) === 8 && h("jupiter") === 8 && !(eighthSign === 3 || within(eighthSign, [8, 11])));
  const navd = (g: GrahaKey) => navamsaDignity(p(g));
  const navdIn = (g: GrahaKey, set: Dignity[]) => {
    const d = navd(g);
    return d !== null && set.includes(d);
  };
  b.y("netranasa", (h(l10) === 1 && h(l6) === 1 && h(l2) === 1) || (navd(l10) === "debilitated" && navd(l6) === "debilitated"));
  b.y("andha_163", (h("mercury") === 2 && h("moon") === 2) || (lp.house === 2 && h(l2) === 2 && h("sun") === 2));
  b.y("sumukha_1", within(h(l2), KENDRA) && nbAspects(h(l2)));
  b.y("sumukha_2", nbIn(2));
  b.y("durmukha_1", maleficIn(2) && (is(p(l2), "debilitated") || maleficIn(h(l2))));
  b.y("durmukha_2", naturalMalefic(l2) && (c.gulikaHouse === h(l2) || (navdIn(l2, EDB) && anyP((pf) => pf.key !== l2 && naturalMalefic(pf.key) && pf.navamsa === p(l2).navamsa))));
  const vaiseshikaL2 = amsaGrade(l2, p(l2).longitude) === "vaiseshikamsa";
  b.y("bhojana_soukhya", vaiseshikaL2 && (asp("jupiter", h(l2)) || asp("venus", h(l2))));
  b.y("annadana", vaiseshikaL2 && (h(l2) === h("jupiter") || asp("jupiter", h(l2))) && (h(l2) === h("mercury") || asp("mercury", h(l2))));
  b.y("parannabhojana", (is(p(l2), "debilitated") || navd(l2) === "enemy") && anyP((pf) => dignityPlanet(pf.key) && is(pf, "debilitated") && asp(pf.key, h(l2))));
  b.y("sraddhannabhuktha", l2 === "saturn" || h(l2) === h("saturn") || (is(p("saturn"), "debilitated") && asp("saturn", 2)));
  b.y("sarpaganda_163", h("rahu") === 2 && c.mandiHouse === 2);
  b.y("vakchalana", naturalMalefic(l2) && navdIn(l2, EDB) && !nbIn(h(l2)) && !nbAspects(h(l2)));
  b.y("vishaprayoga", maleficIn(2) && nmAspects(2) && navdIn(l2, EDB) && nmAspects(h(l2)));
  b.y("bhratruvriddhi", nbIn(h(l3)) || nbAspects(h(l3)) || nbIn(h("mars")) || nbAspects(h("mars")) || nbIn(3));
  b.y("sodaranasa", h("mars") === h(l3) && within(h("mars"), [3, 5, 7, 8]) && nmAspects(h("mars")));
  b.y("ekabhagini", h("mercury") === 3 && h(l3) === h("moon") && h("mars") === h("saturn"));
  b.y("dwadasa_sahodara", within(h(l3), KENDRA) && is(p("mars"), "exalted") && h("mars") === h("jupiter") && within(hf("mars", l3), TRIKONA));
  b.y("sapthasankhya_sahodara", h(l12) === h("mars") && h("moon") === 3 && h("jupiter") === 3 && !(h("venus") === 3 || asp("venus", 3)));
  b.y("parakrama", navdIn(l3, OEF) && (nbIn(h(l3)) || nbAspects(h(l3))) && naturalBenefic(SIGN_LORD[p("mars").sign]));
  {
    const ynl = SIGN_LORD[p(l3).navamsa];
    const ynl2 = SIGN_LORD[p(ynl).navamsa];
    b.y("yuddha_praveena", dIn(p(ynl2), OE));
  }
  b.y("yuddhatpoorvadridhachitta", is(p(l3), "exalted") && (within(p(l3).sign, MOVABLE_SIGNS) || within(p(l3).navamsa, MOVABLE_SIGNS)) && maleficIn(h(l3)));
  b.y("yuddhatpaschaddrudha", within(p(l3).sign, FIXED_SIGNS) && within(p(l3).navamsa, FIXED_SIGNS) && is(p(SIGN_LORD[p(l3).sign]), "debilitated"));
  b.y("satkathadisravana", naturalBenefic(SIGN_LORD[thirdSign]) && nbAspects(3) && navdIn(l3, OEF));
  b.y("uttama_griha", within(h(l4), KENDRA_TRIKONA) && nbIn(h(l4)));
  b.y("vichitra_saudha_prakara", h(l4) === h(l10) && h(l10) === h("saturn") && h("saturn") === h("mars"));
  b.y("ayatna_griha_prapta_1", within(lp.house, [1, 4]) && within(h(l7), [1, 4]) && (nbAspects(lp.house) || nbAspects(h(l7))));
  b.y("ayatna_griha_prapta_2", within(h(l9), KENDRA) && dIn(p(l4), ["exalted", "moolatrikona", "own"]));
  b.y("grihanasa_1", h(l4) === 12 && nmAspects(12));
  b.y("grihanasa_2", h(SIGN_LORD[p(l4).navamsa]) === 12);
  b.y("bandhu_pujya_1", naturalBenefic(l4) && BENEFICS.some((g) => g !== l4 && asp(g, h(l4))) && h("mercury") === 1);
  b.y("bandhu_pujya_2", h("jupiter") === 4 || asp("jupiter", 4) || h(l4) === h("jupiter"));
  b.y("bandhubhisthyaktha", maleficIn(h(l4)) || dIn(p(l4), EDB));
  b.y("matrudeerghayur_1", nbIn(4) && is(p(l4), "exalted") && dIn(p("moon"), OEMF));
  {
    const mnl = p(SIGN_LORD[p(l4).navamsa]);
    b.y("matrudeerghayur_2", dIn(mnl, OEMF) && within(mnl.house, KENDRA) && within(houseFrom(mnl.sign, moonSign), KENDRA));
  }
  b.y("matrunasa_1", maleficIn(h("moon")) || nmAspects(h("moon")) || hemmed(p("moon")));
  {
    const m2 = SIGN_LORD[p(l4).navamsa];
    const m3 = SIGN_LORD[p(m2).navamsa];
    b.y("matrunasa_2", within(h(m3), DUSTHANA));
  }
  const afflictedKendra = (g: GrahaKey) => within(h(g), KENDRA) && (maleficIn(h(g)) || nmAspects(h(g)));
  b.y("matrugami", (afflictedKendra("moon") || afflictedKendra("venus")) && maleficIn(4));
  const fifthRef = (lagnaSign + 4) % 12;
  const fourthRef = (lagnaSign + 3) % 12;
  const maleficOn = (house: number) => anyP((pf) => naturalMalefic(pf.key) && (pf.house === house || asp(pf.key, house)));
  b.y("sahodareesangama", h(l7) === 4 && h("venus") === 4 && maleficOn(4));
  b.y("kapata_1", maleficIn(4) && maleficOn(h(l4)));
  b.y("kapata_2", (["saturn", "mars", "rahu"] as GrahaKey[]).every((g) => h(g) === 4) && naturalMalefic(l10) && nmAspects(h(l10)));
  b.y("kapata_3", h(l4) === h("saturn") && h("saturn") === h("rahu") && c.mandiHouse === h("rahu") && nmAspects(h(l4)));
  b.y("nishkapata_1", beneficIn(4) || anyP((pf) => dignityPlanet(pf.key) && pf.house === 4 && dIn(pf, OEF)) || naturalBenefic(SIGN_LORD[fourthRef]));
  b.y("nishkapata_2", lp.house === 4 && BENEFICS.some((g) => h(g) === 4 || asp(g, 4)));
  b.y("matru_satrutwa", ENEMIES[lagnesh].includes(l4) || ENEMIES[l4].includes(lagnesh) || compoundEnemy(c, lagnesh, l4) || compoundEnemy(c, l4, lagnesh));
  b.y("matru_sneha", lagnesh === l4 || FRIENDS[lagnesh].includes(l4) || FRIENDS[l4].includes(lagnesh) || compoundFriend(c, lagnesh, l4) || compoundFriend(c, l4, lagnesh) || nbAspects(h(l4)));
  b.y("vahana_1", within(lp.house, [4, 9, 11]));
  b.y("vahana_2", is(p(l4), "exalted") && EXALT_SIGN_OF[l4] !== undefined && within(h(SIGN_LORD[EXALT_SIGN_OF[l4] as number]), KENDRA_TRIKONA));
  b.y("anapathya", weak(p("jupiter")) && weak(lp) && weak(p(l7)) && weak(p(l5)));
  b.y("sarpasapa_1", h("rahu") === 5 && (asp("mars", 5) || within(fifthRef, [0, 7])));
  b.y("sarpasapa_2", h(l5) === h("rahu") && h("saturn") === 5 && (h("moon") === 5 || asp("moon", 5)));
  b.y("sarpasapa_3", h("jupiter") === h("mars") && h("rahu") === 1 && within(h(l5), DUSTHANA));
  b.y("sarpasapa_4", within(fifthRef, [0, 7]) && h("rahu") === 5 && (h("mercury") === 5 || asp("mercury", 5)));
  b.y("pitrusapa_sutakshaya", h("sun") === 5 && (fifthRef === 6 || within(fifthRef, [9, 10]) || hemmed(p("sun"))));
  b.y("matrusapa_sutakshaya", h(l8) === 5 && h(l5) === 8 && h("moon") === 6 && h(l4) === 6);
  b.y("bhratrusapa_sutakshaya", lp.house === 8 && h(l5) === 8 && h(l3) === h("mars") && h("mars") === h("rahu") && h("rahu") === 5);
  b.y("pretasapa", h("sun") === 5 && h("saturn") === 5 && h("moon") === 7 && dIn(p("moon"), EDB) && h("rahu") === 1 && h("jupiter") === 12);
  b.y("bahuputra_1", h("rahu") === 5 && SIGN_LORD[p("rahu").navamsa] !== "saturn");
  b.y("bahuputra_2", c.planets.some((pf) => pf.key !== l7 && (pf.house === h(l7) || asp(pf.key, h(l7))) && within(h(SIGN_LORD[pf.navamsa]), [1, 2, 5])));
  b.y("dattaputra_1", h("mars") === 5 && h("saturn") === 5 && within(lp.sign, [2, 5]) && (h("mercury") === lp.house || asp("mercury", lp.house)));
  b.y("dattaputra_2", h(l7) === 11 && nbIn(h(l5)) && (["mars", "saturn"] as GrahaKey[]).some((g) => h(g) === 5));
  b.y("aputra", within(h(l5), DUSTHANA));
  b.y("ekaputra", within(h(l5), KENDRA_TRIKONA));
  b.y("satputra", l5 === "jupiter" && dIn(p("sun"), ["own", "exalted", "friend", "moolatrikona"]));
  b.y("kalanirdesat_putra_1", h("jupiter") === 5 && h(l5) === h("venus"));
  b.y("kalanirdesat_putra_2", hfl("jupiter") === 9 && hf("venus", "jupiter") === 9 && h("venus") === lp.house);
  b.y("kalanirdesat_putranasa_1", h("rahu") === 5 && maleficIn(h(l5)) && is(p("jupiter"), "debilitated"));
  b.y("kalanirdesat_putranasa_2", anyP((pf) => naturalMalefic(pf.key) && houseFrom(pf.sign, p("jupiter").sign) === 5) && anyP((pf) => naturalMalefic(pf.key) && houseFrom(pf.sign, lagnaSign) === 5));
  b.y("buddhimaturya", naturalBenefic(l5) && (BENEFICS.some((g) => g !== l5 && asp(g, h(l5))) || naturalBenefic(SIGN_LORD[p(l5).sign])));
  b.y("theevrabuddhi", naturalBenefic(l5) && nbAspects(h(SIGN_LORD[p(l5).navamsa])));
  b.y("buddhi_jada", maleficOn(lp.house) && h("saturn") === 5 && asp("saturn", lp.house));
  b.y("thrikalagnana", (p("jupiter").vargottama || navdIn("jupiter", OE)) && nbAspects(h("jupiter")));
  b.y("putra_sukha", nbIn(5) || (dIn(p(l5), OEMF) && nbAspects(h(l5))));
  b.y("jara", h(l7) === 4 && h(l4) === 7 && nmAspects(4));
  b.y("jarajaputra", h(l5) === h("venus") && h("moon") === 5);
  b.y("bahu_stree", dIn(p(l7), OE) && h("venus") === h(l7));
  b.y("satkalatra", linked(l7, ["jupiter", "mercury"]) || linked("venus", ["jupiter", "mercury"]));
  b.y("bhaga_chumbana", (h(l7) === 4 && h("venus") === 4) || is(lp, "debilitated") || navamsaDignity(lp) === "debilitated");
  b.y("bhagya", BENEFICS.some((g) => within(h(g), [1, 3, 5]) && dIn(p(g), OEMF) && asp(g, 9)));
  b.y("jananatpurvam_pitru_marana", within(h("sun"), DUSTHANA) && h(l8) === 9 && h(l12) === 1 && h(l6) === 5);
  b.y("dhatrutwa", is(p(l9), "exalted") && nbAspects(h(l9)) && nbIn(9));
  b.y("apakeerti", h("sun") === 10 && h("saturn") === 10 && nmAspects(10));
  b.y("raja_1_201_300", SEVEN.filter((g) => within(h(g), KENDRA) && dIn(p(g), OE)).length >= 3);
  b.y("raja_2_201_300", SEVEN.some((g) => {
    const pf = p(g);
    return is(pf, "debilitated") && within(pf.house, KENDRA_TRIKONA) && (!pf.combust || pf.retrograde);
  }));
  const raja3 = SEVEN.filter(hasDigbala).length;
  b.y("raja_3_201_300", raja3 >= 2 && raja3 <= 4);
  b.y("neechabhanga_raja_1", lagnaSign === 10 && h("venus") === 1 && SEVEN.filter((g) => is(p(g), "exalted")).length >= 4);
  b.y("neechabhanga_raja_2", h("moon") === 1 && h("jupiter") === 4 && h("venus") === 10 && dIn(p("saturn"), ["exalted", "own"]));
  const nbGeneric = (g: GrahaKey) => {
    const pf = p(g);
    if (!is(pf, "debilitated")) return false;
    const kendraEither = (x: GrahaKey) => within(houseFrom(p(x).sign, lagnaSign), KENDRA) || within(houseFrom(p(x).sign, moonSign), KENDRA);
    const ex = EXALT_SIGN_OF[g];
    return kendraEither(SIGN_LORD[pf.sign]) || (ex !== undefined && kendraEither(SIGN_LORD[ex]));
  };
  b.y("neechabhanga_raja_3", SEVEN.some(nbGeneric));
  b.y("raja_4_201_300", h("moon") === 4 && h("jupiter") === 12 && asp("jupiter", 4) && h("mars") === 10 && asp("mars", 4));
  const debilitated = SEVEN.filter((g) => is(p(g), "debilitated"));
  b.y("raja_5_201_300", debilitated.length > 0 && debilitated.every((g) => navd(g) === "exalted"));
  b.y("raja_6_201_300", h("jupiter") === 1 && h("mercury") === 10 && lp.house === 10 && h("mars") === 10);
  b.y("raja_7_201_300", dIn(p("saturn"), ["exalted", "moolatrikona"]) && within(h("saturn"), KENDRA_TRIKONA) && asp(l10, h("saturn")));
  b.y("raja_8_201_300", within(h("moon"), [2, 3]) && h("mars") === h("moon") && h("rahu") === 5);
  b.y("raja_9_201_300", h(l10) === 9 && navdIn(l10, OEF));
  b.y("raja_10_201_300", h("jupiter") === 5 && within(hfm("jupiter"), KENDRA) && within(lagnaSign, FIXED_SIGNS) && lp.house === 10);
  {
    const nl = p(SIGN_LORD[p("moon").navamsa]);
    b.y("raja_11_201_300", within(nl.house, KENDRA_TRIKONA) || within(houseFrom(nl.sign, p("mercury").sign), KENDRA_TRIKONA));
  }
  b.y("sarpaganda_2", h("rahu") === 2 && c.mandiHouse === 2 && nmAspects(h(l2)));
  b.y("raja_12_201_300", within(lagnaSign, MOVABLE_SIGNS) && within(lp.sign, MOVABLE_SIGNS) && SEVEN.some((g) => is(p(g), "debilitated") && within(h(SIGN_LORD[p(g).navamsa]), KENDRA_TRIKONA)));
  b.y("raja_13_201_300", anyP((pf) => dignityPlanet(pf.key) && pf.key !== lagnesh && pf.house === lp.house && is(pf, "debilitated")) && h("rahu") === 10 && h("saturn") === 10 && asp(l9, 10));
  b.y("raja_14_201_300", [l11, l9, l2].some((l) => within(hfm(l), KENDRA)) && (l2 === "jupiter" || l5 === "jupiter" || l11 === "jupiter"));
  b.y("raja_15_201_300", (["jupiter", "mercury", "venus", "moon"] as GrahaKey[]).some((k) => {
    const pf = p(k);
    return pf.house === 9 && !pf.combust && SEVEN.some((fr) => fr !== k && (h(fr) === 9 || asp(fr, 9)) && compoundFriend(c, k, fr));
  }));
  b.y("galakarna", h("rahu") === 3 && c.mandiHouse === 3);
  b.y("vrana", naturalMalefic(l6) && within(h(l6), [1, 8, 10]));
  b.y("sisnavyadhi", h("mercury") === 1 && h(l6) === 1 && h(l8) === 1);
  b.y("kalatrashanda", h(l7) === 6 && h("venus") === 6);
  b.y("kushtaroga_1", within(lp.house, [4, 12]) && h("mars") === lp.house && h("mercury") === lp.house);
  b.y("kushtaroga_2", h("jupiter") === 6 && h("saturn") === 6 && h("moon") === 6);
  b.y("kshayaroga", h("rahu") === 6 && c.mandiHouse !== null && within(c.mandiHouse, KENDRA) && lp.house === 8);
  b.y("bandhana", h(l6) === lp.house && within(lp.house, KENDRA_TRIKONA) && (["saturn", "rahu", "ketu"] as GrahaKey[]).some((g) => h(g) === lp.house));
  b.y("karascheda", (h("saturn") === 9 && h("jupiter") === 3) || (h("saturn") === 3 && h("jupiter") === 9));
  b.y("sirachcheda", h(l6) === h("venus") && (h("sun") === h("rahu") || h("saturn") === h("rahu")));
  b.y("durmarana", within(h("moon"), DUSTHANA) && asp(lagnesh, h("moon")) && ((["saturn", "rahu"] as GrahaKey[]).some((g) => h(g) === h("moon")) || c.mandiHouse === h("moon")));
  b.y("yuddhe_marana", (l6 === "mars" || l8 === "mars") && h(l3) === h("mars") && ((["rahu", "saturn"] as GrahaKey[]).some((g) => h(g) === h("mars")) || c.mandiHouse === h("mars")));
  const evil8 = MALEFICS.filter((g) => h(g) === 8).length;
  b.y("sanghataka_marana_1", evil8 >= 2 && MALEFICS.some((g) => h(g) === 8 && (within(p(g).sign, [0, 7]) || within(p(g).navamsa, [0, 7]))));
  b.y("sanghataka_marana_2", (["sun", "rahu", "saturn"] as GrahaKey[]).every((g) => asp(l8, h(g))));
  b.y("peenasaroga", h("moon") === 6 && h("saturn") === 8 && anyP((pf) => naturalMalefic(pf.key) && pf.key !== "moon" && pf.house === 12) && naturalMalefic(SIGN_LORD[lp.navamsa]));
  b.y("pittaroga", maleficIn(6) && anyP((pf) => naturalMalefic(pf.key) && pf.key !== "sun" && pf.house === h("sun")) && nmAspects(h("sun")));
  b.y("vikalangapatni", within(h("venus"), [5, 7, 9]) && h("sun") === h("venus"));
  b.y("putrakalatraheena", h("moon") === 5 && waning && maleficIn(12) && maleficIn(7) && maleficIn(1));
  b.y("bharyasahavyabhichara", h("moon") === 7 && (["venus", "saturn", "mars"] as GrahaKey[]).every((g) => h(g) === 7));
  b.y("vamsacheda", h("moon") === 10 && h("venus") === 7 && maleficIn(4));
  b.y("guhyaroga", within(p("moon").navamsa, [3, 7]) && anyP((pf) => pf.key !== "moon" && naturalMalefic(pf.key) && pf.navamsa === p("moon").navamsa));
  b.y("angaheena", h("moon") === 10 && h("mars") === 7 && hf("saturn", "sun") === 2);
  b.y("swetakushta", ((h("mars") === 2 && h("saturn") === 12) || (h("mars") === 12 && h("saturn") === 2)) && h("moon") === 1 && h("sun") === 7);
  const maleficTrikona = anyP((pf) => naturalMalefic(pf.key) && within(pf.house, TRIKONA));
  b.y("pisacha_grastha", h("rahu") === 1 && h("moon") === 1 && maleficTrikona);
  b.y("andha_1", h("sun") === 1 && h("rahu") === 1 && maleficTrikona);
  b.y("andha_2", h("mars") === 2 && h("moon") === 6 && h("saturn") === 12 && h("sun") === 8);
  b.y("vatharoga", h("jupiter") === 1 && h("saturn") === 7);
  b.y("matibhramana_1", h("jupiter") === 1 && h("mars") === 7);
  b.y("matibhramana_2", h("saturn") === 1 && within(h("mars"), [5, 7, 9]));
  b.y("matibhramana_3", h("saturn") === 12 && h("moon") === 12 && waning);
  b.y("matibhramana_4", within(h("moon"), KENDRA) && h("mercury") === h("moon") && anyP((pf) => pf.key !== "moon" && pf.key !== "mercury" && (pf.house === h("moon") || asp(pf.key, h("moon")))));
  b.y("khalawata", naturalMalefic(SIGN_LORD[lagnaSign]) && nmAspects(1));
  b.y("nishturabhashi", h("moon") === h("saturn"));
  {
    const al = bhavaArudha(c, 1);
    const a12 = bhavaArudha(c, 12);
    b.y("rajabhrashta", h(SIGN_LORD[(lagnaSign + al - 1) % 12]) === h(SIGN_LORD[(lagnaSign + a12 - 1) % 12]));
  }
  b.y("raja_yoga_bhanga_1", lagnaSign === 4 && p("saturn").sign === 6 && is(p("saturn"), "exalted") && navd("saturn") === "debilitated");
  b.y("raja_yoga_bhanga_2", p("sun").sign === 6 && Math.abs(p("sun").degInSign - 10) <= 1);
  b.y("gohanta", anyP((pf) => naturalMalefic(pf.key) && within(pf.house, KENDRA) && !nbAspects(pf.house)) && h("jupiter") === 8);
  return b.rows;
}

/** The 5th from the Lagna, the Sun and the Moon: which grahas, and which benefics, occupy each. */
function kulavardhanaEvaluation(c: Chart): Json {
  const waxing = pyMod(fact(c, "moon").longitude - fact(c, "sun").longitude, 360) < 180;
  const benefic = (g: GrahaKey) => g === "jupiter" || g === "venus" || g === "mercury" || (g === "moon" && waxing);
  const refs: Json = {};
  for (const [name, sign] of [["lagna", c.lagnaSign], ["sun", c.sunSign], ["moon", c.moonSign]] as [string, number][]) {
    const fifth = (sign + 4) % 12;
    const planets = SEVEN.filter((g) => fact(c, g).sign === fifth);
    refs[name] = { fifth_house_sign: fifth + 1, planets, benefics: planets.filter(benefic) };
  }
  return {
    source: "B.V. Raman, Three Hundred Important Combinations",
    combination: 74,
    definition: "All planets in 5th from Lagna, Sun, and Moon.",
    benefic_rule: "Jupiter, Venus, Mercury; the Moon when waxing (0–180° ahead of the Sun)",
    reference_evaluations: refs,
    literal_interpretation: "requires_source_verification",
    verification_status: "interpretation_pending",
  };
}

const nature = (polarity: string) => (polarity === "benefic" ? "auspicious" : polarity === "mixed" ? "mixed" : polarity === "caution" ? "caution" : "inauspicious");

/** `yogas_api`: the rows as the payload lists them. */
export const yogasApi = (rows: YogaRow[]): Json[] =>
  rows.map((y) => ({
    key: y.key, nameEn: y.name, nameNe: y.nameNe, nature: nature(y.polarity), present: y.present, descEn: y.text, descNe: y.textNe,
    ...(y.evaluation ? { evaluation: y.evaluation } : {}),
  }));

