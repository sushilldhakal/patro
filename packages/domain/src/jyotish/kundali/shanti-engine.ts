/** Graha shanti of `/kundali/detail`, made on the device (`graha_shanti` in apps/rust `kundali_detail.rs`). */
import { aspects, DUSTHANA, EN, fact, NE, type Chart, type GrahaKey } from "./chart-facts";

type Json = Record<string, unknown>;
const finding = (step: number, title: [string, string], graha: GrahaKey, remedy: string, reasonNe: string, reasonEn: string, tier: string): Json => ({
  step, stepTitleNe: title[0], stepTitleEn: title[1], graha, grahaNe: NE[graha], remedy, reasonNe, reasonEn, tier,
});

/** The four classical steps, in order. `saturnRashi` is Saturn's 1-based sign now (its transit), or null. */
export function grahaShanti(chart: Chart, saturnRashi: number | null): Json {
  const lordsOf = (houses: number[]) => [...new Set(houses.map((h) => chart.houseLord[h]))];
  const dusthana = lordsOf(DUSTHANA);
  const maraka = lordsOf([2, 7]);
  const benefic = lordsOf([1, 5, 9]);
  // A graha is never conjunct itself (Saturn as a Capricorn/Aquarius Lagnesha).
  const conjunct = (a: GrahaKey, b: GrahaKey) => a !== b && fact(chart, a).house === fact(chart, b).house;
  const findings: Json[] = [];

  const step1: [string, string] = ["महादशा/अन्तर्दशा स्वामी परीक्षण", "Dasha / Antardasha Lord Assessment"];
  if (chart.dasha) {
    const d = chart.dasha;
    const lords = d.antarLord !== d.mahaLord ? [d.mahaLord, d.antarLord] : [d.mahaLord];
    for (const lord of lords) {
      const pf = fact(chart, lord);
      const reasons: [string, string][] = [];
      if (dusthana.includes(lord)) reasons.push(["६, ८ वा १२ भावको स्वामी", "owns house 6, 8 or 12"]);
      if (maraka.includes(lord)) reasons.push(["मारक (२ वा ७ भावको स्वामी)", "a maraka (owns house 2 or 7)"]);
      if (pf.dignity === "debilitated") reasons.push(["नीच राशिमा", "debilitated"]);
      if (pf.combust) reasons.push(["सूर्यसँग अस्त", "combust with the Sun"]);
      if (!reasons.length) continue;
      findings.push(finding(1, step1, lord, "shanti",
        `वर्तमान दशा/अन्तर्दशा स्वामी ${NE[lord]} ${reasons.map((r) => r[0]).join(" र ")} — यसको जप, दान र नवग्रह शान्ति अनिवार्य।`,
        `The current dasha/antardasha lord ${EN[lord]} is ${reasons.map((r) => r[1]).join(" and ")} — its japa, daan and navagraha shanti are mandatory.`,
        "critical"));
    }
  }

  const step2: [string, string] = ["लग्नेश/योगकारक बल परीक्षण", "Lagnesha / Yogakaraka Strength Assessment"];
  for (const g of benefic) {
    const pf = fact(chart, g);
    const weak = (pf.shadbalaRatio !== null && pf.shadbalaRatio < 1) || pf.dignity === "debilitated" || pf.combust;
    if (!weak) continue;
    findings.push(finding(2, step2, g, "strengthen",
      `${NE[g]} लग्नेश/पञ्चमेश/नवमेश भई कमजोर छ — रत्न धारण र मन्त्र पाठद्वारा सबल बनाउनुपर्छ (दान गरिँदैन)।`,
      `${EN[g]}, a Lagnesha/5th/9th lord, is weak — strengthen with a gem and mantra japa (no daan for this planet).`,
      "core"));
  }

  const step3: [string, string] = [
    "राहु/केतु/शनि/मङ्गल/बृहस्पतिद्वारा शुभ ग्रह, चन्द्र वा सूर्यको पीडा परीक्षण",
    "Rahu/Ketu/Saturn/Mars/Jupiter Affliction Check (incl. Vish/Grahan/Angarak/Guru-Chandal Yoga)",
  ];
  const reported: string[] = [];
  const seen = (a: GrahaKey, b: GrahaKey) => reported.includes(`${a}:${b}`);
  const mark = (a: GrahaKey, b: GrahaKey) => reported.push(`${a}:${b}`);
  for (const g of ["rahu", "ketu", "saturn"] as GrahaKey[]) {
    const afflicted = benefic.find((b) => conjunct(g, b));
    if (!afflicted) continue;
    mark(g, afflicted);
    findings.push(finding(3, step3, g, "pacify",
      `${NE[g]} लग्नेश/पञ्चमेश/नवमेश ${NE[afflicted]}सँग एउटै भावमा युति गरी पीडित गरिरहेको छ — यसको वैदिक जप, हवन र दानद्वारा शान्त गर्नुपर्छ (रत्न कहिल्यै लगाइँदैन)।`,
      `${EN[g]} is conjunct ${EN[afflicted]} (Lagnesha/5th/9th lord) in the same house, afflicting it — pacify with Vedic japa, homa and daan (never wear this planet's gem).`,
      afflicted === "sun" || afflicted === "moon" ? "critical" : "core"));
  }
  const moon = fact(chart, "moon");
  if (conjunct("saturn", "moon") || aspects(chart, "saturn", moon.house)) {
    if (!seen("saturn", "moon")) {
      mark("saturn", "moon");
      findings.push(finding(3, step3, "saturn", "pacify",
        "शनि र चन्द्रको युति/दृष्टिले विष योग बनेको छ (मानसिक अशान्ति, चिन्ता, ढिलाइ) — शनिको वैदिक जप, हवन र दानद्वारा शान्ति गर्नुपर्छ (रत्न कहिल्यै लगाइँदैन)।",
        "Saturn's conjunction or aspect on the Moon forms Vish Yoga (mental unrest, anxiety, delays) — pacify Saturn with japa, homa and daan (never wear its gem).",
        "critical"));
    }
    findings.push(finding(3, step3, "moon", "soothe",
      "शनिसँगको विष योगले चन्द्र (मन) पीडित भएको छ — चन्द्रको जप र रुद्राभिषेकद्वारा शान्ति गर्नुपर्छ।",
      "Saturn's Vish Yoga is afflicting the Moon (the mind) — soothe it with Moon japa and Rudrabhishek.",
      "critical"));
  }
  for (const node of ["rahu", "ketu"] as GrahaKey[]) {
    for (const lum of ["sun", "moon"] as GrahaKey[]) {
      if (!conjunct(node, lum)) continue;
      if (!seen(node, lum)) {
        mark(node, lum);
        findings.push(finding(3, step3, node, "pacify",
          `${NE[node]}ले ${NE[lum]}सँग ग्रहण योग बनाएको छ — ${NE[node]}को वैदिक जप, हवन र दानद्वारा शान्ति गर्नुपर्छ (रत्न कहिल्यै लगाइँदैन)।`,
          `${EN[node]}'s conjunction with ${EN[lum]} forms Grahan (eclipse) Yoga — pacify ${EN[node]} with japa, homa and daan (never wear its gem).`,
          "critical"));
      }
      findings.push(finding(3, step3, lum, "soothe",
        `${NE[node]}सँगको ग्रहण योगले ${NE[lum]} पीडित भएको छ — यसको आफ्नै शान्ति/जपद्वारा सुधार्नुपर्छ।`,
        `${EN[node]}'s Grahan Yoga is afflicting ${EN[lum]} — soothe it with its own japa and shanti.`,
        "critical"));
    }
  }
  if (conjunct("mars", "rahu")) {
    if (!seen("rahu", "mars")) {
      mark("rahu", "mars");
      findings.push(finding(3, step3, "rahu", "pacify",
        "राहु र मङ्गलको युतिले अङ्गारक योग बनेको छ (दुर्घटना, आवेश, विवाद) — राहुको वैदिक जप, हवन र दानद्वारा शान्ति गर्नुपर्छ (रत्न कहिल्यै लगाइँदैन)।",
        "Rahu's conjunction with Mars forms Angarak Yoga (accidents, impulsiveness, disputes) — pacify Rahu with japa, homa and daan (never wear its gem).",
        "core"));
    }
    findings.push(finding(3, step3, "mars", "soothe",
      "अङ्गारक योगले मङ्गल पीडित/उग्र भएको छ — मङ्गलको जप र दानद्वारा सुधार्नुपर्छ।",
      "Angarak Yoga leaves Mars afflicted and volatile — soothe it with its own japa and daan.",
      "core"));
  }
  if (conjunct("jupiter", "rahu")) {
    if (!seen("rahu", "jupiter")) {
      mark("rahu", "jupiter");
      findings.push(finding(3, step3, "rahu", "pacify",
        "राहु र बृहस्पतिको युतिले गुरु-चाण्डाल योग बनेको छ (सल्लाह/नैतिकतामा भ्रम) — राहुको वैदिक जप, हवन र दानद्वारा शान्ति गर्नुपर्छ (रत्न कहिल्यै लगाइँदैन)।",
        "Rahu's conjunction with Jupiter forms Guru-Chandal Yoga (confused judgement/ethics) — pacify Rahu with japa, homa and daan (never wear its gem).",
        "core"));
    }
    findings.push(finding(3, step3, "jupiter", "soothe",
      "गुरु-चाण्डाल योगले बृहस्पति पीडित भएको छ — बृहस्पतिको जप र दानद्वारा सुधार्नुपर्छ।",
      "Guru-Chandal Yoga leaves Jupiter afflicted — soothe it with its own japa and daan.",
      "core"));
  }

  const step4: [string, string] = ["शनिको गोचर (साढेसाती/ढैया/अष्टम)", "Saturn's Transit (Sade Sati / Dhaiya / 8th-from-Lagna)"];
  if (saturnRashi !== null) {
    const fromMoon = ((saturnRashi + 12 - (chart.moonSign + 1)) % 12) + 1;
    const fromLagna = ((saturnRashi + 12 - (chart.lagnaSign + 1)) % 12) + 1;
    const phase: [string, string] | null =
      fromMoon === 12 ? ["साढेसातीको पहिलो ढैया", "First phase of Sade Sati"]
      : fromMoon === 1 ? ["साढेसातीको उत्कर्ष (चन्द्र राशिमाथि)", "Peak phase of Sade Sati (over natal Moon)"]
      : fromMoon === 2 ? ["साढेसातीको अन्तिम ढैया", "Final phase of Sade Sati"]
      : fromMoon === 4 ? ["कण्टक शनि (चतुर्थ ढैया)", "Kantak Shani (4th-from-Moon Dhaiya)"]
      : fromMoon === 8 ? ["अर्धाष्टम शनि (अष्टम ढैया)", "Ardhashtama Shani (8th-from-Moon Dhaiya)"]
      : fromLagna === 8 ? ["लग्नबाट अष्टम शनि गोचर", "Saturn transiting the 8th from Lagna"]
      : null;
    if (phase) {
      findings.push(finding(4, step4, "saturn", "pacify_transit",
        `शनि हाल ${phase[0]} अवस्थामा गोचर गरिरहेका छन् — शमी समिधा हवन, तोरीको तेल दान र जपद्वारा शान्ति गर्नुपर्छ।`,
        `Saturn is currently transiting in ${phase[1]} — pacify with Shami-wood homa, mustard-oil daan and japa.`,
        "critical"));
    }
  }
  return { findings };
}
