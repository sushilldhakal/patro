/**
 * Lettered constructions for the Surya Siddhanta reader, in the manner of the
 * old commentaries: points named by letters, straight lines between them,
 * and under each figure the arithmetic worked out step by step with the
 * text's own numbers. copy-ok-file
 *
 * Chapter 1: the kalpa and the years since creation (1.19–24, 1.45–47), the
 * day count ahargaṇa (1.48–51), and the correction for one's own meridian
 * (1.59–63). Chapter 2: the śīghra correction as a right triangle (2.38–42),
 * and the same correction seen around the sun for an inner planet (Venus)
 * and an outer one (Jupiter).
 */
import {
  arc,
  circle,
  dms,
  fmt,
  key,
  L,
  line,
  num,
  path,
  polar,
  suryaArc,
  suryaJya,
  text,
  TRIJYA,
  wrap,
  type FigureFrame,
  type Lang,
  type MathPart,
  type Shape,
  type Step,
  type Tone,
} from "./surya-kit";

// ---------------------------------------------------------------- helpers

export const fr = (n: string, d: string): MathPart => ({ n, d });

/** 1955885127 → १,९५,५८,८५,१२७ in Nepali, 1,955,885,127 in English. */
export function grp(lang: Lang, value: number): string {
  const s = Math.round(Math.abs(value)).toString();
  let out: string;
  if (lang === "en") out = s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  else {
    const last = s.slice(-3);
    const rest = s.slice(0, -3);
    out = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last : last;
  }
  return (value < 0 ? "−" : "") + num(lang, out);
}

/** A named point: a dot and its letter. */
export function mark(shapes: Shape[], p: { x: number; y: number }, label: string, dx: number, dy: number, tone: Tone = "ink", r = 2.4) {
  shapes.push(circle(p.x, p.y, r, { fill: tone }));
  shapes.push(text(p.x + dx, p.y + dy, label, tone === "faint" ? "muted" : tone, 10.5, "middle", true));
}

/** A small arrow head at b, pointing from a to b. */
export function arrowHead(a: { x: number; y: number }, b: { x: number; y: number }, tone: Tone): Shape {
  const ang = Math.atan2(b.y - a.y, b.x - a.x);
  const s = 5;
  const l = { x: b.x - s * Math.cos(ang - 0.45), y: b.y - s * Math.sin(ang - 0.45) };
  const r = { x: b.x - s * Math.cos(ang + 0.45), y: b.y - s * Math.sin(ang + 0.45) };
  return path(`M ${l.x.toFixed(1)} ${l.y.toFixed(1)} L ${b.x.toFixed(1)} ${b.y.toFixed(1)} L ${r.x.toFixed(1)} ${r.y.toFixed(1)}`, { stroke: tone, w: 1.2 });
}

/** Screen angle of the ray a → b, degrees anticlockwise from the right. */
export function screenAngle(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return (Math.atan2(-(b.y - a.y), b.x - a.x) * 180) / Math.PI;
}

/** Signed difference b − a folded into −180..180. */
export function turn(a: number, b: number): number {
  return ((((b - a) % 360) + 540) % 360) - 180;
}

export function box(shapes: Shape[], x: number, y: number, w: number, h: number, label: string, value: string, tone: Tone) {
  shapes.push(path(`M ${x} ${y} h ${w} v ${h} h ${-w} Z`, { fill: tone, opacity: 0.14, stroke: tone, w: 1 }));
  shapes.push(text(x + w / 2, y + 14, label, "muted", 8.5));
  shapes.push(text(x + w / 2, y + 31, value, "ink", 10.5, "middle", true));
}

// ---------------------------------------------------------------- the śīghra correction

export type SighraParts = {
  p: number;
  bj: number;
  kj: number;
  bhuja: number;
  koti: number;
  sk: number;
  karna: number;
  phalaJya: number;
  phala: number;
};

/**
 * Surya Siddhanta 2.38–42. The epicycle grows from its even-quadrant value to
 * its odd-quadrant value with the sine of the anomaly; bhujaphala and
 * kotiphala are the sine and cosine scaled to it; the hypotenuse (karṇa) and
 * the arc of bhujaphala × R ÷ karṇa give the correction.
 */
export function sighraParts(k: number, even: number, odd: number): SighraParts {
  const bj = suryaJya(k);
  const kj = suryaJya(k + 90);
  const p = even + ((odd - even) * Math.abs(bj)) / TRIJYA;
  const bhuja = (bj * p) / 360;
  const koti = (kj * p) / 360;
  const sk = TRIJYA + koti;
  const karna = Math.hypot(sk, bhuja);
  const phalaJya = (bhuja * TRIJYA) / karna;
  return { p, bj, kj, bhuja, koti, sk, karna, phalaJya, phala: suryaArc(phalaJya) };
}

function sighraSteps(lang: Lang, k: number, s: SighraParts, even: number, odd: number): Step[] {
  const n = (v: number, d = 0) => fmt(lang, v, d);
  const R = num(lang, TRIJYA);
  const sign = s.phala >= 0 ? L(lang, "धन (जोड्ने)", "add") : L(lang, "ऋण (घटाउने)", "subtract");
  return [
    { say: L(lang, "शीघ्रकेन्द्र", "Śīghra anomaly"), eq: [`κ = ${dms(lang, k)}`] },
    {
      say: L(lang, "स्फुट परिधि (२.३८): सम पदान्तमा, विषम पदान्तमा", "True epicycle (2.38), between its even- and odd-quadrant values"),
      eq: [`p = ${num(lang, even)}° ${odd >= even ? "+" : "−"} `, fr(`${num(lang, Math.abs(odd - even))}° × ${n(Math.abs(s.bj))}`, R), ` = ${n(s.p, 2)}°`],
    },
    {
      say: L(lang, "भुजफल: भुजज्यालाई परिधिले गुणेर ३६० ले भाग (२.३९)", "Bhujaphala: the sine of κ times the epicycle over 360 (2.39)"),
      eq: [`${L(lang, "भुजफल", "b")} = `, fr(`${L(lang, "ज्या", "sin")} κ × p`, num(lang, 360)), " = ", fr(`${n(s.bj)} × ${n(s.p, 2)}`, num(lang, 360)), ` = ${n(s.bhuja, 1)}`],
    },
    {
      say: L(lang, "कोटिफल: कोटिज्याबाट त्यसै गरी", "Kotiphala: the same from the cosine"),
      eq: [`${L(lang, "कोटिफल", "k")} = `, fr(`${n(s.kj)} × ${n(s.p, 2)}`, num(lang, 360)), ` = ${n(s.koti, 1)}`],
    },
    {
      say: L(lang, "स्फुटकोटि: मकरादि केन्द्रमा जोड्ने, कर्कादिमा घटाउने (२.४०)", "Corrected cosine: added from Capricorn, subtracted from Cancer (2.40)"),
      eq: [`${L(lang, "स्फुटकोटि", "R + k")} = ${R} ${s.koti >= 0 ? "+" : "−"} ${n(Math.abs(s.koti), 1)} = ${n(s.sk, 1)}`],
    },
    {
      say: L(lang, "कर्ण: समकोण त्रिभुजको कर्ण", "Hypotenuse (karṇa) of the right triangle"),
      eq: [`${L(lang, "कर्ण", "K")} = √(${n(s.sk, 1)}² + ${n(Math.abs(s.bhuja), 1)}²) = ${n(s.karna, 1)}`],
    },
    {
      say: L(lang, "शीघ्रफलज्या (२.४१)", "Sine of the correction (2.41)"),
      eq: [`${L(lang, "फलज्या", "sin φ")} = `, fr(`${L(lang, "भुजफल", "b")} × ${R}`, L(lang, "कर्ण", "K")), " = ", fr(`${n(s.bhuja, 1)} × ${R}`, n(s.karna, 1)), ` = ${n(s.phalaJya, 1)}`],
    },
    {
      say: L(lang, "ज्यापिण्डबाट चाप लिँदा शीघ्रफल (२.४२)", "Its arc from the sine table is the correction (2.42)"),
      eq: [`φ = ${dms(lang, Math.abs(s.phala))} · ${sign}`],
    },
  ];
}

/** 2.38–42 drawn as the text describes it: earth, mean planet, epicycle, right triangle. Mars's numbers. */
function sighraConstruction(t: number, lang: Lang): FigureFrame {
  const k = t * 360;
  const s = sighraParts(k, 235, 232);
  const E = { x: 96, y: 152 };
  const Rd = 74;
  const M = polar(E.x, E.y, Rd, 90);
  const r = (Rd * s.p) / 360;
  const U = polar(M.x, M.y, r, 90);
  const P = polar(M.x, M.y, r, 90 + k);
  const F = { x: M.x, y: P.y };
  const shapes: Shape[] = [
    path(arc(E.x, E.y, Rd, 40, 140), { stroke: "faint", w: 1 }),
    circle(M.x, M.y, r, { stroke: "muted", w: 1 }),
    line(E.x, E.y, U.x, U.y - 10, { stroke: "faint", w: 1, dash: "3 3" }),
    line(E.x, E.y, M.x, M.y, { stroke: "muted", w: 1.2 }),
    line(M.x, M.y, P.x, P.y, { stroke: "faint", w: 1 }),
    line(M.x, M.y, F.x, F.y, { stroke: "planet", w: 2.4 }),
    line(P.x, P.y, F.x, F.y, { stroke: "sun", w: 2.4 }),
    line(E.x, E.y, P.x, P.y, { stroke: "accent", w: 1.8 }),
  ];
  // right angle at F
  const sx = P.x < F.x ? -5 : 5;
  const sy = F.y < E.y ? 5 : -5;
  if (Math.abs(P.x - F.x) > 6) shapes.push(path(`M ${F.x + sx} ${F.y} v ${sy} h ${-sx}`, { stroke: "muted", w: 0.8 }));
  // the correction: angle at E between EM and EP
  const ang = screenAngle(E, P);
  shapes.push(path(arc(E.x, E.y, 20, Math.min(90, ang), Math.max(90, ang)), { stroke: "accent", w: 1.4 }));
  shapes.push(circle(E.x, E.y, 5, { fill: "earth" }));
  mark(shapes, E, L(lang, "भू", "E"), 0, 18, "earth", 0);
  const side = P.x < M.x ? 1 : -1; // letters go on the side away from the planet
  const fAbove = F.y < M.y; // F and M letters part vertically: each on its own side
  mark(shapes, M, L(lang, "म", "M"), 11 * side, fAbove ? 13 : -4, "muted");
  mark(shapes, U, L(lang, "उ", "U"), 10, -2, "muted");
  mark(shapes, F, L(lang, "ल", "F"), 11 * side, fAbove ? -4 : 13, "planet");
  shapes.push(circle(P.x, P.y, 4.5, { fill: "accent" }));
  shapes.push(text(P.x + (P.x < M.x ? -10 : 10), P.y - 5, L(lang, "ग", "P"), "accent", 10.5, "middle", true));
  return {
    shapes,
    key: [key("earth", L(lang, "भू", "E"), L(lang, "पृथ्वी", "Earth")), key("muted", L(lang, "म", "M"), L(lang, "मध्यम (मन्दस्पष्ट) ग्रह", "Mean (manda-corrected) planet")), key("muted", L(lang, "उ", "U"), L(lang, "शीघ्रोच्चतर्फको बिन्दु", "Point toward the śīghrocca")), key("accent", L(lang, "ग", "P"), L(lang, "स्पष्ट ग्रह", "True planet")), key("planet", L(lang, "ल", "F"), L(lang, "लम्बको फेद", "Foot of the perpendicular")), key("sun", L(lang, "गल", "PF"), L(lang, "भुजफल", "bhujaphala"), "line"), key("planet", L(lang, "मल", "MF"), L(lang, "कोटिफल", "kotiphala"), "line"), key("accent", L(lang, "भूग", "EP"), L(lang, "कर्ण; ∠मभूग = शीघ्रफल", "hypotenuse; ∠MEP = the correction"), "line")],
    readout: [
      `${L(lang, "केन्द्र", "κ")} ${dms(lang, k)} · ${L(lang, "परिधि", "p")} ${fmt(lang, s.p, 1)}° · ${L(lang, "कर्ण", "K")} ${fmt(lang, s.karna)}`,
      `${L(lang, "शीघ्रफल", "correction")} ${s.phala >= 0 ? "+" : "−"}${dms(lang, Math.abs(s.phala))}`,
    ],
    steps: sighraSteps(lang, k, s, 235, 232),
  };
}

/**
 * Venus. Around the sun H the earth E and Venus V each keep their circle.
 * The text's mean Venus is the mean sun, seen along EH; its śīghrocca is
 * Venus's own place around the sun, along HV. The true Venus lies along EV,
 * and the angle HEV is the śīghra correction. Venus's epicycle of 262° says
 * the ratio of the two circles is 262 ÷ 360.
 */
function sighraInferior(t: number, lang: Lang): FigureFrame {
  const k = wrap(t * 360);
  const sun = wrap(20 + 576 * t); // the sun moves 1.6 turns in Venus's synodic period
  const venus = wrap(sun + k);
  const s = sighraParts(k, 262, 260);
  const E = { x: 46, y: 104 };
  const a = 118;
  const H = { x: E.x + a, y: E.y };
  const c = (a * s.p) / 360;
  const V = polar(H.x, H.y, c, k);
  const shapes: Shape[] = [
    path(arc(H.x, H.y, a, 158, 202), { stroke: "earth", w: 1.2 }),
    circle(H.x, H.y, c, { stroke: "muted", w: 1 }),
  ];
  // the direction of Aries 0° from E and from H: parallel arrows
  const o1 = polar(E.x, E.y, 38, -sun);
  const o2 = polar(H.x, H.y, 38, -sun);
  shapes.push(line(E.x, E.y, o1.x, o1.y, { stroke: "faint", w: 1, dash: "3 2" }), arrowHead(E, o1, "muted"));
  shapes.push(line(H.x, H.y, o2.x, o2.y, { stroke: "faint", w: 1, dash: "3 2" }), arrowHead(H, o2, "muted"));
  shapes.push(text(o1.x + 4, o1.y + 12, L(lang, "मे", "O"), "muted", 9));
  shapes.push(text(o2.x + 4, o2.y + 12, L(lang, "मे", "O"), "muted", 9));
  shapes.push(line(E.x, E.y, H.x, H.y, { stroke: "muted", w: 1.2 }));
  shapes.push(line(H.x, H.y, V.x, V.y, { stroke: "planet", w: 1.6 }));
  shapes.push(line(E.x, E.y, V.x, V.y, { stroke: "accent", w: 1.8 }));
  const ang = screenAngle(E, V);
  shapes.push(path(arc(E.x, E.y, 26, Math.min(0, ang), Math.max(0, ang)), { stroke: "accent", w: 1.4 }));
  shapes.push(circle(H.x, H.y, 7, { fill: "sun" }));
  shapes.push(circle(E.x, E.y, 4.5, { fill: "earth" }));
  shapes.push(circle(V.x, V.y, 4.5, { fill: "accent" }));
  shapes.push(text(H.x + 2, H.y + 20, L(lang, "सू", "H"), "sun", 10.5, "middle", true));
  shapes.push(text(E.x - 2, E.y + 18, L(lang, "भू", "E"), "earth", 10.5, "middle", true));
  shapes.push(text(V.x + (V.x >= H.x ? 10 : -10), V.y - 6, L(lang, "शु", "V"), "accent", 10.5, "middle", true));
  const geo = turn(sun, sun + screenAngle(E, V));
  const steps: Step[] = [
    { say: L(lang, "बुध र शुक्रको मध्यम ग्रह = मध्यम सूर्य", "For Mercury and Venus the mean planet is the mean sun"), eq: [`${L(lang, "मध्यम", "mean")} = ${dms(lang, sun)}`] },
    { say: L(lang, "शीघ्रोच्च = सूर्यवरिपरि शुक्रको स्थान", "The śīghrocca is Venus's own place around the sun"), eq: [`${L(lang, "शीघ्रोच्च", "śīghrocca")} = ${dms(lang, venus)}`] },
    {
      say: L(lang, "परिधिको अनुपात नै दुई कक्षाको अनुपात", "The epicycle's ratio is the ratio of the two orbits"),
      eq: [fr(num(lang, 262), num(lang, 360)), ` = ${fmt(lang, 262 / 360, 3)} · ${L(lang, "आधुनिक", "modern")} ${fmt(lang, 0.723, 3)}`],
    },
    ...sighraSteps(lang, k, s, 262, 260),
    {
      say: L(lang, "स्पष्ट शुक्र = मध्यम ± फल", "True Venus = mean ± correction"),
      eq: [`${dms(lang, sun)} ${s.phala >= 0 ? "+" : "−"} ${dms(lang, Math.abs(s.phala))} = ${dms(lang, wrap(sun + s.phala))}`],
    },
    {
      say: L(lang, "चित्रमा कोण सूभूशु नाप्दा पनि त्यही आउँछ", "Measuring angle HEV on the drawing gives the same"),
      eq: [`∠${L(lang, "सूभूशु", "HEV")} = ${geo >= 0 ? "+" : "−"}${dms(lang, Math.abs(geo))}`],
    },
  ];
  return {
    shapes,
    key: [key("sun", L(lang, "सू", "H"), L(lang, "सूर्य", "Sun")), key("earth", L(lang, "भू", "E"), L(lang, "पृथ्वी", "Earth")), key("accent", L(lang, "शु", "V"), L(lang, "शुक्र", "Venus")), key("muted", L(lang, "मे", "O"), L(lang, "मेष ०° को दिशा", "Direction of Aries 0°"), "line"), key("muted", L(lang, "भूसू", "EH"), L(lang, "मध्यम ग्रह (मध्यम सूर्य)", "Mean planet (the mean sun)"), "line"), key("planet", L(lang, "सूशु", "HV"), L(lang, "शीघ्रोच्च", "śīghrocca"), "line"), key("accent", L(lang, "भूशु", "EV"), L(lang, "स्पष्ट शुक्र; ∠सूभूशु = फल", "True Venus; ∠HEV = correction"), "line")],
    readout: [
      `${L(lang, "केन्द्र", "κ")} ${dms(lang, k)} · ${L(lang, "परिधि", "p")} ${fmt(lang, s.p, 1)}°`,
      `${L(lang, "फल", "correction")} ${s.phala >= 0 ? "+" : "−"}${dms(lang, Math.abs(s.phala))} · ${L(lang, "स्पष्ट", "true")} ${dms(lang, wrap(sun + s.phala))}`,
    ],
    steps,
  };
}

/**
 * Jupiter. The sun H carries the earth E on a small circle; Jupiter J goes
 * round on the large one. The text's mean Jupiter is its place around the
 * sun, along HJ; the śīghrocca is the mean sun. The true Jupiter lies along
 * EJ, and the angle at J (equal to the angle at E against a line parallel
 * to HJ) is the śīghra correction. The 70° epicycle is the ratio EH ÷ HJ.
 */
function sighraSuperior(t: number, lang: Lang): FigureFrame {
  const k = wrap(t * 360);
  const jup = wrap(40 + 33 * t); // Jupiter moves about 33° in its synodic period
  const sun = wrap(jup + k);
  const s = sighraParts(k, 70, 72);
  const H = { x: 70, y: 104 };
  const b = 208;
  const J = { x: H.x + b, y: H.y };
  const a = (b * s.p) / 360;
  const E = polar(H.x, H.y, a, k + 180);
  const shapes: Shape[] = [
    circle(H.x, H.y, a, { stroke: "earth", w: 1.1 }),
    path(arc(H.x, H.y, b, -21, 21), { stroke: "muted", w: 1.1 }),
  ];
  const o1 = polar(E.x, E.y, 34, -jup);
  const o2 = polar(H.x, H.y, 34, -jup);
  shapes.push(line(E.x, E.y, o1.x, o1.y, { stroke: "faint", w: 1, dash: "3 2" }), arrowHead(E, o1, "muted"));
  shapes.push(line(H.x, H.y, o2.x, o2.y, { stroke: "faint", w: 1, dash: "3 2" }), arrowHead(H, o2, "muted"));
  shapes.push(text(o2.x + 4, o2.y - 5, L(lang, "मे", "O"), "muted", 9));
  // a line from E parallel to HJ: the mean planet seen from the earth
  shapes.push(line(E.x, E.y, E.x + b + 20, E.y, { stroke: "faint", w: 1, dash: "4 3" }));
  shapes.push(line(H.x, H.y, J.x, J.y, { stroke: "muted", w: 1.3 }));
  shapes.push(line(H.x, H.y, E.x, E.y, { stroke: "planet", w: 1.6 }));
  shapes.push(line(E.x, E.y, J.x, J.y, { stroke: "accent", w: 1.8 }));
  const ang = screenAngle(E, J);
  shapes.push(path(arc(E.x, E.y, 46, Math.min(0, ang), Math.max(0, ang)), { stroke: "accent", w: 1.4 }));
  const angJ = 180 + turn(180, screenAngle(J, E));
  shapes.push(path(arc(J.x, J.y, 22, Math.min(180, angJ), Math.max(180, angJ)), { stroke: "accent", w: 1.4 }));
  shapes.push(circle(H.x, H.y, 7, { fill: "sun" }));
  shapes.push(circle(E.x, E.y, 4.5, { fill: "earth" }));
  shapes.push(circle(J.x, J.y, 5.5, { fill: "accent" }));
  shapes.push(text(H.x - 4, H.y - 13, L(lang, "सू", "H"), "sun", 10.5, "middle", true));
  shapes.push(text(E.x + (E.x < H.x ? -10 : 10), E.y + (E.y > H.y ? 14 : -7), L(lang, "भू", "E"), "earth", 10.5, "middle", true));
  shapes.push(text(J.x + 12, J.y - 8, L(lang, "बृ", "J"), "accent", 10.5, "middle", true));
  const geo = turn(jup, jup + screenAngle(E, J));
  const steps: Step[] = [
    { say: L(lang, "मङ्गल, बृहस्पति, शनिको मध्यम ग्रह = सूर्यवरिपरिको स्थान", "For Mars, Jupiter and Saturn the mean planet is its place around the sun"), eq: [`${L(lang, "मध्यम", "mean")} = ${dms(lang, jup)}`] },
    { say: L(lang, "शीघ्रोच्च = मध्यम सूर्य", "The śīghrocca is the mean sun"), eq: [`${L(lang, "शीघ्रोच्च", "śīghrocca")} = ${dms(lang, sun)}`] },
    {
      say: L(lang, "परिधिको अनुपात = पृथ्वीको कक्षा ÷ बृहस्पतिको कक्षा", "The epicycle's ratio is the earth's orbit over Jupiter's"),
      eq: [fr(num(lang, 70), num(lang, 360)), ` = ${fmt(lang, 70 / 360, 3)} · ${L(lang, "आधुनिक", "modern")} `, fr(num(lang, 1), fmt(lang, 5.203, 3)), ` = ${fmt(lang, 1 / 5.203, 3)}`],
    },
    ...sighraSteps(lang, k, s, 70, 72),
    {
      say: L(lang, "स्पष्ट बृहस्पति = मध्यम ± फल", "True Jupiter = mean ± correction"),
      eq: [`${dms(lang, jup)} ${s.phala >= 0 ? "+" : "−"} ${dms(lang, Math.abs(s.phala))} = ${dms(lang, wrap(jup + s.phala))}`],
    },
    {
      say: L(lang, "चित्रमा कोण सूबृभू नाप्दा पनि त्यही आउँछ", "Measuring angle HJE on the drawing gives the same"),
      eq: [`∠${L(lang, "सूबृभू", "HJE")} = ${geo >= 0 ? "+" : "−"}${dms(lang, Math.abs(geo))}`],
    },
  ];
  return {
    shapes,
    key: [key("sun", L(lang, "सू", "H"), L(lang, "सूर्य", "Sun")), key("earth", L(lang, "भू", "E"), L(lang, "पृथ्वी", "Earth")), key("accent", L(lang, "बृ", "J"), L(lang, "बृहस्पति", "Jupiter")), key("muted", L(lang, "मे", "O"), L(lang, "मेष ०° को दिशा", "Direction of Aries 0°"), "line"), key("muted", L(lang, "सूबृ", "HJ"), L(lang, "मध्यम ग्रह", "Mean planet"), "line"), key("planet", L(lang, "सूभू", "EH"), L(lang, "शीघ्रोच्च (मध्यम सूर्य)", "śīghrocca (the mean sun)"), "line"), key("accent", L(lang, "भूबृ", "EJ"), L(lang, "स्पष्ट बृहस्पति; ∠सूबृभू = फल", "True Jupiter; ∠HJE = correction"), "line")],
    readout: [
      `${L(lang, "केन्द्र", "κ")} ${dms(lang, k)} · ${L(lang, "परिधि", "p")} ${fmt(lang, s.p, 1)}°`,
      `${L(lang, "फल", "correction")} ${s.phala >= 0 ? "+" : "−"}${dms(lang, Math.abs(s.phala))} · ${L(lang, "स्पष्ट", "true")} ${dms(lang, wrap(jup + s.phala))}`,
    ],
    steps,
  };
}

// ---------------------------------------------------------------- chapter 1

const MY = 4320000;
const KRTA = 1728000;

/** 1.19–24 and 1.45–47: the kalpa of fourteen Manus, and the years elapsed since the planets were made. */
function kalpa(t: number, lang: Lang): FigureFrame {
  const x0 = 14;
  const width = 332;
  const unit = width / 1000; // one mahāyuga
  const y = 54;
  const shapes: Shape[] = [];
  let x = x0 + 0.4 * unit;
  for (let m = 0; m < 14; m += 1) {
    const w = 71 * unit;
    const done = m < 6;
    shapes.push(path(`M ${x.toFixed(1)} ${y} h ${w.toFixed(1)} v 24 h ${(-w).toFixed(1)} Z`, { fill: m === 6 ? "accent" : done ? "sun" : "muted", opacity: m === 6 ? 0.35 : done ? 0.3 : 0.14, stroke: "ink", w: 0.5 }));
    shapes.push(text(x + w / 2, y + 16, num(lang, m + 1), "ink", 8.5));
    x += w + 0.4 * unit;
  }
  for (let i = 0; i < 15; i += 1) {
    const sx = x0 + i * (71.4 * unit) + 0.2 * unit;
    shapes.push(line(sx, y - 4, sx, y + 28, { stroke: "accent", w: 1 }));
  }
  // where we are now: 6 Manus + 7 twilights + 27 mahāyugas + Kṛta, Tretā, Dvāpara + 5127 Kali years
  const nowMY = 6 * 71 + 7 * 0.4 + 27 + 0.9 + 5127 / MY;
  const nx = x0 + nowMY * unit;
  shapes.push(line(nx, y - 12, nx, y + 30, { stroke: "ink", w: 1.6 }), arrowHead({ x: nx, y: y - 20 }, { x: nx, y: y - 2 }, "ink"));
  shapes.push(text(nx, y - 14, L(lang, "आज", "now"), "ink", 9, "middle", true));
  // the seventh Manu, opened out
  const zy = 132;
  const zx0 = 14;
  const zu = width / 71;
  const sx7 = x0 + 6 * 71.4 * unit + 0.4 * unit;
  shapes.push(line(sx7, y + 24, zx0, zy, { stroke: "faint", w: 0.8, dash: "2 2" }));
  shapes.push(line(sx7 + 71 * unit, y + 24, zx0 + width, zy, { stroke: "faint", w: 0.8, dash: "2 2" }));
  for (let i = 0; i < 71; i += 1) {
    const tone: Tone = i < 27 ? "sun" : i === 27 ? "accent" : "muted";
    shapes.push(path(`M ${(zx0 + i * zu).toFixed(1)} ${zy} h ${(zu - 0.8).toFixed(1)} v 18 h ${(-(zu - 0.8)).toFixed(1)} Z`, { fill: tone, opacity: i === 27 ? 0.85 : i < 27 ? 0.4 : 0.14 }));
  }
  // the moving cursor reads off any moment of the kalpa
  const at = t * 1000;
  const cx = x0 + at * unit;
  shapes.push(line(cx, y + 26, cx, y + 32, { stroke: "accent", w: 2.5 }));
  const manu = Math.min(14, Math.floor(at / 71.4) + 1);
  const steps: Step[] = [
    {
      say: L(lang, "कल्प: १४ मनु, हरेक ७१ महायुग, र १५ सन्धि, हरेक कृतयुग बराबर (१.१९–२०)", "A kalpa: 14 Manus of 71 mahāyugas, and 15 twilights of one Kṛta each (1.19–20)"),
      eq: [`${num(lang, 14)} × ${num(lang, 71)} + ${num(lang, 15)} × `, fr(num(lang, 4), num(lang, 10)), ` = ${num(lang, 994)} + ${num(lang, 6)} = ${num(lang, 1000)} ${L(lang, "महायुग", "mahāyugas")}`],
    },
    { say: L(lang, "बितेका ६ मनु (१.२२)", "Six Manus gone (1.22)"), eq: [`${num(lang, 6)} × ${num(lang, 71)} × ${grp(lang, MY)} = ${grp(lang, 6 * 71 * MY)}`] },
    { say: L(lang, "तिनका ७ सन्धि (कल्पको आदिको सन्धिसमेत)", "Their seven twilights, counting the one at the kalpa's start"), eq: [`${num(lang, 7)} × ${grp(lang, KRTA)} = ${grp(lang, 7 * KRTA)}`] },
    { say: L(lang, "वैवस्वत मनुका बितेका २७ महायुग", "27 mahāyugas of Vaivasvata gone"), eq: [`${num(lang, 27)} × ${grp(lang, MY)} = ${grp(lang, 27 * MY)}`] },
    { say: L(lang, "२८औँ महायुगको कृत (१.२३)", "The Kṛta of the 28th (1.23)"), eq: [grp(lang, KRTA)] },
    { say: L(lang, "कृतको अन्त्यसम्म जम्मा (१.४७)", "Total to the end of that Kṛta (1.47)"), eq: [`${grp(lang, 6 * 71 * MY + 8 * KRTA + 27 * MY)} ${L(lang, "वर्ष", "years")}`] },
    {
      say: L(lang, "ग्रह बनाउन लागेको ४७४०० दिव्य वर्ष घटाउने (१.२४)", "Less the 47,400 divine years spent in creation (1.24)"),
      eq: [`− ${grp(lang, 47400)} × ${num(lang, 360)} = − ${grp(lang, 47400 * 360)} → ${grp(lang, 6 * 71 * MY + 8 * KRTA + 27 * MY - 47400 * 360)}`],
    },
    {
      say: L(lang, "त्रेता, द्वापर र कलिका बितेका ५१२७ वर्ष (वि.सं. २०८३) जोड्दा", "Add Tretā, Dvāpara and the 5127 years of Kali gone (2026)"),
      eq: [`+ ${grp(lang, 1296000)} + ${grp(lang, 864000)} + ${grp(lang, 5127)} = ${grp(lang, 6 * 71 * MY + 8 * KRTA + 27 * MY - 47400 * 360 + 1296000 + 864000 + 5127)} ${L(lang, "वर्ष", "years")}`],
    },
  ];
  return {
    shapes,
    key: [key("sun", "", L(lang, "बितेका ६ मनु", "The six Manus gone")), key("accent", L(lang, "७", "7"), L(lang, "७औँ मनु (वैवस्वत), तल ठूलो पारेर", "The 7th Manu (Vaivasvata), opened out below")), key("accent", "", L(lang, "ठाडा रेखा: सन्धि (कृतयुग बराबर)", "Upright ticks: twilights, one Kṛta each"), "line"), key("ink", L(lang, "आज", "now"), L(lang, "२७ महायुग बिते, २८औँको कृत, त्रेता, द्वापर बिते, अहिले कलि", "27 mahāyugas gone; of the 28th, Kṛta, Tretā, Dvāpara gone, now Kali"), "line")],
    readout: [
      `${L(lang, "कर्सर", "cursor")}: ${num(lang, manu)}${L(lang, "औँ मनु", manu === 1 ? "st Manu" : manu === 2 ? "nd Manu" : manu === 3 ? "rd Manu" : "th Manu")} · ${fmt(lang, at, 1)} ${L(lang, "महायुग", "mahāyugas")}`,
      `${L(lang, "आज", "now")}: ${fmt(lang, nowMY, 2)} ${L(lang, "महायुग बिते", "mahāyugas gone")}`,
    ],
    steps,
  };
}

const KALI_YEARS = 5127;
const SOLAR_MONTHS_MY = 51840000;
const ADHI_MY = 1593336;
const TITHI_MY = 1603000080;
const AVAMA_MY = 25082252;
const CIVIL_MY = 1577917828;
const WEEKDAYS: [string, string][] = [
  ["आइतबार", "Sunday"],
  ["सोमबार", "Monday"],
  ["मङ्गलबार", "Tuesday"],
  ["बुधबार", "Wednesday"],
  ["बिहीबार", "Thursday"],
  ["शुक्रबार", "Friday"],
  ["शनिबार", "Saturday"],
];

/** 1.48–51: counting the days. Solar months → intercalary months → lunar months → tithis → omitted tithis → civil days. */
export function ahargana(kaliYears: number, months: number, tithis: number) {
  const solar = 12 * kaliYears + months;
  const adhi = Math.floor((solar * ADHI_MY) / SOLAR_MONTHS_MY);
  const lunar = solar + adhi;
  const tithi = lunar * 30 + tithis;
  const avama = Math.floor((tithi * AVAMA_MY) / TITHI_MY);
  const days = tithi - avama;
  const weekday = (days + 5) % 7; // Kali began at Laṅkā midnight on a Friday
  const sunRev = (days * MY) / CIVIL_MY;
  const sun = (sunRev - Math.floor(sunRev)) * 360;
  return { solar, adhi, lunar, tithi, avama, days, weekday, sunRev, sun };
}

function aharganaFigure(t: number, lang: Lang): FigureFrame {
  const m = Math.min(11, Math.floor(t * 12));
  const d = Math.min(29, Math.floor((t * 12 - m) * 30));
  const a = ahargana(KALI_YEARS, m, d);
  const shapes: Shape[] = [];
  const w = 74;
  const h = 40;
  const xs = [6, 96, 186, 276];
  const top = 26;
  const low = 112;
  box(shapes, xs[0]!, top, w, h, L(lang, "सौर मास", "solar months"), grp(lang, a.solar), "sun");
  box(shapes, xs[1]!, top, w, h, L(lang, "अधिमास", "intercalary"), grp(lang, a.adhi), "accent");
  box(shapes, xs[2]!, top, w, h, L(lang, "चान्द्र मास", "lunar months"), grp(lang, a.lunar), "planet");
  box(shapes, xs[3]!, top, w, h, L(lang, "तिथि", "tithis"), grp(lang, a.tithi), "planet");
  box(shapes, xs[3]!, low, w, h, L(lang, "अवम (क्षय)", "omitted tithis"), grp(lang, a.avama), "muted");
  box(shapes, xs[2]!, low, w, h, L(lang, "अहर्गण", "ahargaṇa"), grp(lang, a.days), "earth");
  box(shapes, xs[1]!, low, w, h, L(lang, "वार", "weekday"), L(lang, WEEKDAYS[a.weekday]![0], WEEKDAYS[a.weekday]![1]), "sun");
  box(shapes, xs[0]!, low, w, h, L(lang, "मध्यम सूर्य", "mean sun"), dms(lang, a.sun), "sun");
  const arrows: [number, number, number, number, string][] = [
    [xs[0]! + w, top + h / 2, xs[1]!, top + h / 2, "∝"],
    [xs[1]! + w, top + h / 2, xs[2]!, top + h / 2, "+"],
    [xs[2]! + w, top + h / 2, xs[3]!, top + h / 2, L(lang, "×३०", "×30")],
    [xs[3]! + w / 2, top + h, xs[3]! + w / 2, low, "∝"],
    [xs[3]!, low + h / 2, xs[2]! + w, low + h / 2, "−"],
    [xs[2]!, low + h / 2, xs[1]! + w, low + h / 2, "÷७"],
    [xs[1]!, low + h / 2, xs[0]! + w, low + h / 2, "×"],
  ];
  for (const [x1, y1, x2, y2, lab] of arrows) {
    shapes.push(line(x1, y1, x2, y2, { stroke: "muted", w: 1 }), arrowHead({ x: x1, y: y1 }, { x: x2, y: y2 }, "muted"));
    const vertical = x1 === x2;
    shapes.push(text(vertical ? x1 + 6 : (x1 + x2) / 2, vertical ? (y1 + y2) / 2 + 3 : y1 - 4, lab.replace("÷७", L(lang, "÷७", "÷7")), "accent", 8, vertical ? "start" : "middle"));
  }
  const n = (v: number) => grp(lang, v);
  const steps: Step[] = [
    { say: L(lang, "सृष्टिदेखि बितेका वर्ष (१.४५–४७): कल्पको चित्र हेर्नुहोस्; यहाँ कलियुग आरम्भदेखि गन्ने", "Years since creation (1.45–47): see the kalpa figure; here we count from the start of Kali"), eq: [`${grp(lang, 1955885127)} ${L(lang, "वर्ष", "years")} · ${L(lang, "कलि", "Kali")} ${grp(lang, KALI_YEARS)}`] },
    { say: L(lang, "गत सौर वर्षलाई १२ ले गुणेर चैत्रदेखिका मास जोड्ने (१.४८)", "Elapsed years × 12, plus the months since Caitra (1.48)"), eq: [`${num(lang, 12)} × ${n(KALI_YEARS)} + ${num(lang, m)} = ${n(a.solar)} ${L(lang, "सौर मास", "solar months")}`] },
    {
      say: L(lang, "अधिमास: युगका अधिमासलाई युगका सौर मासले भाग (१.४९)", "Intercalary months: in proportion to a mahāyuga's (1.49)"),
      eq: [fr(`${n(a.solar)} × ${n(ADHI_MY)}`, n(SOLAR_MONTHS_MY)), ` = ${n(a.adhi)}`],
    },
    { say: L(lang, "चान्द्र मास = सौर मास + अधिमास", "Lunar months = solar months + intercalary"), eq: [`${n(a.solar)} + ${n(a.adhi)} = ${n(a.lunar)}`] },
    { say: L(lang, "तिथि = चान्द्र मास × ३० + गत तिथि", "Tithis = lunar months × 30 + tithis elapsed"), eq: [`${n(a.lunar)} × ${num(lang, 30)} + ${num(lang, d)} = ${n(a.tithi)}`] },
    {
      say: L(lang, "अवम (क्षय तिथि): युगका अवमलाई युगका तिथिले भाग (१.४९)", "Omitted tithis: in proportion to a mahāyuga's (1.49)"),
      eq: [fr(`${n(a.tithi)} × ${n(AVAMA_MY)}`, n(TITHI_MY)), ` = ${n(a.avama)}`],
    },
    { say: L(lang, "अहर्गण = तिथि − अवम: लङ्काका मध्यरातको गन्ती (१.५०)", "Ahargaṇa = tithis − omitted: midnights at Laṅkā (1.50)"), eq: [`${n(a.tithi)} − ${n(a.avama)} = ${n(a.days)} ${L(lang, "दिन", "days")}`] },
    {
      say: L(lang, "वार: ७ ले भाग गरेको शेष, शुक्रबारदेखि गनेर (१.५१)", "Weekday: the remainder on dividing by 7, counted from Friday (1.51)"),
      eq: [`${L(lang, `(${n(a.days)} + ५) ÷ ७ को शेष`, `(${a.days} + 5) mod 7`)} = ${num(lang, a.weekday)} → ${L(lang, WEEKDAYS[a.weekday]![0], WEEKDAYS[a.weekday]![1])}`],
    },
    {
      say: L(lang, "मध्यम सूर्य: अहर्गण × भगण ÷ कुदिन (१.५३)", "Mean sun: ahargaṇa × revolutions ÷ civil days (1.53)"),
      eq: [fr(`${n(a.days)} × ${n(MY)}`, n(CIVIL_MY)), ` = ${fmt(lang, a.sunRev, 4)} ${L(lang, "भगण", "rev.")} → ${L(lang, "शेष", "fraction")} × ${num(lang, 360)} = ${dms(lang, a.sun)}`],
    },
  ];
  return {
    shapes,
    key: [key("ink", "", L(lang, `कलियुग आरम्भदेखि गत वर्ष ${num(lang, KALI_YEARS)}, चैत्रदेखि ${num(lang, m)} मास ${num(lang, d)} तिथि`, `From the start of Kali: ${KALI_YEARS} years, then ${m} months ${d} tithis from Caitra`)), key("accent", "∝", L(lang, "युगको अनुपातले (त्रैराशिक)", "In proportion to the yuga (rule of three)"), "line"), key("muted", "", L(lang, "कलि आरम्भ: लङ्काको मध्यरात, शुक्रबार, सबै मध्यम ग्रह मेष ०° मा (१.५७)", "Kali began at Laṅkā midnight on a Friday, all mean planets at Aries 0° (1.57)"), "line"), key("muted", "", L(lang, "आधुनिक जुलियन गन्तीसँग एक–दुई दिनको फरक हुन सक्छ", "May differ by a day or two from a modern Julian count"), "line")],
    readout: [`${L(lang, "अहर्गण", "Ahargaṇa")} ${n(a.days)} · ${L(lang, WEEKDAYS[a.weekday]![0], WEEKDAYS[a.weekday]![1])}`, `${L(lang, "मध्यम सूर्य", "mean sun")} ${dms(lang, a.sun)}`],
    steps,
  };
}

const UJJAIN = 75 + 46 / 60;
const PLACES: { ne: string; en: string; lat: number; lon: number }[] = [
  { ne: "काठमाडौँ", en: "Kathmandu", lat: 27.7, lon: 85.32 },
  { ne: "पोखरा", en: "Pokhara", lat: 28.21, lon: 83.99 },
  { ne: "विराटनगर", en: "Biratnagar", lat: 26.45, lon: 87.27 },
  { ne: "जनकपुर", en: "Janakpur", lat: 26.73, lon: 85.93 },
  { ne: "नेपालगञ्ज", en: "Nepalgunj", lat: 28.05, lon: 81.62 },
  { ne: "धनगढी", en: "Dhangadhi", lat: 28.7, lon: 80.59 },
];
const MOON_MOTION = 790 + 35 / 60; // kalā a day

/** 1.59–63: the earth's girth at one's own latitude, and the correction for lying east or west of the Laṅkā–Ujjayinī–Meru line. */
function deshantara(t: number, lang: Lang): FigureFrame {
  // stay at each city, then glide to the next (and from the last back to the first)
  const u = t * PLACES.length;
  const at = Math.floor(u) % PLACES.length;
  const nx = (at + 1) % PLACES.length;
  const f = u - Math.floor(u);
  const ease = f < 0.6 ? 0 : 0.5 - 0.5 * Math.cos(((f - 0.6) / 0.4) * Math.PI);
  const a0 = PLACES[at]!;
  const a1 = PLACES[nx]!;
  const place = ease < 0.5 ? { ...a0, lat: a0.lat + (a1.lat - a0.lat) * ease, lon: a0.lon + (a1.lon - a0.lon) * ease } : { ...a1, lat: a0.lat + (a1.lat - a0.lat) * ease, lon: a0.lon + (a1.lon - a0.lon) * ease };
  const C = { x: 100, y: 98 };
  const R = 84;
  const shown = 3; // longitude angles drawn three times larger
  const rLat = R * Math.cos((place.lat * Math.PI) / 180);
  const rUj = R * Math.cos((23.18 * Math.PI) / 180);
  const dl = place.lon - UJJAIN;
  const P = polar(C.x, C.y, rLat, -90 + dl * shown);
  const Q = polar(C.x, C.y, rLat, -90);
  const shapes: Shape[] = [
    circle(C.x, C.y, R, { fill: "earth", opacity: 0.08, stroke: "earth", w: 1.2 }),
    circle(C.x, C.y, rLat, { stroke: "muted", w: 1, dash: "3 3" }),
    line(C.x, C.y, C.x, C.y + R, { stroke: "ink", w: 1.4 }),
    line(C.x, C.y, P.x, P.y, { stroke: "faint", w: 1 }),
    path(arc(C.x, C.y, rLat, -90, -90 + dl * shown), { stroke: "accent", w: 3 }),
  ];
  mark(shapes, C, L(lang, "मेरु", "Meru"), 0, -8, "ink");
  mark(shapes, { x: C.x, y: C.y + R }, L(lang, "लङ्का", "Laṅkā"), 0, 13, "ink");
  mark(shapes, { x: C.x, y: C.y + rUj }, L(lang, "उज्जयिनी", "Ujjayinī"), -26, 3, "muted");
  mark(shapes, Q, "", 0, 0, "faint");
  mark(shapes, P, L(lang, place.ne, place.en), 26, -2, "accent", 3.2);
  const lambajya = suryaJya(90 - place.lat);
  const girth = Math.sqrt(10 * 1600 * 1600);
  const local = (5059 * lambajya) / 3438;
  const yoj = (dl * local) / 360;
  const moon = (MOON_MOTION * yoj) / local;
  const ghati = dl / 6;
  const gh = Math.floor(ghati);
  const pala = (ghati - gh) * 60;
  const steps: Step[] = [
    { say: L(lang, "भूपरिधि: व्यास १६०० योजनको वर्गलाई १० ले गुणेर वर्गमूल (१.५९)", "Earth's girth: √(10 × 1600²) yojanas (1.59)"), eq: [`√(${num(lang, 10)} × ${num(lang, 1600)}²) = ${fmt(lang, girth, 1)} ≈ ${num(lang, 5059)}`] },
    { say: L(lang, "लम्बज्या: ९०° बाट अक्षांश घटाएर ज्या", "Co-latitude sine: the sine of 90° less the latitude"), eq: [`${L(lang, "ज्या", "sin")}(${num(lang, 90)}° − ${dms(lang, place.lat)}) = ${fmt(lang, lambajya)}`] },
    { say: L(lang, "स्फुट परिधि: आफ्नो अक्षांशमा पृथ्वीको घेरा (१.६०)", "True girth at that latitude (1.60)"), eq: [fr(`${num(lang, 5059)} × ${fmt(lang, lambajya)}`, num(lang, 3438)), ` = ${fmt(lang, local)} ${L(lang, "योजन", "yojanas")}`] },
    { say: L(lang, "देशान्तर अंश: उज्जयिनी (७५°४६′ पूर्व) बाट", "Longitude from Ujjayinī (75°46′ E)"), eq: [`${dms(lang, place.lon)} − ${dms(lang, UJJAIN)} = ${dms(lang, dl)} ${dl >= 0 ? L(lang, "पूर्व", "east") : L(lang, "पश्चिम", "west")}`] },
    { say: L(lang, "देशान्तर योजन", "That distance in yojanas"), eq: [fr(`${dms(lang, Math.abs(dl))} × ${fmt(lang, local)}`, `${num(lang, 360)}°`), ` = ${fmt(lang, Math.abs(yoj), 1)} ${L(lang, "योजन", "yojanas")}`] },
    {
      say: L(lang, "चन्द्रको फल: गति × योजन ÷ स्फुट परिधि, पूर्वमा घटाउने (१.६१)", "Moon's correction: motion × yojanas ÷ true girth, subtracted in the east (1.61)"),
      eq: [fr(`${L(lang, "७९०′३५″", "790′35″")} × ${fmt(lang, Math.abs(yoj), 1)}`, fmt(lang, local)), ` = ${fmt(lang, Math.abs(moon), 1)} ${L(lang, "कला", "′")} ${dl >= 0 ? "−" : "+"}`],
    },
    {
      say: L(lang, "समयको अन्तर: ३६०° = ६० घटी, त्यसैले ६ अंश = १ घटी", "Time difference: 360° = 60 ghaṭī, so 6° = 1 ghaṭī"),
      eq: [fr(dms(lang, Math.abs(dl)), num(lang, 6)), ` = ${num(lang, gh)} ${L(lang, "घटी", "ghaṭī")} ${fmt(lang, pala)} ${L(lang, "पल", "pala")}`],
    },
  ];
  return {
    shapes,
    key: [key("ink", L(lang, "मेरु", "Meru"), L(lang, "उत्तर ध्रुव, माथिबाट हेरेको", "North pole, seen from above")), key("ink", "", L(lang, "लङ्का–उज्जयिनी–मेरु रेखा", "Laṅkā–Ujjayinī–Meru line"), "line"), key("muted", "", L(lang, "आफ्नो अक्षांशको वृत्त", "One's own latitude circle"), "line"), key("accent", "", L(lang, "देशान्तर योजन (पूर्व–पश्चिम कोण ३ गुणा ठूलो)", "Distance in yojanas (east–west angle drawn 3× larger)"), "line")],
    readout: [
      `${L(lang, place.ne, place.en)} · ${L(lang, "अक्षांश", "lat.")} ${dms(lang, place.lat)} · ${L(lang, "देशान्तर", "from Ujjayinī")} ${dms(lang, dl)}`,
      `${L(lang, "स्फुट परिधि", "true girth")} ${fmt(lang, local)} · ${fmt(lang, Math.abs(yoj), 1)} ${L(lang, "योजन", "yojanas")} · ${num(lang, gh)} ${L(lang, "घटी", "gh.")} ${fmt(lang, pala)} ${L(lang, "पल", "p.")}`,
    ],
    steps,
  };
}

export const CLASSICAL_DRAW = {
  kalpa,
  ahargana: aharganaFigure,
  deshantara,
  "sighra-construction": sighraConstruction,
  "sighra-inferior": sighraInferior,
  "sighra-superior": sighraSuperior,
} satisfies Record<string, (t: number, lang: Lang) => FigureFrame>;
