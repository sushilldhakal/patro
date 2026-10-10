/**
 * The six panchanga reference tables — native port of web's
 * `PanchangaReferenceGuide.tsx`, reusing the same shared data modules
 * (`lib/wheel-data.ts`, `lib/tithi-wheel-data.ts`, `lib/nakshatra-icons.ts`,
 * `lib/wheel-locale.ts`) mobile already ports for its own wheel/kundali
 * screens. Registered in `lib/learn/learn-diagrams.tsx` as `table-*`.
 */
import { View } from "react-native";
import { Text } from "@/components/ui/Text";
import { LearnTable } from "@/components/learn/LearnTable";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { WHEEL_RASHIS, RASHI_LORDS, RASHI_ELEM, PADA_AKSHAR } from "@/lib/wheel-data";
import { NAKSHATRA_ICONS } from "@vedic-patro/domain/nakshatra-icons";
import { WHEEL_TITHIS, WHEEL_YOGAS, KAR_MOV, KAR_FIX_NAMES, KARANA_EN } from "@/lib/tithi-wheel-data";
import { NAK_LORD_EN, TATTVA_EN } from "@vedic-patro/domain/wheel-locale";

const YOGA_EN = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
  "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata",
  "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva",
  "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti",
];

const GRAHA_ROWS = [
  { ne: "सूर्य", en: "Sun", meaningNe: "आत्मा, पिता, अधिकार — राशि र सङ्क्रान्तिको माप", meaningEn: "Soul, father, authority — measures rashi and sankranti" },
  { ne: "चन्द्र", en: "Moon", meaningNe: "मन, माता — तिथि, नक्षत्र, पक्ष", meaningEn: "Mind, mother — tithi, nakshatra, paksha" },
  { ne: "मंगल", en: "Mars", meaningNe: "साहस, भाइ — मङ्गलवार, होरा", meaningEn: "Courage, siblings — Tuesday, hora" },
  { ne: "बुध", en: "Mercury", meaningNe: "बुद्धि, वाणी — बुधवार", meaningEn: "Intellect, speech — Wednesday" },
  { ne: "बृहस्पति", en: "Jupiter", meaningNe: "गुरु, ज्ञान — बिहीवार", meaningEn: "Teacher, knowledge — Thursday" },
  { ne: "शुक्र", en: "Venus", meaningNe: "प्रेम, सौन्दर्य — शुक्रवार", meaningEn: "Love, beauty — Friday" },
  { ne: "शनि", en: "Saturn", meaningNe: "कर्म, धैर्य — शनिवार", meaningEn: "Karma, patience — Saturday" },
  { ne: "राहु", en: "Rahu", meaningNe: "छाया ग्रह — ग्रहण, अप्रत्याशित परिवर्तन", meaningEn: "Shadow planet — eclipses, sudden change" },
  { ne: "केतु", en: "Ketu", meaningNe: "छाया ग्रह — मोक्ष, आध्यात्म", meaningEn: "Shadow planet — moksha, spirituality" },
];

function TableCaption({ children }: { children: string }) {
  return (
    <Text className="text-caption font-semibold text-muted-foreground" style={nepaliTextStyle(11)}>
      {children}
    </Text>
  );
}

export function RashiReferenceTable() {
  const { pick, digits } = useLocale();
  return (
    <View className="gap-1.5">
      <TableCaption>{pick("१२ राशि — प्रत्येक ३०° (जम्मा ३६०°)", "12 Rashis — each 30° (360° total)")}</TableCaption>
      <LearnTable
        headers={[pick("#", "#"), pick("राशि", "Rashi"), "°", pick("स्वामी", "Lord"), pick("तत्त्व", "Element")]}
        rows={WHEEL_RASHIS.map((r, i) => [
          digits(i + 1),
          pick(r.ne, r.en),
          `${digits(i * 30)}°–${digits((i + 1) * 30)}°`,
          pick(RASHI_LORDS[i]!, NAK_LORD_EN[RASHI_LORDS[i]!] ?? RASHI_LORDS[i]!),
          pick(RASHI_ELEM[i]!, TATTVA_EN[RASHI_ELEM[i]!] ?? RASHI_ELEM[i]!),
        ])}
      />
    </View>
  );
}

export function GrahaReferenceTable() {
  const { pick, digits } = useLocale();
  return (
    <View className="gap-1.5">
      <TableCaption>{pick("नव ग्रह (९) — पञ्चाङ्ग र कुण्डलीमा प्रयोग", "Nava Graha (9) — used in almanac and kundali")}</TableCaption>
      <LearnTable
        headers={[pick("#", "#"), pick("ग्रह", "Graha"), pick("संक्षिप्त अर्थ", "Brief meaning")]}
        rows={GRAHA_ROWS.map((g, i) => [digits(i + 1), pick(g.ne, g.en), pick(g.meaningNe, g.meaningEn)])}
      />
    </View>
  );
}

/**
 * Rashi + nakshatra tables together — native port of web's
 * `ComputationReferenceTables` (used in the "how we calculate" chapter's
 * foundation section, right after the observer/civil-day/Julian-day keys).
 */
export function ComputationReferenceDiagram() {
  return (
    <View className="gap-6">
      <RashiReferenceTable />
      <NakshatraReferenceTable />
    </View>
  );
}

export function NakshatraReferenceTable() {
  const { pick, digits } = useLocale();
  return (
    <View className="gap-1.5">
      <TableCaption>
        {pick("२७ नक्षत्र — प्रत्येक १३°२०′, चार पद (३°२०′ प्रति पद)", "27 Nakshatras — each 13°20′, four padas (3°20′ per pada)")}
      </TableCaption>
      <LearnTable
        headers={[
          pick("#", "#"),
          pick("नक्षत्र", "Nakshatra"),
          "°",
          pick("स्वामी", "Lord"),
          pick("चिह्न", "Symbol"),
          pick("पद १", "Pada 1"),
          pick("पद २", "Pada 2"),
          pick("पद ३", "Pada 3"),
          pick("पद ४", "Pada 4"),
        ]}
        rows={NAKSHATRA_ICONS.map((nak, i) => {
          const padas = PADA_AKSHAR[i]!;
          const startDeg = i * 13;
          return [
            digits(i + 1),
            pick(nak.ne, nak.en),
            `${digits(startDeg)}°${digits(20)}′–${digits(startDeg + 13)}°${digits(20)}′`,
            pick(nak.lord_ne, NAK_LORD_EN[nak.lord_ne] ?? nak.lord_ne),
            nak.sym_ne,
            ...padas,
          ];
        })}
      />
    </View>
  );
}

export function TithiReferenceTable() {
  const { pick, digits } = useLocale();
  return (
    <View className="gap-1.5">
      <TableCaption>{pick("३० तिथि — चन्द्र–सूर्यको १२° कोणीय दूरी", "30 Tithis — the 12° angular gap between Moon and Sun")}</TableCaption>
      <LearnTable
        headers={[pick("#", "#"), pick("तिथि", "Tithi"), pick("पक्ष", "Paksha"), pick("कोण (≈)", "Angle (≈)")]}
        rows={WHEEL_TITHIS.map((row, i) => [
          digits(i + 1),
          pick(row.ne, row.en),
          pick(row.paksha, `${row.pakshaEn} Paksha`),
          `${digits(i * 12)}°–${digits((i + 1) * 12)}°`,
        ])}
      />
    </View>
  );
}

export function YogaReferenceTable() {
  const { pick, digits } = useLocale();
  return (
    <View className="gap-1.5">
      <TableCaption>{pick("२७ योग — सूर्य + चन्द्रको देशान्तर जोड (प्रत्येक १३°२०′)", "27 Yogas — sum of Sun + Moon longitude (each 13°20′)")}</TableCaption>
      <LearnTable
        headers={[pick("#", "#"), pick("योग", "Yoga"), pick("° (≈)", "° (≈)")]}
        rows={WHEEL_YOGAS.map((y, i) => [
          digits(i + 1),
          pick(y, YOGA_EN[i] ?? y),
          `${digits(i * 13)}°${digits(20)}′–${digits((i + 1) * 13)}°${digits(20)}′`,
        ])}
      />
    </View>
  );
}

export function KaranaReferenceTable() {
  const { pick, digits } = useLocale();
  const charRows = KAR_MOV.map((ne) => ({ ne, typeNe: "चर (७)", typeEn: "Movable (7)" }));
  const sthiraRows = KAR_FIX_NAMES.slice(1).map((ne) => ({ ne, typeNe: "स्थिर (४)", typeEn: "Fixed (4)" }));

  const rows: string[][] = [
    [
      digits(1),
      `${pick("किंस्तुघ्न", KARANA_EN["किंस्तुघ्न"] ?? "Kimstughna")}`,
      pick("स्थिर", "Fixed"),
      pick("शुक्ल प्रतिपदाको पहिलो आधा — वर्षमा एक पटक", "First half of Shukla Pratipada — once a year"),
    ],
    ...charRows.map((k, i) => [
      digits(i + 2),
      `${pick(k.ne, KARANA_EN[k.ne] ?? k.ne)}${k.ne === "विष्टि" ? pick(" (भद्रा)", " (Bhadra)") : ""}`,
      pick(k.typeNe, k.typeEn),
      pick("महिनाभरि बारम्बार दोहोरिन्छ", "Repeats throughout the month"),
    ]),
    ...sthiraRows.map((k, i) => [
      digits(i + 9),
      pick(k.ne, KARANA_EN[k.ne] ?? k.ne),
      pick(k.typeNe, k.typeEn),
      pick(
        "महिनामा एक–एक पटक — कृष्ण चतुर्दशी, औंसी, शुक्ल प्रतिपदा, पूर्णिमा",
        "Once each per month — Krishna Chaturdashi, Aaushi, Shukla Pratipada, Purnima",
      ),
    ]),
  ];

  return (
    <View className="gap-1.5">
      <TableCaption>{pick("११ करण — तिथिको आधा (६° कोण); महिनामा ६० करण", "11 Karanas — half a tithi (6° angle); 60 karanas per month")}</TableCaption>
      <LearnTable headers={[pick("#", "#"), pick("करण", "Karana"), pick("प्रकार", "Type"), pick("टिप्पणी", "Note")]} rows={rows} />
      <Text className="text-caption text-muted-foreground" style={nepaliTextStyle(11)}>
        {pick(
          "क्रम: किंस्तुघ्न → (बव…विष्टि)×८ → शकुनि → चतुष्पद → नाग → किंस्तुघ्न — जम्मा ६० करण/महिना।",
          "Order: Kimstughna → (Bava…Vishti)×8 → Shakuni → Chatushpada → Naga → Kimstughna — 60 karanas/month in all.",
        )}
      </Text>
    </View>
  );
}
