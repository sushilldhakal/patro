/**
 * The worked mathematics under the older moving figures of chapters 1 and 2.
 * Each function takes the same loop time t as its figure, so the numbers
 * here move with the drawing. copy-ok-file
 */
import { grp, sighraParts } from "./surya-classical";
import { dms, fmt, L, num, SURYA_SINES, suryaArc, suryaJya, tri, TRIJYA, wrap, type Lang, type MathPart, type Step } from "./surya-kit";

const fr = (n: string, d: string): MathPart => ({ n, d });

function timeUnits(t: number, lang: Lang): Step[] {
  const total = Math.floor(t * 21600);
  const g = Math.floor(total / 360);
  const p = Math.floor((total % 360) / 6);
  const pr = total % 6;
  const secs = total * 4;
  const hh = Math.floor(secs / 3600);
  const mm = Math.floor((secs % 3600) / 60);
  const ss = secs % 60;
  const two = (v: number) => num(lang, String(v).padStart(2, "0"));
  return [
    { say: L(lang, "एक अहोरात्रमा प्राण (१.११–१२)", "Prāṇas in a day (1.11–12)"), eq: [`${num(lang, 60)} × ${num(lang, 60)} × ${num(lang, 6)} = ${grp(lang, 21600)} ${L(lang, "प्राण", "prāṇa")}`] },
    { say: L(lang, "घडीले देखाएको समयलाई प्राणमा", "The time on the dial in prāṇas"), eq: [`${num(lang, g)} × ${num(lang, 360)} + ${num(lang, p)} × ${num(lang, 6)} + ${num(lang, pr)} = ${grp(lang, total)}`] },
    { say: L(lang, "एक प्राण = ४ नाक्षत्र सेकेन्ड", "One prāṇa is 4 sidereal seconds"), eq: [`${grp(lang, total)} × ${num(lang, 4)} = ${grp(lang, secs)} ${L(lang, "सेकेन्ड", "s")} = ${two(hh)}:${two(mm)}:${two(ss)}`] },
    {
      say: L(lang, "भचक्रको कला पनि त्यति नै: एक प्राणमा आकाश एक कला घुम्छ", "The zodiac has as many minutes of arc: the sky turns one minute in one prāṇa"),
      eq: [`${num(lang, 360)} × ${num(lang, 60)} = ${grp(lang, 21600)} ${L(lang, "कला", "′")}`],
    },
  ];
}

const YUGA_PARTS: [string, string, number][] = [
  ["कृत", "Kṛta", 4],
  ["त्रेता", "Tretā", 3],
  ["द्वापर", "Dvāpara", 2],
  ["कलि", "Kali", 1],
];

function yuga(t: number, lang: Lang): Step[] {
  let at = t * 10;
  let which = YUGA_PARTS[0]!;
  for (const part of YUGA_PARTS) {
    which = part;
    if (at < part[2]) break;
    at -= part[2];
  }
  const years = (4320000 * which[2]) / 10;
  return [
    { say: L(lang, "महायुग = १२००० दिव्य वर्ष, एक दिव्य वर्ष = ३६० मानव वर्ष (१.१४–१५)", "Mahāyuga = 12,000 divine years of 360 human years (1.14–15)"), eq: [`${grp(lang, 12000)} × ${num(lang, 360)} = ${grp(lang, 4320000)}`] },
    {
      say: L(lang, "दशांशलाई ४, ३, २, १ ले गुण्दा चार युग (१.१७)", "A tenth of it times 4, 3, 2, 1 gives the four ages (1.17)"),
      eq: [`${L(lang, which[0], which[1])} = `, fr(grp(lang, 4320000), num(lang, 10)), ` × ${num(lang, which[2])} = ${grp(lang, years)}`],
    },
    {
      say: L(lang, "सन्धि: युगको छैटौँ भाग, आधा आदिमा (सन्ध्या) आधा अन्त्यमा (सन्ध्यांश)", "Twilight: a sixth of the age, half at the start, half at the end"),
      eq: [fr(grp(lang, years), num(lang, 6)), ` = ${grp(lang, years / 6)} → ${grp(lang, years / 12)} + ${grp(lang, years / 12)}`],
    },
    { say: L(lang, "जाँच: चारै युगको योग", "Check: the four ages add up"), eq: [`${grp(lang, 1728000)} + ${grp(lang, 1296000)} + ${grp(lang, 864000)} + ${grp(lang, 432000)} = ${grp(lang, 4320000)}`] },
  ];
}

const CIVIL = 1577917828;

function meanMotion(t: number, lang: Lang): Step[] {
  const days = Math.round(t * 3 * 365.2588);
  const sunRev = (4320000 * days) / CIVIL;
  const moonRev = (57753336 * days) / CIVIL;
  const sunDay = (4320000 * 21600) / CIVIL;
  const moonDay = (57753336 * 21600) / CIVIL;
  const frac = (v: number) => v - Math.floor(v);
  return [
    { say: L(lang, "कुदिन = नक्षत्रका उदय − सूर्यका भगण (१.३४, १.३९)", "Civil days = star risings − the sun's revolutions (1.34, 1.39)"), eq: [`${grp(lang, 1582237828)} − ${grp(lang, 4320000)} = ${grp(lang, CIVIL)}`] },
    {
      say: L(lang, "सूर्यको दैनिक मध्यम गति", "The sun's mean daily motion"),
      eq: [fr(`${grp(lang, 4320000)} × ${grp(lang, 21600)}′`, grp(lang, CIVIL)), ` = ${fmt(lang, sunDay, 2)}′ = ${L(lang, "५९′८″", "59′8″")}`],
    },
    { say: L(lang, "चन्द्रको दैनिक मध्यम गति", "The moon's mean daily motion"), eq: [fr(`${grp(lang, 57753336)} × ${grp(lang, 21600)}′`, grp(lang, CIVIL)), ` = ${fmt(lang, moonDay, 1)}′ = ${L(lang, "७९०′३५″", "790′35″")}`] },
    {
      say: L(lang, "चित्रको अहर्गणमा सूर्य (१.५३)", "The sun at the drawing's day count (1.53)"),
      eq: [fr(`${grp(lang, days)} × ${grp(lang, 4320000)}`, grp(lang, CIVIL)), ` = ${fmt(lang, sunRev, 4)} → ${fmt(lang, frac(sunRev), 4)} × ${num(lang, 360)}° = ${dms(lang, frac(sunRev) * 360)}`],
    },
    {
      say: L(lang, "त्यही दिनमा चन्द्र", "The moon on the same day"),
      eq: [fr(`${grp(lang, days)} × ${grp(lang, 57753336)}`, grp(lang, CIVIL)), ` = ${fmt(lang, moonRev, 4)} → ${dms(lang, wrap(frac(moonRev) * 360))}`],
    },
  ];
}

function earthSize(t: number, lang: Lang): Step[] {
  const lat = tri(t) * 60;
  const lj = suryaJya(90 - lat);
  const local = (5059 * lj) / TRIJYA;
  return [
    { say: L(lang, "व्यास: ८०० योजनको दोब्बर (१.५९)", "Diameter: twice 800 yojanas (1.59)"), eq: [`${num(lang, 2)} × ${num(lang, 800)} = ${num(lang, 1600)} ${L(lang, "योजन", "yojanas")}`] },
    {
      say: L(lang, "परिधि: व्यासको वर्गलाई १० ले गुणेर वर्गमूल, अर्थात् π ≈ √१०", "Girth: square root of 10 × diameter², that is π ≈ √10"),
      eq: [`√(${num(lang, 10)} × ${grp(lang, 2560000)}) = √${grp(lang, 25600000)} = ${fmt(lang, Math.sqrt(25600000), 1)}`],
    },
    { say: L(lang, "√१० र आधुनिक π", "√10 against the modern π"), eq: [`√${num(lang, 10)} = ${fmt(lang, Math.sqrt(10), 4)} · π = ${fmt(lang, Math.PI, 4)}`] },
    { say: L(lang, "चित्रको अक्षांशमा लम्बज्या", "Co-latitude sine at the drawing's latitude"), eq: [`${L(lang, "ज्या", "sin")}(${num(lang, 90)}° − ${dms(lang, lat)}) = ${fmt(lang, lj)}`] },
    { say: L(lang, "स्फुट परिधि (१.६०)", "True girth there (1.60)"), eq: [fr(`${num(lang, 5059)} × ${fmt(lang, lj)}`, num(lang, TRIJYA)), ` = ${fmt(lang, local)} ${L(lang, "योजन", "yojanas")}`] },
  ];
}

function sineTable(t: number, lang: Lang): Step[] {
  const step = Math.min(23, Math.floor(tri(t) * 24));
  const n = step + 1;
  const jya = SURYA_SINES[step]!;
  const prevJ = step === 0 ? 0 : SURYA_SINES[step - 1]!;
  const prevPrevJ = step <= 1 ? 0 : SURYA_SINES[step - 2]!;
  const prevDiff = prevJ - prevPrevJ;
  const out: Step[] = [
    { say: L(lang, "त्रिज्या: वृत्तको परिधि २१६०० कला, त्यसैले त्रिज्या", "Radius: a circle of 21,600 minutes has radius"), eq: [fr(grp(lang, 21600), "2π"), ` = ${fmt(lang, 21600 / (2 * Math.PI), 1)} ≈ ${num(lang, TRIJYA)}`] },
    { say: L(lang, "पहिलो ज्या: राशिको ८औँ भाग (२.१५)", "First sine: an eighth of a sign (2.15)"), eq: [fr(grp(lang, 1800), num(lang, 8)), ` = ${num(lang, 225)}′`] },
    { say: L(lang, `${num(lang, n)}औँ चाप`, `Arc no. ${n}`), eq: [`${num(lang, n)} × ${num(lang, 225)}′ = ${grp(lang, n * 225)}′ = ${dms(lang, n * 3.75)}`] },
  ];
  if (step >= 1) {
    const pinda = step === 1 ? 225 : prevDiff;
    const sub = prevJ / 225;
    out.push({
      say: L(lang, "अर्को खण्ड: अघिल्लो खण्डबाट (अहिलेसम्मको ज्या ÷ २२५) घटाउने (२.१६)", "Next difference: the last one less (sine so far ÷ 225) (2.16)"),
      eq: [`${L(lang, "खण्ड", "Δ")} = ${num(lang, pinda)} − `, fr(num(lang, prevJ), num(lang, 225)), ` = ${num(lang, pinda)} − ${fmt(lang, sub, 2)} ≈ ${num(lang, jya - prevJ)}`],
    });
    out.push({ say: L(lang, "ज्या = अघिल्लो ज्या + खण्ड", "Sine = previous sine + difference"), eq: [`${num(lang, prevJ)} + ${num(lang, jya - prevJ)} = ${num(lang, jya)}`] });
  }
  out.push({ say: L(lang, "आधुनिक जाँच", "Modern check"), eq: [`${num(lang, TRIJYA)} × sin ${dms(lang, n * 3.75)} = ${fmt(lang, TRIJYA * Math.sin((n * 3.75 * Math.PI) / 180), 1)}`] });
  return out;
}

function declination(t: number, lang: Lang): Step[] {
  const lon = t * 360;
  const jl = suryaJya(lon);
  const jd = (jl * 1397) / TRIJYA;
  const dec = suryaArc(jd);
  return [
    { say: L(lang, "परम क्रान्ति २४° को ज्या (२.२८)", "Sine of the greatest declination, 24° (2.28)"), eq: [`${L(lang, "ज्या", "sin")} ${num(lang, 24)}° = ${num(lang, 1397)}`] },
    { say: L(lang, "सूर्यको भुजज्या", "Sine of the sun's longitude"), eq: [`${L(lang, "ज्या", "sin")} ${dms(lang, lon)} = ${fmt(lang, jl)}`] },
    { say: L(lang, "क्रान्तिज्या = भुजज्या × १३९७ ÷ त्रिज्या", "Sine of declination = that × 1397 ÷ radius"), eq: [fr(`${fmt(lang, jl)} × ${num(lang, 1397)}`, num(lang, TRIJYA)), ` = ${fmt(lang, jd)}`] },
    { say: L(lang, "ज्यापिण्डबाट चाप लिँदा क्रान्ति", "Its arc from the table is the declination"), eq: [`δ = ${dms(lang, Math.abs(dec))} ${dec >= 0 ? L(lang, "उत्तर", "north") : L(lang, "दक्षिण", "south")}`] },
  ];
}

function manda(t: number, lang: Lang): Step[] {
  const k = t * 360;
  const bj = suryaJya(k);
  const p = 14 - (20 / 60) * (Math.abs(bj) / TRIJYA);
  const bhuja = (bj * p) / 360;
  const phala = suryaArc(bhuja);
  return [
    { say: L(lang, "मन्दकेन्द्र = मध्यम सूर्य − मन्दोच्च (२.२९)", "Manda anomaly = mean sun − apogee (2.29)"), eq: [`κ = ${dms(lang, k)}`] },
    {
      say: L(lang, "स्फुट परिधि: सम पदान्तमा १४°, विषम पदान्तमा १३°४०′ (२.३४, २.३८)", "True epicycle: 14° at even quadrant ends, 13°40′ at odd (2.34, 2.38)"),
      eq: [`p = ${num(lang, 14)}° − `, fr(`${L(lang, "२०′", "20′")} × ${fmt(lang, Math.abs(bj))}`, num(lang, TRIJYA)), ` = ${dms(lang, p)}`],
    },
    { say: L(lang, "भुजफल (२.३९)", "Bhujaphala (2.39)"), eq: [fr(`${fmt(lang, bj)} × ${fmt(lang, p, 3)}`, num(lang, 360)), ` = ${fmt(lang, bhuja, 1)}`] },
    {
      say: L(lang, "मन्दफल = भुजफलको चाप; केन्द्र मेषादि ६ राशिमा भए घटाउने (२.४५)", "Equation = arc of bhujaphala; subtract when κ is in the first six signs (2.45)"),
      eq: [`${dms(lang, Math.abs(phala))} ${k < 180 ? "−" : "+"}`],
    },
  ];
}

function sighra(t: number, lang: Lang): Step[] {
  const k = t * 360;
  const s = sighraParts(k, 235, 232);
  const prev = sighraParts(k - 2, 235, 232).phala;
  const motion = 2 + (s.phala - prev);
  return [
    { say: L(lang, "शीघ्रकेन्द्र (मङ्गल)", "Śīghra anomaly (Mars)"), eq: [`κ = ${dms(lang, k)} · p = ${fmt(lang, s.p, 1)}°`] },
    { say: L(lang, "भुजफल र कोटिफल", "Bhujaphala and kotiphala"), eq: [fr(`${fmt(lang, s.bj)} × ${fmt(lang, s.p, 1)}`, num(lang, 360)), ` = ${fmt(lang, s.bhuja, 1)} · `, fr(`${fmt(lang, s.kj)} × ${fmt(lang, s.p, 1)}`, num(lang, 360)), ` = ${fmt(lang, s.koti, 1)}`] },
    { say: L(lang, "कर्ण", "Hypotenuse"), eq: [`√((${num(lang, TRIJYA)} ${s.koti >= 0 ? "+" : "−"} ${fmt(lang, Math.abs(s.koti), 1)})² + ${fmt(lang, Math.abs(s.bhuja), 1)}²) = ${fmt(lang, s.karna, 1)}`] },
    { say: L(lang, "शीघ्रफल", "The correction"), eq: [fr(`${fmt(lang, s.bhuja, 1)} × ${num(lang, TRIJYA)}`, fmt(lang, s.karna, 1)), ` = ${fmt(lang, s.phalaJya, 1)} → ${dms(lang, Math.abs(s.phala))}`] },
    {
      say: L(lang, "केन्द्र २° बढ्दा फल कति फेरियो? ऋणात्मक भए ग्रह वक्री (२.५२–५५)", "How much did the correction change for 2° of κ? Negative means retrograde (2.52–55)"),
      eq: [`${num(lang, 2)}° + (${dms(lang, s.phala)} − ${dms(lang, prev)}) = ${fmt(lang, motion, 2)}° → ${motion < 0 ? L(lang, "वक्री", "retrograde") : L(lang, "मार्गी", "direct")}`],
    },
  ];
}

function dayLength(t: number, lang: Lang): Step[] {
  const lon = t * 360;
  const palabha = 6.3;
  const jd = (suryaJya(lon) * 1397) / TRIJYA;
  const dyujya = Math.sqrt(TRIJYA ** 2 - jd ** 2);
  const kujya = (jd * palabha) / 12;
  const charaJya = (kujya * TRIJYA) / dyujya;
  const chara = suryaArc(charaJya);
  const day = 30 + (2 * chara) / 6;
  return [
    { say: L(lang, "क्रान्तिज्या", "Sine of declination"), eq: [fr(`${fmt(lang, suryaJya(lon))} × ${num(lang, 1397)}`, num(lang, TRIJYA)), ` = ${fmt(lang, jd)}`] },
    { say: L(lang, "द्युज्या: दिनवृत्तको त्रिज्या (२.६०)", "Day-radius (2.60)"), eq: [`√(${num(lang, TRIJYA)}² − ${fmt(lang, Math.abs(jd))}²) = ${fmt(lang, dyujya)}`] },
    { say: L(lang, "कुज्या: क्रान्तिज्या × पलभा ÷ १२ (२.६१)", "Earth-sine: decl. sine × equinoctial shadow ÷ 12 (2.61)"), eq: [fr(`${fmt(lang, jd)} × ${fmt(lang, palabha, 1)}`, num(lang, 12)), ` = ${fmt(lang, kujya, 1)}`] },
    { say: L(lang, "चरज्या", "Sine of the ascensional difference"), eq: [fr(`${fmt(lang, kujya, 1)} × ${num(lang, TRIJYA)}`, fmt(lang, dyujya)), ` = ${fmt(lang, charaJya, 1)} → ${dms(lang, chara)}`] },
    {
      say: L(lang, "दिनमान: ६° = १ घटी, उत्तर क्रान्तिमा जोड्ने (२.६२–६३)", "Day length: 6° = 1 ghaṭī, added for north declination (2.62–63)"),
      eq: [`${num(lang, 30)} ${chara >= 0 ? "+" : "−"} `, fr(`${num(lang, 2)} × ${dms(lang, Math.abs(chara))}`, num(lang, 6)), ` = ${fmt(lang, day, 2)} ${L(lang, "घटी", "ghaṭī")}`],
    },
  ];
}


// ---------------------------------------------------------------- chapters 3–14

function gnomon(t: number, lang: Lang): Step[] {
  const z = 10 + tri(t) * 65;
  const jz = suryaJya(z);
  const jc = suryaJya(90 - z);
  const shadow = (12 * jz) / jc;
  const karna = Math.sqrt(144 + shadow * shadow);
  return [
    { say: L(lang, "सूर्यको नतांश (शिरोबिन्दुबाट दूरी)", "The sun's zenith distance"), eq: [`z = ${dms(lang, z)} · ${L(lang, "उन्नतांश", "altitude")} = ${dms(lang, 90 - z)}`] },
    { say: L(lang, "छाया = शङ्कु × नतांशज्या ÷ उन्नतांशज्या", "Shadow = gnomon × sine of z ÷ its cosine"), eq: [fr(`${num(lang, 12)} × ${fmt(lang, jz)}`, fmt(lang, jc)), ` = ${fmt(lang, shadow, 2)} ${L(lang, "अङ्गुल", "digits")}`] },
    { say: L(lang, "छायाकर्ण: समकोण त्रिभुजको कर्ण", "Hypotenuse of the shadow"), eq: [`√(${num(lang, 12)}² + ${fmt(lang, shadow, 2)}²) = ${fmt(lang, karna, 2)}`] },
    { say: L(lang, "उल्टो: छायाबाट नतांश", "Back again: the zenith distance from the shadow"), eq: [`${L(lang, "ज्या", "sin")} z = `, fr(`${fmt(lang, shadow, 2)} × ${num(lang, TRIJYA)}`, fmt(lang, karna, 2)), ` = ${fmt(lang, (shadow * TRIJYA) / karna)}`] },
    { say: L(lang, "विषुव मध्याह्नमा नतांश = अक्षांश; काठमाडौँको पलभा", "At an equinox noon z is the latitude; Kathmandu's equinoctial shadow"), eq: [`${num(lang, 12)} × tan ${dms(lang, 27.7)} = ${fmt(lang, 12 * Math.tan((27.7 * Math.PI) / 180), 2)} ${L(lang, "अङ्गुल", "digits")}`] },
  ];
}

function lunarEclipse(t: number, lang: Lang): Step[] {
  const moon = 32;
  const shadow = 81;
  const beta = 22;
  const half = (moon + shadow) / 2;
  const along = (t - 0.5) * 140;
  const dist = Math.sqrt(along * along + beta * beta);
  const grasa = Math.max(0, half - dist);
  const sthiti = (60 * Math.sqrt(half * half - beta * beta)) / (790.58 - 59.14);
  return [
    { say: L(lang, "मानार्धयोग: चन्द्रबिम्ब र भूछायाको आधा योग", "Half the sum of the moon and the shadow"), eq: [fr(`${num(lang, moon)}′ + ${num(lang, shadow)}′`, num(lang, 2)), ` = ${fmt(lang, half, 1)}′`] },
    { say: L(lang, "चित्रको क्षणमा केन्द्रबीचको दूरी", "Distance of the centres at the drawing's moment"), eq: [`√(${fmt(lang, Math.abs(along), 1)}² + ${num(lang, beta)}²) = ${fmt(lang, dist, 1)}′`] },
    { say: L(lang, "ग्रास = मानार्धयोग − दूरी (मध्यमा दूरी = शर)", "Covered = half-sum − distance (at the middle the distance is the latitude)"), eq: [`${fmt(lang, half, 1)} − ${fmt(lang, dist, 1)} = ${fmt(lang, grasa, 1)}′ ${grasa >= moon ? L(lang, "→ पूर्ण", "→ total") : ""}`] },
    {
      say: L(lang, "स्थित्यर्ध: स्पर्शदेखि मध्यसम्मको समय", "Half-duration: contact to middle"),
      eq: [fr(`${num(lang, 60)} × √(${fmt(lang, half, 1)}² − ${num(lang, beta)}²)`, `${L(lang, "७९०.६ − ५९.१", "790.6 − 59.1")}`), ` = ${fmt(lang, sthiti, 2)} ${L(lang, "घटी", "ghaṭī")}`],
    },
    { say: L(lang, "भाजक: चन्द्र र सूर्यको दैनिक गतिको अन्तर", "Divisor: the moon's daily motion less the sun's"), eq: [`${L(lang, "७९०′३५″ − ५९′८″", "790′35″ − 59′8″")} = ${fmt(lang, 790.58 - 59.14, 1)}′`] },
    {
      say: L(lang, "विमर्दार्ध (पूर्ण ग्रासको आधा अवधि): मानान्तरार्ध शरभन्दा ठूलो भए मात्र (४.१२–१३)", "Half the total phase: only when half the difference exceeds the latitude (4.12–13)"),
      eq: [`${L(lang, "मानान्तरार्ध", "half-difference")} = `, fr(`${num(lang, shadow)} − ${num(lang, moon)}`, num(lang, 2)), ` = ${fmt(lang, (shadow - moon) / 2, 1)}′ → `, fr(`${num(lang, 60)} × √(${fmt(lang, (shadow - moon) / 2, 1)}² − ${num(lang, beta)}²)`, fmt(lang, 790.58 - 59.14, 1)), ` = ${fmt(lang, (60 * Math.sqrt(((shadow - moon) / 2) ** 2 - beta * beta)) / (790.58 - 59.14), 2)} ${L(lang, "घटी", "ghaṭī")}`],
    },
  ];
}

function parallax(t: number, lang: Lang): Step[] {
  const alt = tri(t) * 90;
  const radius = 324000 / (2 * Math.PI);
  const horiz = (Math.asin(800 / radius) * 180) / Math.PI;
  const p = horiz * Math.cos((alt * Math.PI) / 180);
  return [
    { say: L(lang, "चन्द्रकक्षाको त्रिज्या (कक्षा ३२४००० योजन)", "Radius of the moon's orbit (orbit 324,000 yojanas)"), eq: [fr(grp(lang, 324000), "2π"), ` = ${grp(lang, radius)} ${L(lang, "योजन", "yojanas")}`] },
    { say: L(lang, "क्षितिजमा परम लम्बन: पृथ्वीको अर्धव्यास ८०० ले देखाउने कोण", "Horizontal parallax: the angle the earth's radius of 800 makes"), eq: [`${L(lang, "चाप", "arcsin")}(`, fr(num(lang, 800), grp(lang, radius)), `) = ${fmt(lang, horiz * 60, 1)}′`] },
    { say: L(lang, "पाठको सजिलो नियम: परम लम्बन = दैनिक गति ÷ १५", "The text's short rule: greatest parallax = daily motion ÷ 15"), eq: [fr(L(lang, "७९०′३५″", "790′35″"), num(lang, 15)), ` = ${fmt(lang, 790.58 / 15, 1)}′`] },
    { say: L(lang, "चित्रको उन्नतांशमा लम्बन = परम × उन्नतांशको कोटिज्या", "At the drawing's altitude: greatest × cosine of altitude"), eq: [`${fmt(lang, horiz * 60, 1)}′ × cos ${dms(lang, alt)} = ${fmt(lang, p * 60, 1)}′`] },
  ];
}

function solarEclipse(t: number, lang: Lang): Step[] {
  const sun = 32.4;
  const moon = 31.6;
  const beta = 9;
  const along = (t - 0.5) * 90;
  const dist = Math.sqrt(along * along + beta * beta);
  const grasa = Math.max(0, (sun + moon) / 2 - dist);
  return [
    { say: L(lang, "मानार्धयोग", "Half the sum of the discs"), eq: [fr(`${fmt(lang, sun, 1)}′ + ${fmt(lang, moon, 1)}′`, num(lang, 2)), ` = ${fmt(lang, (sun + moon) / 2, 1)}′`] },
    { say: L(lang, "लम्बनले सुधारेको शर र केन्द्रको दूरी", "Latitude corrected for parallax, and the distance of centres"), eq: [`√(${fmt(lang, Math.abs(along), 1)}² + ${num(lang, beta)}²) = ${fmt(lang, dist, 1)}′`] },
    { say: L(lang, "ग्रास", "Covered part"), eq: [`${fmt(lang, (sun + moon) / 2, 1)} − ${fmt(lang, dist, 1)} = ${fmt(lang, grasa, 1)}′`] },
    { say: L(lang, "अङ्गुलमा: सूर्यबिम्ब = १२ अङ्गुल", "In digits: the sun's disc is 12 digits"), eq: [fr(`${fmt(lang, grasa, 1)} × ${num(lang, 12)}`, fmt(lang, sun, 1)), ` = ${fmt(lang, (grasa * 12) / sun, 1)} ${L(lang, "अङ्गुल", "digits")}`] },
  ];
}

function projection(t: number, lang: Lang): Step[] {
  const R = 56.5;
  const b1 = (24 * R) / 62;
  const b2 = (8 * R) / 62;
  const x1 = Math.sqrt(R * R - b1 * b1);
  const x2 = Math.sqrt(R * R - b2 * b2);
  const x = -x1 + (x1 + x2) * t;
  const y = b1 + (b2 - b1) * t;
  return [
    { say: L(lang, "छेद्यकको वृत्त: अर्धव्यास = मानार्धयोग", "The projection's circle: radius = half-sum of the discs"), eq: [`R = ${fmt(lang, R, 1)}′`] },
    { say: L(lang, "स्पर्शको बिन्दु: शरलाई ठाडो, बाँकी पूर्व–पश्चिम", "The contact point: latitude upright, the rest east–west"), eq: [`√(${fmt(lang, R, 1)}² − ${fmt(lang, b1, 1)}²) = ${fmt(lang, x1, 1)}′ ${L(lang, "पश्चिम", "west")}`] },
    { say: L(lang, "मोक्षको बिन्दु", "The release point"), eq: [`√(${fmt(lang, R, 1)}² − ${fmt(lang, b2, 1)}²) = ${fmt(lang, x2, 1)}′ ${L(lang, "पूर्व", "east")}`] },
    { say: L(lang, "दुई बिन्दु जोडेको रेखा ग्राहकको मार्ग; चित्रको क्षणमा केन्द्रको दूरी", "The line through them is the path; distance of centres now"), eq: [`√(${fmt(lang, x, 1)}² + ${fmt(lang, y, 1)}²) = ${fmt(lang, Math.hypot(x, y), 1)}′`] },
  ];
}

function conjunction(t: number, lang: Lang): Step[] {
  const a = { lon: 100 + t * 8, lat: 1.2 };
  const b = { lon: 108 - t * 4, lat: -0.6 };
  const gap = Math.abs(a.lon - b.lon);
  const latGap = Math.abs(a.lat - b.lat);
  const sep = Math.hypot(gap, latGap);
  return [
    { say: L(lang, "भोगान्तर", "Difference of longitude"), eq: [`|${dms(lang, a.lon)} − ${dms(lang, b.lon)}| = ${dms(lang, gap)}`] },
    { say: L(lang, "शरान्तर: एउटा उत्तर, अर्को दक्षिण भए जोड्ने", "Difference of latitude: added when one is north, one south"), eq: [`${dms(lang, a.lat)} + ${dms(lang, Math.abs(b.lat))} = ${dms(lang, latGap)}`] },
    { say: L(lang, "बिम्बबीचको दूरी", "Distance between the discs"), eq: [`√(${dms(lang, gap)}² + ${dms(lang, latGap)}²) = ${dms(lang, sep)}`] },
    { say: L(lang, "युति: भोग बराबर हुने समय, एउटा वक्री भएकाले गति जोडिन्छ", "Conjunction: when longitudes are equal; one is retrograde, so the motions add"), eq: [fr(`${num(lang, 8)}° ${L(lang, "भोगान्तर", "gap")}`, `${num(lang, 8)} + ${num(lang, 4)}`), ` = `, fr(num(lang, 2), num(lang, 3)), ` ${L(lang, "चक्र", "of the loop")}`] },
    { say: L(lang, "एक अंशभन्दा नजिक भए ग्रहयुद्ध", "Closer than a degree is a planetary war"), eq: [sep < 1 ? L(lang, "युद्ध", "war") : L(lang, "युद्ध होइन", "no war")] },
  ];
}

function moonPhase(t: number, lang: Lang): Step[] {
  const e = t * 360;
  const digits = e <= 180 ? e / 15 : (360 - e) / 15;
  const lit = (1 - Math.cos((e * Math.PI) / 180)) / 2;
  return [
    { say: L(lang, "चन्द्र र सूर्यको भोगान्तर", "Moon less sun"), eq: [`${dms(lang, e)}`] },
    { say: L(lang, "शुक्ल भाग: हरेक १५° मा एक अङ्गुल, पूर्णिमामा १२", "Bright part: a digit for each 15°, 12 at full moon"), eq: [fr(dms(lang, e <= 180 ? e : 360 - e), num(lang, 15)), ` = ${fmt(lang, digits, 1)} ${L(lang, "अङ्गुल", "digits")}`] },
    { say: L(lang, "आधुनिक: उज्यालो भाग = (१ − cos) ÷ २", "Modern: lit fraction = (1 − cos) ÷ 2"), eq: [fr(`${num(lang, 1)} − cos ${dms(lang, e)}`, num(lang, 2)), ` = ${fmt(lang, lit * 100)}%`] },
    { say: L(lang, "तिथि: भोगान्तर ÷ १२°", "Tithi: the difference ÷ 12°"), eq: [fr(dms(lang, e), `${num(lang, 12)}°`), ` = ${fmt(lang, e / 12, 2)} → ${num(lang, Math.floor(e / 12) + 1)}${L(lang, "औँ तिथि", "th tithi")}`] },
  ];
}

function pata(t: number, lang: Lang): Step[] {
  const sun = 60 + t * 60;
  const moon = 60 + t * 60 * 13.37;
  const sum = wrap(sun + moon);
  const js = (suryaJya(sun) * 1397) / TRIJYA;
  const jm = (suryaJya(moon) * 1397) / TRIJYA;
  return [
    { say: L(lang, "सूर्य र चन्द्रको भोगयोग", "Sum of the longitudes"), eq: [`${dms(lang, wrap(sun))} + ${dms(lang, wrap(moon))} = ${dms(lang, sum)}`] },
    { say: L(lang, "सूर्यको क्रान्तिज्या", "Sun's declination sine"), eq: [fr(`${fmt(lang, suryaJya(sun))} × ${num(lang, 1397)}`, num(lang, TRIJYA)), ` = ${fmt(lang, js)} → ${dms(lang, suryaArc(js))}`] },
    { say: L(lang, "चन्द्रको क्रान्तिज्या", "Moon's declination sine"), eq: [fr(`${fmt(lang, suryaJya(moon))} × ${num(lang, 1397)}`, num(lang, TRIJYA)), ` = ${fmt(lang, jm)} → ${dms(lang, suryaArc(jm))}`] },
    { say: L(lang, "योग १८०° (व्यतीपात) वा ३६०° (वैधृति) मा दुवैको क्रान्ति बराबर", "At a sum of 180° (vyatīpāta) or 360° (vaidhṛti) the declinations are equal"), eq: [`${L(lang, "बाँकी", "to go")}: ${dms(lang, Math.min(Math.abs(180 - sum), 360 - sum, sum))}`] },
  ];
}

function bhugola(t: number, lang: Lang): Step[] {
  const sun = wrap(-360 * t);
  return [
    { say: L(lang, "भूमध्यरेखाका चार पुरी, हरेक ९०° को अन्तरमा", "Four cities on the equator, 90° apart"), eq: [fr(`${num(lang, 360)}°`, num(lang, 4)), ` = ${num(lang, 90)}°`] },
    { say: L(lang, "बीचको दूरी योजनमा", "The distance between them in yojanas"), eq: [fr(num(lang, 5059), num(lang, 4)), ` = ${fmt(lang, 5059 / 4, 1)} ${L(lang, "योजन", "yojanas")}`] },
    { say: L(lang, "समयको अन्तर", "The time between them"), eq: [fr(`${num(lang, 60)} ${L(lang, "घटी", "ghaṭī")}`, num(lang, 4)), ` = ${num(lang, 15)} ${L(lang, "घटी", "ghaṭī")}`] },
    { say: L(lang, "मेरुबाट हेर्दा सूर्य सधैँ क्षितिजमाथि छ महिना", "From Meru the sun stays up for six months"), eq: [`${L(lang, "सूर्यको दिशा", "sun's direction")} ${dms(lang, sun)}`] },
  ];
}

const KAKSHA_STEPS: [string, string, number, number][] = [
  ["चन्द्र", "Moon", 324000, 57753336000],
  ["सूर्य", "Sun", 4331500, 4320000000],
  ["मङ्गल", "Mars", 8146909, 2296832000],
  ["बृहस्पति", "Jupiter", 51375764, 364220000],
  ["शनि", "Saturn", 127668255, 146568000],
];

function kaksha(t: number, lang: Lang): Step[] {
  const [ne, en, y, rev] = KAKSHA_STEPS[Math.min(4, Math.floor(t * 5))]!;
  const sky = 18712080864000000;
  const daily = (324000 * 57753336) / CIVIL;
  return [
    { say: L(lang, "आकाशकक्षा", "The sky's orbit (12.90)"), eq: [`${grp(lang, sky)} ${L(lang, "योजन", "yojanas")}`] },
    { say: L(lang, `${ne}को कक्षा = आकाशकक्षा ÷ कल्पभगण`, `${en}'s orbit = sky ÷ revolutions in a kalpa`), eq: [fr(grp(lang, sky), grp(lang, rev)), ` = ${grp(lang, sky / rev)} ≈ ${grp(lang, y)}`] },
    { say: L(lang, "दैनिक योजन (सबैको बराबर)", "Yojanas a day (the same for all)"), eq: [fr(`${grp(lang, 324000)} × ${grp(lang, 57753336)}`, grp(lang, CIVIL)), ` = ${fmt(lang, daily, 1)}`] },
    { say: L(lang, `${ne}को एक भगण`, `One revolution of ${en}`), eq: [fr(grp(lang, y), fmt(lang, daily, 1)), ` = ${grp(lang, y / daily)} ${L(lang, "दिन", "days")}`] },
  ];
}

function armillary(t: number, lang: Lang): Step[] {
  return [
    { say: L(lang, "ध्रुवको उन्नतांश = अक्षांश", "The pole's altitude = the latitude"), eq: [`${num(lang, 28)}°`] },
    { say: L(lang, "विषुववृत्त क्षितिजसँग लम्बांशमा ढल्किन्छ", "The equator leans from the horizon by the co-latitude"), eq: [`${num(lang, 90)}° − ${num(lang, 28)}° = ${num(lang, 62)}°`] },
    { say: L(lang, "क्रान्तिवृत्त विषुवबाट परम क्रान्ति", "The ecliptic leans from the equator by the greatest declination"), eq: [`${num(lang, 24)}°`] },
    { say: L(lang, "आकाश एक नाक्षत्र दिनमा एक फन्को (६० घटी = ३६०°)", "The sky turns once a sidereal day (60 ghaṭī = 360°)"), eq: [`${dms(lang, t * 360)} = ${fmt(lang, t * 60, 1)} ${L(lang, "घटी", "ghaṭī")}`] },
  ];
}

function measures(t: number, lang: Lang): Step[] {
  const days = t * 365.2588;
  const year = CIVIL / 4320000;
  const month = CIVIL / 53433336;
  return [
    { say: L(lang, "सौर वर्ष = कुदिन ÷ सूर्य भगण", "Solar year = civil days ÷ the sun's revolutions"), eq: [fr(grp(lang, CIVIL), grp(lang, 4320000)), ` = ${fmt(lang, year, 4)} ${L(lang, "दिन", "days")}`] },
    { say: L(lang, "चान्द्र मास = कुदिन ÷ चान्द्र मास संख्या", "Lunar month = civil days ÷ lunar months"), eq: [fr(grp(lang, CIVIL), grp(lang, 53433336)), ` = ${fmt(lang, month, 4)} ${L(lang, "दिन", "days")}`] },
    { say: L(lang, "नाक्षत्र दिन सावन दिनभन्दा छोटो", "A sidereal day is shorter than a civil one"), eq: [fr(grp(lang, CIVIL), grp(lang, 1582237828)), ` × ${num(lang, 60)} = ${fmt(lang, (CIVIL / 1582237828) * 60, 3)} ${L(lang, "घटी", "ghaṭī")}`] },
    { say: L(lang, "चित्रको दिनमा", "At the drawing's day"), eq: [`${fmt(lang, days, 1)} ÷ ${fmt(lang, month, 2)} = ${fmt(lang, days / month, 2)} ${L(lang, "चान्द्र मास", "lunar months")}`] },
  ];
}

function nakshatraSteps(t: number, lang: Lang): Step[] {
  const lon = t * 360;
  const n = Math.floor(lon / (800 / 60));
  return [
    { say: L(lang, "हरेक नक्षत्रको भोग ८०० कला", "Each nakshatra spans 800′ (2.64)"), eq: [`${num(lang, 27)} × ${num(lang, 800)}′ = ${grp(lang, 21600)}′ = ${num(lang, 360)}°`] },
    { say: L(lang, "कर्सरको भोग कुन नक्षत्रमा?", "Which nakshatra holds the cursor's longitude?"), eq: [fr(`${grp(lang, Math.round(lon * 60))}′`, `${num(lang, 800)}′`), ` = ${fmt(lang, (lon * 60) / 800, 2)} → ${num(lang, Math.min(27, n + 1))}${L(lang, "औँ", "th")}`] },
    { say: L(lang, "योगताराको ध्रुवक: भोग × १० + ८०० × गत नक्षत्र", "A junction star's polar longitude: its number × 10 + 800 × those passed"), eq: [`${L(lang, "भरणी", "Bharaṇī")}: ${num(lang, 40)} × ${num(lang, 10)} + ${num(lang, 800)} × ${num(lang, 1)} = ${grp(lang, 1200)}′ = ${num(lang, 20)}°`] },
  ];
}

function risingSteps(_t: number, lang: Lang): Step[] {
  return [
    { say: L(lang, "सूर्यबाट ग्रहको दूरी कालांशमा नाप्ने", "Measure the planet's distance from the sun in degrees of time"), eq: [`${grp(lang, 21600)} ${L(lang, "असु", "asus")} = ${num(lang, 360)}° → ${L(lang, "कालांश", "degrees")} = `, fr(L(lang, "असु", "asus"), num(lang, 60))] },
    { say: L(lang, "त्यो दूरी तालिकाको कालांशभन्दा कम भए अस्त", "Less than the table's value: the planet is set (9.6–8)"), eq: [L(lang, "बृहस्पति ११°, शुक्र ८°–१०°, शनि १५°, मङ्गल १७°", "Jupiter 11°, Venus 8°–10°, Saturn 15°, Mars 17°")] },
    { say: L(lang, "सूर्यभन्दा छिटो ग्रह (चन्द्र, बुध र शुक्र वक्री हुँदा बाहेक) पश्चिममा उदाउँछ; ढिलो ग्रह पूर्वमा", "A planet faster than the sun rises in the west; a slower one in the east"), eq: [L(lang, "मङ्गल, बृहस्पति, शनि: पूर्वमा उदय, पश्चिममा अस्त", "Mars, Jupiter, Saturn: rise in the east, set in the west")] },
  ];
}

export const GANITA: Partial<Record<string, (t: number, lang: Lang) => Step[]>> = {
  "time-units": timeUnits,
  yuga,
  "mean-motion": meanMotion,
  "earth-size": earthSize,
  "sine-table": sineTable,
  declination,
  manda,
  sighra,
  "day-length": dayLength,
  gnomon,
  "lunar-eclipse": lunarEclipse,
  parallax,
  "solar-eclipse": solarEclipse,
  projection,
  conjunction,
  nakshatra: nakshatraSteps,
  udayasta: risingSteps,
  "moon-phase": moonPhase,
  pata,
  bhugola,
  kaksha,
  armillary,
  measures,
};
