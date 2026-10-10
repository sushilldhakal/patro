import { useTranslation } from "react-i18next";
import { NAKSHATRA_ICONS } from "@/lib/nakshatra-icons";
import { patroMono } from "@/lib/patro-classes";
import {
  KAR_FIX_NAMES,
  KAR_MOV,
  KARANA_EN,
  WHEEL_TITHIS,
  WHEEL_YOGAS,
} from "@/lib/tithi-wheel-data";
import { PADA_AKSHAR, RASHI_ELEM, RASHI_LORDS, getWheelRashis } from "@/lib/wheel-data";
import { NAK_LORD_EN, TATTVA_EN } from "@/lib/wheel-locale";
import { useLocale, bilingualText } from "@/i18n/locale";
import {
  learnRefCaption,
  learnRefDeg,
  learnRefHighlightRow,
  learnRefNote,
  learnRefPada,
  learnRefSymNe,
  learnRefTable,
  learnRefWrap,
  tmCardCap,
} from "@/lib/learn-classes";
import { cn } from "@/lib/utils";

/* Catalogue keys, not text: this table is built at module level, above any hook. */
const GRAHA_ROWS = [
  { name: "grahas.sun", meaning: "learn.diagrams.graha_meaning_sun" },
  { name: "grahas.moon", meaning: "learn.diagrams.graha_meaning_moon" },
  { name: "learn.diagrams.graha_mars", meaning: "learn.diagrams.graha_meaning_mars" },
  { name: "grahas.mercury", meaning: "learn.diagrams.graha_meaning_mercury" },
  { name: "grahas.jupiter", meaning: "learn.diagrams.graha_meaning_jupiter" },
  { name: "grahas.venus", meaning: "learn.diagrams.graha_meaning_venus" },
  { name: "grahas.saturn", meaning: "learn.diagrams.graha_meaning_saturn" },
  { name: "grahas.rahu", meaning: "learn.diagrams.graha_meaning_rahu" },
  { name: "grahas.ketu", meaning: "learn.diagrams.graha_meaning_ketu" },
] as const;

const YOGA_EN = [
  "Vishkambha", "Priti", "Ayushman", "Saubhagya", "Shobhana", "Atiganda",
  "Sukarma", "Dhriti", "Shula", "Ganda", "Vriddhi", "Dhruva", "Vyaghata",
  "Harshana", "Vajra", "Siddhi", "Vyatipata", "Variyana", "Parigha", "Shiva",
  "Siddha", "Sadhya", "Shubha", "Shukla", "Brahma", "Indra", "Vaidhriti",
];

function RefTable({
  caption,
  children,
}: {
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={learnRefWrap}>
      <table className={learnRefTable}>
        {caption && <caption className={learnRefCaption}>{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function RashiReferenceTable() {
  const { t } = useTranslation();
  const { lang, digits: N } = useLocale();
  return (
    <RefTable caption={t("learn.12_rashis_each_30_360_total")}>
      <thead>
        <tr>
          <th>#</th>
          <th>{t("learn.rashi")}</th>
          <th>°</th>
          <th>{t("learn.lord")}</th>
          <th>{t("learn.element")}</th>
        </tr>
      </thead>
      <tbody>
        {getWheelRashis().map((r, i) => (
          <tr key={r.ne}>
            <td className={patroMono}>{N(i + 1)}</td>
            <td>{bilingualText(lang, r.ne, r.en)}</td>
            <td className={cn(patroMono, learnRefDeg)}>
              {N(i * 30)}°–{N((i + 1) * 30)}°
            </td>
            <td>{bilingualText(lang, RASHI_LORDS[i], NAK_LORD_EN[RASHI_LORDS[i]] ?? RASHI_LORDS[i])}</td>
            <td>{bilingualText(lang, RASHI_ELEM[i], TATTVA_EN[RASHI_ELEM[i]] ?? RASHI_ELEM[i])}</td>
          </tr>
        ))}
      </tbody>
    </RefTable>
  );
}

export function GrahaReferenceTable() {
  const { t } = useTranslation();
  const { digits: N } = useLocale();
  return (
    <RefTable caption={t("learn.nava_graha_9_used_in_panchanga_and_kundali")}>
      <thead>
        <tr>
          <th>#</th>
          <th>{t("learn.graha")}</th>
          <th>{t("learn.brief_meaning")}</th>
        </tr>
      </thead>
      <tbody>
        {GRAHA_ROWS.map((g, i) => (
          <tr key={g.name}>
            <td className={patroMono}>{N(i + 1)}</td>
            <td>{t(g.name)}</td>
            <td>{t(g.meaning)}</td>
          </tr>
        ))}
      </tbody>
    </RefTable>
  );
}

export function NakshatraReferenceTable() {
  const { t } = useTranslation();
  const { lang, digits: N } = useLocale();
  return (
    <RefTable caption={t("learn.27_nakshatras_each_13_20_four_padas_3_20_per_pada")}>
      <thead>
        <tr>
          <th>#</th>
          <th>{t("learn.nakshatra")}</th>
          <th>°</th>
          <th>{t("learn.lord")}</th>
          <th>{t("learn.symbol")}</th>
          <th>{t("learn.pada_1")}</th>
          <th>{t("learn.pada_2")}</th>
          <th>{t("learn.pada_3")}</th>
          <th>{t("learn.pada_4")}</th>
        </tr>
      </thead>
      <tbody>
        {NAKSHATRA_ICONS.map((nak, i) => {
          const padas = PADA_AKSHAR[i]!;
          const startDeg = i * 13;
          return (
            <tr key={nak.ne}>
              <td className={patroMono}>{N(i + 1)}</td>
              <td>{bilingualText(lang, nak.ne, nak.en)}</td>
              <td className={cn(patroMono, learnRefDeg)}>
                {N(startDeg)}°{N(20)}′–{N(startDeg + 13)}°{N(20)}′
              </td>
              <td>{bilingualText(lang, nak.lord_ne, NAK_LORD_EN[nak.lord_ne] ?? nak.lord_ne)}</td>
              <td className={learnRefSymNe}>{nak.sym_ne}</td>
              {padas.map((p, pi) => (
                <td key={pi} className={learnRefPada}>
                  {p}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </RefTable>
  );
}

export function TithiReferenceTable() {
  const { t } = useTranslation();
  const { lang, digits: N } = useLocale();
  return (
    <RefTable caption={t("learn.30_tithis_the_12_angular_gap_between_moon_and_sun")}>
      <thead>
        <tr>
          <th>#</th>
          <th>{t("learn.tithi")}</th>
          <th>{t("learn.paksha")}</th>
          <th>{t("learn.angle")}</th>
        </tr>
      </thead>
      <tbody>
        {WHEEL_TITHIS.map((row, i) => {
          const degStart = i * 12;
          const degEnd = (i + 1) * 12;
          return (
            <tr key={`${row.ne}-${i}`} className={row.moon ? learnRefHighlightRow : undefined}>
              <td className={patroMono}>{N(i + 1)}</td>
              <td>{bilingualText(lang, row.ne, row.en)}</td>
              <td>{bilingualText(lang, row.paksha, row.pakshaEn ? `${row.pakshaEn} Paksha` : row.paksha)}</td>
              <td className={cn(patroMono, learnRefDeg)}>
                {N(degStart)}°–{N(degEnd)}°
              </td>
            </tr>
          );
        })}
      </tbody>
    </RefTable>
  );
}

export function YogaReferenceTable() {
  const { t } = useTranslation();
  const { lang, digits: N } = useLocale();
  return (
    <RefTable caption={t("learn.27_yogas_sum_of_sun_moon_longitude_each_13_20")}>
      <thead>
        <tr>
          <th>#</th>
          <th>{t("learn.yoga")}</th>
          <th>{t("learn.text")}</th>
        </tr>
      </thead>
      <tbody>
        {WHEEL_YOGAS.map((y, i) => (
          <tr key={y}>
            <td className={patroMono}>{N(i + 1)}</td>
            <td>{bilingualText(lang, y, YOGA_EN[i] ?? y)}</td>
            <td className={cn(patroMono, learnRefDeg)}>
              {N(i * 13)}°{N(20)}′–{N((i + 1) * 13)}°{N(20)}′
            </td>
          </tr>
        ))}
      </tbody>
    </RefTable>
  );
}

export function KaranaReferenceTable() {
  const { t } = useTranslation();
  const { lang, digits: N } = useLocale();
  const charRows = KAR_MOV.map((ne) => ({ ne, type: t("learn.movable_7") }));
  const sthiraRows = KAR_FIX_NAMES.map((ne) => ({ ne, type: t("learn.fixed_4") }));

  return (
    <>
      <RefTable caption={t("learn.11_karanas_half_a_tithi_6_angle_60_karanas_per_month")}>
        <thead>
          <tr>
            <th>#</th>
            <th>{t("learn.karana")}</th>
            <th>{t("learn.type")}</th>
            <th>{t("learn.note")}</th>
          </tr>
        </thead>
        <tbody>
          <tr className={learnRefHighlightRow}>
            <td className={patroMono}>{N(1)}</td>
            <td>{bilingualText(lang, "किंस्तुघ्न", KARANA_EN["किंस्तुघ्न"] ?? "Kimstughna")}</td>
            <td>{t("learn.fixed")}</td>
            <td>{t("learn.first_half_of_shukla_pratipada_once_a_year")}</td>
          </tr>
          {charRows.map((k, i) => (
            <tr key={k.ne}>
              <td className={patroMono}>{N(i + 2)}</td>
              <td>{bilingualText(lang, k.ne, KARANA_EN[k.ne] ?? k.ne)}{k.ne === "विष्टि" ? t("learn.bhadra") : ""}</td>
              <td>{k.type}</td>
              <td>{t("learn.repeats_throughout_the_month")}</td>
            </tr>
          ))}
          {sthiraRows.slice(1).map((k, i) => (
            <tr key={k.ne}>
              <td className={patroMono}>{N(i + 9)}</td>
              <td>{bilingualText(lang, k.ne, KARANA_EN[k.ne] ?? k.ne)}</td>
              <td>{k.type}</td>
              <td>{t("learn.once_each_per_month_krishna_chaturdashi_aaushi_shukla_p")}</td>
            </tr>
          ))}
        </tbody>
      </RefTable>
      <p className={cn(tmCardCap, learnRefNote)}>
        {t("learn.order_kimstughna_bava_vishti_8_shakuni_chatushpada_naga")}
      </p>
    </>
  );
}
