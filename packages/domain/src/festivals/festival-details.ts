// Festival detail enrichment for the day route (`festivals::details`): `when`, `about`, `vidhi`, importance.
import details from "./rules/festival_details_v1.json";
import { isPublicHoliday, rule } from "./festival-engine";

type Json = Record<string, unknown>;

const TITHI_NE = ["प्रतिपदा", "द्वितीया", "तृतीया", "चतुर्थी", "पञ्चमी", "षष्ठी", "सप्तमी", "अष्टमी", "नवमी", "दशमी", "एकादशी", "द्वादशी", "त्रयोदशी", "चतुर्दशी", "पूर्णिमा"];
const TITHI_EN = ["Pratipada", "Dwitiya", "Tritiya", "Chaturthi", "Panchami", "Shashthi", "Saptami", "Ashtami", "Navami", "Dashami", "Ekadashi", "Dwadashi", "Trayodashi", "Chaturdashi", "Purnima"];
const MASA_NE: Record<string, string> = { Baishakh: "वैशाख", Jestha: "ज्येष्ठ", Ashadh: "आषाढ", Shrawan: "श्रावण", Bhadra: "भाद्रपद", Ashwin: "आश्विन", Kartik: "कार्तिक", Mangsir: "मार्गशीर्ष", Poush: "पौष", Magh: "माघ", Falgun: "फाल्गुन", Chaitra: "चैत्र" };
const BS_NE = ["वैशाख", "जेठ", "असार", "साउन", "भदौ", "असोज", "कार्तिक", "मंसिर", "पुस", "माघ", "फागुन", "चैत"];
const BS_EN = ["Baishakh", "Jestha", "Asar", "Shrawan", "Bhadra", "Asoj", "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"];
const AD_NE = ["जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन", "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर"];
const AD_EN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const neDigits = (n: number) => String(n).replace(/[0-9]/g, (d) => "०१२३४५६७८९"[Number(d)]);
const isInt = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v);
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function festivalWhen(r: Json): Json | null {
  const kind = (r.type as string | undefined) ?? "";
  if (kind === "lunar" && typeof r.lunar_month === "string" && isInt(r.tithi)) {
    const paksha = (r.paksha as string | undefined) ?? "shukla";
    const amavasya = r.tithi === 15 && paksha === "krishna";
    const tNe = amavasya ? "औंसी" : TITHI_NE[r.tithi - 1];
    const tEn = amavasya ? "Amavasya" : TITHI_EN[r.tithi - 1];
    const pNe = paksha === "shukla" ? "शुक्ल" : paksha === "krishna" ? "कृष्ण" : paksha;
    return { ne: `${MASA_NE[r.lunar_month] ?? r.lunar_month} ${pNe} ${tNe}`, en: `${r.lunar_month} ${cap(paksha)} ${tEn}` };
  }
  if ((kind === "bs_fixed" || kind === "solar") && isInt(r.bs_month)) {
    const day = (isInt(r.bs_day) ? r.bs_day : isInt(r.solar_day) ? r.solar_day : 1) as number;
    const i = Math.max(0, r.bs_month - 1);
    return { ne: `${BS_NE[i]} ${neDigits(day)} गते`, en: `${BS_EN[i]} ${day}` };
  }
  if (kind === "ad_fixed" && isInt(r.ad_month) && isInt(r.ad_day)) {
    const i = Math.max(0, r.ad_month - 1);
    return { ne: `${AD_NE[i]} ${neDigits(r.ad_day)}`, en: `${AD_EN[i]} ${r.ad_day}` };
  }
  if (kind === "ayana") {
    return r.ayana === "uttara"
      ? { ne: "शीत अयनान्त (सायन सूर्य २७०°)", en: "December solstice (tropical Sun 270°)" }
      : { ne: "ग्रीष्म अयनान्त (सायन सूर्य ९०°)", en: "June solstice (tropical Sun 90°)" };
  }
  if (kind === "announced") return { ne: "नेपाल सरकारले तोकेका दिन", en: "On the days the Government of Nepal announces" };
  return null;
}

function textEntry(own: Json): [Json, Json | null] {
  const about = { ne: own.about_ne ?? null, en: own.about_en ?? null };
  const v = own.vidhi_ne;
  const has = (Array.isArray(v) && v.length > 0) || (typeof v === "string" && v.length > 0);
  return [about, has ? { ne: own.vidhi_ne ?? null, en: own.vidhi_en ?? null } : null];
}

function textFor(id: string): [Json, Json | null] | null {
  const book = details as unknown as { festivals: Record<string, Json>; families: Json[] };
  const own = book.festivals[id];
  if (own) return textEntry(own);
  const r = rule(id) as Json;
  const alias = (r.alias_of ?? r.subsumed_by) as string | undefined;
  if (alias && book.festivals[alias]) return textEntry(book.festivals[alias]);
  for (const family of book.families) {
    const m = family.match;
    if (typeof m === "string" && id.includes(m)) return textEntry(family);
  }
  return null;
}

/** `attach_festival_details`: each festival object gets its enrichment fields. */
export function attachFestivalDetails(festivals: Json[]): void {
  for (const f of festivals) {
    const id = f.id;
    if (typeof id !== "string") continue;
    const r = rule(id) as Json;
    const [about, vidhi] = textFor(id) ?? [null, null];
    f.is_public_holiday = isPublicHoliday(id);
    f.importance = r.importance ?? null;
    f.duration_days = r.duration_days ?? null;
    f.when = festivalWhen(r);
    f.about = about;
    f.vidhi = vidhi;
  }
}
