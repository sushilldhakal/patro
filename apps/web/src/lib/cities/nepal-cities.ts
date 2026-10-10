import type { City } from "@/lib/api";

/**
 * Curated list of Nepal's district headquarters (the traditional 75-district,
 * 14-zone scheme) used for panchanga locations. Coordinates come from the
 * classic patro table (degrees/minutes converted to decimals); the panchanga
 * engine is driven by lat/lon + Asia/Kathmandu, so no backend city_id is needed.
 *
 * The historical "local time correction" column (e.g. Kathmandu −3।44) is not
 * stored because it is fully derivable from longitude: (lon − 86°15′) × 4 min.
 */
export interface NepalCity {
  /** Stable synthetic id. Negative so it never collides with backend city ids. */
  id: number;
  /** English district name. */
  name_en: string;
  /** Nepali display name, e.g. "झापा (चन्द्रगढी)". */
  name_ne: string;
  /** English headquarters town, when it differs from the district name. */
  hq_en?: string;
  /** Zone (अञ्चल) in English. */
  zone_en: string;
  /** Zone (अञ्चल) in Nepali. */
  zone_ne: string;
  lat: number;
  lon: number;
}

/** Nepal district headquarters, grouped by zone (east → west). */
export const NEPAL_CITIES: NepalCity[] = [
  // मेची अञ्चल — Mechi
  { id: -1, name_en: "Jhapa", name_ne: "झापा (चन्द्रगढी)", hq_en: "Chandragadhi", zone_en: "Mechi", zone_ne: "मेची", lat: 26.5833, lon: 88.0667 },
  { id: -2, name_en: "Taplejung", name_ne: "ताप्लेजुङ", zone_en: "Mechi", zone_ne: "मेची", lat: 27.35, lon: 87.6833 },
  { id: -3, name_en: "Panchthar", name_ne: "पाँचथर (फिदिम)", hq_en: "Phidim", zone_en: "Mechi", zone_ne: "मेची", lat: 27.1333, lon: 87.7667 },
  { id: -4, name_en: "Ilam", name_ne: "इलाम", zone_en: "Mechi", zone_ne: "मेची", lat: 26.9167, lon: 87.9167 },

  // कोशी अञ्चल — Koshi
  { id: -5, name_en: "Morang", name_ne: "मोरङ (विराटनगर)", hq_en: "Biratnagar", zone_en: "Koshi", zone_ne: "कोशी", lat: 26.45, lon: 87.2833 },
  { id: -6, name_en: "Sunsari", name_ne: "सुनसरी (इनरुवा)", hq_en: "Inaruwa", zone_en: "Koshi", zone_ne: "कोशी", lat: 26.6, lon: 87.15 },
  { id: -7, name_en: "Dhankuta", name_ne: "धनकुटा", zone_en: "Koshi", zone_ne: "कोशी", lat: 26.9667, lon: 87.3333 },
  { id: -8, name_en: "Terhathum", name_ne: "तेह्रथुम", zone_en: "Koshi", zone_ne: "कोशी", lat: 27.1333, lon: 87.5333 },
  { id: -9, name_en: "Sankhuwasabha", name_ne: "संखुवासभा", zone_en: "Koshi", zone_ne: "कोशी", lat: 27.3667, lon: 87.2167 },
  { id: -10, name_en: "Bhojpur", name_ne: "भोजपुर", zone_en: "Koshi", zone_ne: "कोशी", lat: 27.1667, lon: 87.0667 },

  // सगरमाथा अञ्चल — Sagarmatha
  { id: -11, name_en: "Solukhumbu", name_ne: "सोलुखुम्बु (सल्लेरी)", hq_en: "Salleri", zone_en: "Sagarmatha", zone_ne: "सगरमाथा", lat: 27.5, lon: 86.6 },
  { id: -12, name_en: "Khotang", name_ne: "खोटाङ (दिक्तेल)", hq_en: "Diktel", zone_en: "Sagarmatha", zone_ne: "सगरमाथा", lat: 27.2167, lon: 86.8 },
  { id: -13, name_en: "Okhaldhunga", name_ne: "ओखलढुङ्गा", zone_en: "Sagarmatha", zone_ne: "सगरमाथा", lat: 27.3167, lon: 86.5333 },
  { id: -14, name_en: "Udayapur", name_ne: "उदयपुर (गाईघाट)", hq_en: "Gaighat", zone_en: "Sagarmatha", zone_ne: "सगरमाथा", lat: 26.7833, lon: 86.5333 },
  { id: -15, name_en: "Saptari", name_ne: "सप्तरी", hq_en: "Rajbiraj", zone_en: "Sagarmatha", zone_ne: "सगरमाथा", lat: 26.5333, lon: 86.75 },
  { id: -16, name_en: "Siraha", name_ne: "सिरहा", zone_en: "Sagarmatha", zone_ne: "सगरमाथा", lat: 26.65, lon: 86.2167 },

  // जनकपुर अञ्चल — Janakpur
  { id: -17, name_en: "Dhanusha", name_ne: "धनुषा (जनकपुरधाम)", hq_en: "Janakpur", zone_en: "Janakpur", zone_ne: "जनकपुर", lat: 26.7167, lon: 85.9333 },
  { id: -18, name_en: "Mahottari", name_ne: "महोत्तरी (जलेश्वर)", hq_en: "Jaleshwar", zone_en: "Janakpur", zone_ne: "जनकपुर", lat: 26.65, lon: 85.8 },
  { id: -19, name_en: "Sarlahi", name_ne: "सर्लाही (मलङ्गवा)", hq_en: "Malangwa", zone_en: "Janakpur", zone_ne: "जनकपुर", lat: 26.85, lon: 85.55 },
  { id: -20, name_en: "Sindhuli", name_ne: "सिन्धुली (माढी)", hq_en: "Sindhulimadi", zone_en: "Janakpur", zone_ne: "जनकपुर", lat: 26.7167, lon: 85.9167 },
  { id: -21, name_en: "Ramechhap", name_ne: "रामेछाप (मन्थली)", hq_en: "Manthali", zone_en: "Janakpur", zone_ne: "जनकपुर", lat: 27.45, lon: 86.1 },
  { id: -22, name_en: "Dolakha", name_ne: "दोलखा (चरिकोट)", hq_en: "Charikot", zone_en: "Janakpur", zone_ne: "जनकपुर", lat: 27.6833, lon: 86.05 },

  // बागमती अञ्चल — Bagmati
  { id: -23, name_en: "Sindhupalchok", name_ne: "सिन्धुपाल्चोक (चौतारा)", hq_en: "Chautara", zone_en: "Bagmati", zone_ne: "बागमती", lat: 27.7833, lon: 85.7167 },
  { id: -24, name_en: "Kavrepalanchok", name_ne: "काभ्रेपलाञ्चोक", hq_en: "Dhulikhel", zone_en: "Bagmati", zone_ne: "बागमती", lat: 27.6167, lon: 85.5667 },
  { id: -25, name_en: "Lalitpur", name_ne: "ललितपुर (पाटन)", hq_en: "Patan", zone_en: "Bagmati", zone_ne: "बागमती", lat: 27.6833, lon: 85.3333 },
  { id: -26, name_en: "Bhaktapur", name_ne: "भक्तपुर", zone_en: "Bagmati", zone_ne: "बागमती", lat: 27.6667, lon: 85.4333 },
  { id: -27, name_en: "Kathmandu", name_ne: "काठमाडौँ", zone_en: "Bagmati", zone_ne: "बागमती", lat: 27.7, lon: 85.3167 },
  { id: -28, name_en: "Nuwakot", name_ne: "नुवाकोट (विदुर)", hq_en: "Bidur", zone_en: "Bagmati", zone_ne: "बागमती", lat: 27.8833, lon: 85.1333 },
  { id: -29, name_en: "Rasuwa", name_ne: "रसुवा (धुन्चे)", hq_en: "Dhunche", zone_en: "Bagmati", zone_ne: "बागमती", lat: 28.1167, lon: 85.3 },
  { id: -30, name_en: "Dhading", name_ne: "धादिङ", hq_en: "Nilkantha", zone_en: "Bagmati", zone_ne: "बागमती", lat: 27.9, lon: 84.9 },

  // नारायणी अञ्चल — Narayani
  { id: -31, name_en: "Makwanpur", name_ne: "मकवानपुर (हेटौंडा)", hq_en: "Hetauda", zone_en: "Narayani", zone_ne: "नारायणी", lat: 27.4333, lon: 85.0333 },
  { id: -32, name_en: "Rautahat", name_ne: "रौतहट (गौर)", hq_en: "Gaur", zone_en: "Narayani", zone_ne: "नारायणी", lat: 26.7667, lon: 85.2667 },
  { id: -33, name_en: "Bara", name_ne: "बारा (कलैया)", hq_en: "Kalaiya", zone_en: "Narayani", zone_ne: "नारायणी", lat: 27.0333, lon: 85.0333 },
  { id: -34, name_en: "Parsa", name_ne: "पर्सा (वीरगञ्ज)", hq_en: "Birganj", zone_en: "Narayani", zone_ne: "नारायणी", lat: 26.9833, lon: 84.8667 },
  { id: -35, name_en: "Chitwan", name_ne: "चितवन (भरतपुर)", hq_en: "Bharatpur", zone_en: "Narayani", zone_ne: "नारायणी", lat: 27.6667, lon: 84.4333 },

  // गण्डकी अञ्चल — Gandaki
  { id: -36, name_en: "Gorkha", name_ne: "गोर्खा (गोरखाकाली)", hq_en: "Gorkha", zone_en: "Gandaki", zone_ne: "गण्डकी", lat: 28.0, lon: 84.6 },
  { id: -37, name_en: "Lamjung", name_ne: "लमजुङ (बेसीशहर)", hq_en: "Besisahar", zone_en: "Gandaki", zone_ne: "गण्डकी", lat: 28.2333, lon: 84.3833 },
  { id: -38, name_en: "Manang", name_ne: "मनाङ (चामे)", hq_en: "Chame", zone_en: "Gandaki", zone_ne: "गण्डकी", lat: 28.55, lon: 84.25 },
  { id: -39, name_en: "Kaski", name_ne: "कास्की (पोखरा)", hq_en: "Pokhara", zone_en: "Gandaki", zone_ne: "गण्डकी", lat: 28.2167, lon: 83.9833 },
  { id: -40, name_en: "Tanahun", name_ne: "तनहुँ (दमौली)", hq_en: "Damauli", zone_en: "Gandaki", zone_ne: "गण्डकी", lat: 27.9667, lon: 84.2833 },
  { id: -41, name_en: "Syangja", name_ne: "स्याङ्जा", zone_en: "Gandaki", zone_ne: "गण्डकी", lat: 28.1, lon: 83.8833 },

  // धवलागिरी अञ्चल — Dhawalagiri
  { id: -42, name_en: "Parbat", name_ne: "पर्वत (कुश्मा)", hq_en: "Kushma", zone_en: "Dhawalagiri", zone_ne: "धवलागिरी", lat: 28.2333, lon: 83.7 },
  { id: -43, name_en: "Baglung", name_ne: "बागलुङ", zone_en: "Dhawalagiri", zone_ne: "धवलागिरी", lat: 28.2667, lon: 83.6 },
  { id: -44, name_en: "Myagdi", name_ne: "म्याग्दी (बेनी)", hq_en: "Beni", zone_en: "Dhawalagiri", zone_ne: "धवलागिरी", lat: 28.35, lon: 83.5667 },
  { id: -45, name_en: "Mustang", name_ne: "मुस्ताङ (जोमसोम)", hq_en: "Jomsom", zone_en: "Dhawalagiri", zone_ne: "धवलागिरी", lat: 28.7833, lon: 83.7333 },

  // लुम्बिनी अञ्चल — Lumbini
  { id: -46, name_en: "Palpa", name_ne: "पाल्पा (तानसेन)", hq_en: "Tansen", zone_en: "Lumbini", zone_ne: "लुम्बिनी", lat: 27.8667, lon: 83.8833 },
  { id: -47, name_en: "Nawalparasi", name_ne: "नवलपरासी (परासी)", hq_en: "Parasi", zone_en: "Lumbini", zone_ne: "लुम्बिनी", lat: 27.5333, lon: 83.65 },
  { id: -48, name_en: "Rupandehi", name_ne: "रूपन्देही (भैरहवा)", hq_en: "Bhairahawa", zone_en: "Lumbini", zone_ne: "लुम्बिनी", lat: 27.5, lon: 83.45 },
  { id: -49, name_en: "Kapilvastu", name_ne: "कपिलवस्तु (तौलिहवा)", hq_en: "Taulihawa", zone_en: "Lumbini", zone_ne: "लुम्बिनी", lat: 27.55, lon: 83.05 },
  { id: -50, name_en: "Arghakhanchi", name_ne: "अर्घाखाँची (सन्धिखर्क)", hq_en: "Sandhikharka", zone_en: "Lumbini", zone_ne: "लुम्बिनी", lat: 27.9667, lon: 83.1333 },
  { id: -51, name_en: "Gulmi", name_ne: "गुल्मी (तम्घास)", hq_en: "Tamghas", zone_en: "Lumbini", zone_ne: "लुम्बिनी", lat: 28.0167, lon: 83.25 },

  // कर्णाली अञ्चल — Karnali
  { id: -52, name_en: "Dolpa", name_ne: "डोल्पा (दुनै)", hq_en: "Dunai", zone_en: "Karnali", zone_ne: "कर्णाली", lat: 28.9333, lon: 82.9 },
  { id: -53, name_en: "Jumla", name_ne: "जुम्ला (खलङ्गा)", hq_en: "Khalanga", zone_en: "Karnali", zone_ne: "कर्णाली", lat: 29.2833, lon: 82.1833 },
  { id: -54, name_en: "Kalikot", name_ne: "कालिकोट (मान्मा)", hq_en: "Manma", zone_en: "Karnali", zone_ne: "कर्णाली", lat: 29.15, lon: 81.6 },
  { id: -55, name_en: "Mugu", name_ne: "मुगु (गमगढी)", hq_en: "Gamgadhi", zone_en: "Karnali", zone_ne: "कर्णाली", lat: 29.55, lon: 82.1667 },
  { id: -56, name_en: "Humla", name_ne: "हुम्ला (सिमिकोट)", hq_en: "Simikot", zone_en: "Karnali", zone_ne: "कर्णाली", lat: 29.9667, lon: 81.8167 },

  // राप्ती अञ्चल — Rapti
  { id: -57, name_en: "Rukum", name_ne: "रुकुम (खलङ्गा)", hq_en: "Musikot", zone_en: "Rapti", zone_ne: "राप्ती", lat: 28.6167, lon: 82.45 },
  { id: -58, name_en: "Salyan", name_ne: "सल्यान (खलङ्गा)", hq_en: "Khalanga", zone_en: "Rapti", zone_ne: "राप्ती", lat: 28.3833, lon: 82.1667 },
  { id: -59, name_en: "Rolpa", name_ne: "रोल्पा (लिवाङ)", hq_en: "Liwang", zone_en: "Rapti", zone_ne: "राप्ती", lat: 28.3, lon: 82.6333 },
  { id: -60, name_en: "Pyuthan", name_ne: "प्यूठान (खलङ्गा)", hq_en: "Khalanga", zone_en: "Rapti", zone_ne: "राप्ती", lat: 28.0833, lon: 82.9 },
  { id: -61, name_en: "Dang", name_ne: "दाङ (घोराही)", hq_en: "Ghorahi", zone_en: "Rapti", zone_ne: "राप्ती", lat: 28.0333, lon: 82.4833 },

  // भेरी अञ्चल — Bheri
  { id: -62, name_en: "Banke", name_ne: "बाँके (नेपालगञ्ज)", hq_en: "Nepalgunj", zone_en: "Bheri", zone_ne: "भेरी", lat: 28.0667, lon: 81.6333 },
  { id: -63, name_en: "Bardiya", name_ne: "बर्दिया (गुलरिया)", hq_en: "Gulariya", zone_en: "Bheri", zone_ne: "भेरी", lat: 28.2, lon: 81.3333 },
  { id: -64, name_en: "Surkhet", name_ne: "सुर्खेत (वीरेन्द्रनगर)", hq_en: "Birendranagar", zone_en: "Bheri", zone_ne: "भेरी", lat: 28.6, lon: 81.65 },
  { id: -65, name_en: "Jajarkot", name_ne: "जाजरकोट", hq_en: "Khalanga", zone_en: "Bheri", zone_ne: "भेरी", lat: 28.7, lon: 82.2 },
  { id: -66, name_en: "Dailekh", name_ne: "दैलेख", zone_en: "Bheri", zone_ne: "भेरी", lat: 28.8333, lon: 81.7167 },

  // सेती अञ्चल — Seti
  { id: -67, name_en: "Bajhang", name_ne: "बझाङ (चैनपुर)", hq_en: "Chainpur", zone_en: "Seti", zone_ne: "सेती", lat: 29.55, lon: 81.2 },
  { id: -68, name_en: "Bajura", name_ne: "बाजुरा (मार्तडी)", hq_en: "Martadi", zone_en: "Seti", zone_ne: "सेती", lat: 29.45, lon: 81.4833 },
  { id: -69, name_en: "Achham", name_ne: "अछाम (मंगलसेन)", hq_en: "Mangalsen", zone_en: "Seti", zone_ne: "सेती", lat: 29.1333, lon: 81.25 },
  { id: -70, name_en: "Doti", name_ne: "डोटी (सिलगढी)", hq_en: "Silgadhi", zone_en: "Seti", zone_ne: "सेती", lat: 29.2667, lon: 80.9833 },
  { id: -71, name_en: "Kailali", name_ne: "कैलाली (धनगढी)", hq_en: "Dhangadhi", zone_en: "Seti", zone_ne: "सेती", lat: 28.6833, lon: 80.6 },

  // महाकाली अञ्चल — Mahakali
  { id: -72, name_en: "Kanchanpur", name_ne: "कञ्चनपुर", hq_en: "Bhimdatta", zone_en: "Mahakali", zone_ne: "महाकाली", lat: 28.95, lon: 80.1833 },
  { id: -73, name_en: "Dadeldhura", name_ne: "डडेलधुरा", zone_en: "Mahakali", zone_ne: "महाकाली", lat: 29.3, lon: 80.5833 },
  { id: -74, name_en: "Baitadi", name_ne: "बैतडी", zone_en: "Mahakali", zone_ne: "महाकाली", lat: 29.55, lon: 80.2667 },
  { id: -75, name_en: "Darchula", name_ne: "दार्चुला", zone_en: "Mahakali", zone_ne: "महाकाली", lat: 29.85, lon: 80.55 },
];

/** Nepal district HQs are computed from coordinates in Nepal Standard Time. */
const NEPAL_TIMEZONE = "Asia/Kathmandu";

/**
 * Beyond this distance from any district HQ we assume the point is outside
 * Nepal and let the caller fall back to raw coordinates. Nepal is dense with
 * 75 HQs, so any in-country point sits well within this radius.
 */
export const NEPAL_NEAREST_MAX_KM = 120;

/** English label used in search results and stored location labels. */
export function nepalCityEnglishLabel(city: NepalCity): string {
  return city.hq_en ? `${city.name_en} (${city.hq_en})` : city.name_en;
}

/** Locale-aware primary label. */
export function nepalCityLabel(city: NepalCity, lang: string): string {
  return lang === "ne" ? city.name_ne : nepalCityEnglishLabel(city);
}

/**
 * Adapt a curated Nepal city to the shared `City` shape so it flows through the
 * same combobox/rendering as backend results. Marked `local` so the location is
 * built from lat/lon (not a backend city_id). Keep `ascii_name` English so API
 * resolve never receives Devanagari; `name` is locale-aware for display.
 */
export function nepalCityToCity(city: NepalCity, lang: string): City {
  const en = nepalCityEnglishLabel(city);
  return {
    id: city.id,
    name: nepalCityLabel(city, lang),
    ascii_name: en,
    lat: city.lat,
    lon: city.lon,
    country: "NP",
    population: 0,
    timezone: NEPAL_TIMEZONE,
    admin1_name: lang === "ne" ? city.zone_ne : city.zone_en,
    local: true,
  };
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** Coordinates are stored rounded to 4 dp, so an exact-ish match is enough. */
function isSameCoord(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}

/** Curated district matching a stored location — by coordinates, else by name. */
export function findNepalCity(
  name: string | undefined | null,
  lat?: number | null,
  lon?: number | null,
): NepalCity | undefined {
  if (lat != null && lon != null) {
    const byCoord = NEPAL_CITIES.find(
      (c) => isSameCoord(c.lat, lat) && isSameCoord(c.lon, lon),
    );
    if (byCoord) return byCoord;
  }

  const needle = name?.trim();
  if (!needle) return undefined;
  const lower = needle.toLowerCase();
  return NEPAL_CITIES.find(
    (c) =>
      c.name_ne === needle ||
      c.name_ne.split(" ")[0] === needle ||
      c.name_en.toLowerCase() === lower ||
      c.hq_en?.toLowerCase() === lower ||
      nepalCityEnglishLabel(c).toLowerCase() === lower,
  );
}

/**
 * Re-render a stored location label in the active language. Labels are frozen
 * at pick time ("काठमाडौँ, NP"), so without this a Nepali pick stayed in
 * Devanagari after switching to English (and vice versa). Only the city part is
 * rewritten, and only for the curated districts — cities from the geocoding
 * backend have no Nepali name to switch to, so their label is returned as-is.
 */
export function localizeNepalCityLabel(
  label: string,
  lang: string,
  lat?: number | null,
  lon?: number | null,
): string {
  const [head, ...rest] = label.split(",");
  const city = findNepalCity(head, lat, lon);
  if (!city) return label;
  const localized = nepalCityLabel(city, lang.slice(0, 2) === "en" ? "en" : "ne");
  return [localized, ...rest].join(",");
}

/** Case-insensitive match on district, HQ, Nepali name and zone. */
export function searchNepalCities(query: string, limit = 15): NepalCity[] {
  const q = normalize(query);
  if (q.length < 2) return [];
  const matches = NEPAL_CITIES.filter((c) => {
    return (
      c.name_en.toLowerCase().includes(q) ||
      (c.hq_en?.toLowerCase().includes(q) ?? false) ||
      c.name_ne.includes(query.trim()) ||
      c.zone_en.toLowerCase().includes(q) ||
      c.zone_ne.includes(query.trim())
    );
  });
  return matches.slice(0, limit);
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Nearest district HQ to a coordinate, with its great-circle distance in km. */
export function nearestNepalCity(
  lat: number,
  lon: number,
): { city: NepalCity; distanceKm: number } {
  let best = NEPAL_CITIES[0];
  let bestKm = Infinity;
  for (const c of NEPAL_CITIES) {
    const km = haversineKm(lat, lon, c.lat, c.lon);
    if (km < bestKm) {
      bestKm = km;
      best = c;
    }
  }
  return { city: best, distanceKm: bestKm };
}
