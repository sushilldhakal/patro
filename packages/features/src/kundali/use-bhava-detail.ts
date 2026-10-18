/**
 * The bhava (house) detail dialog, shared by the website's and the app's
 * `components/kundali/BhavaDetailDialog.tsx`: the house header, the four tabs
 * and which one is open, the summary (sign, lord, occupants, health signals,
 * the general house reference), the lord tab (each occupant's karakatva and
 * classical placement shlokas, the lord's placement, conjunctions), the
 * aspects tab and the rules tab (Brighu Naadi sutras, Lal Kitab), and copy.
 * Each app only draws it, in its own dialog/drawer/sheet.
 */
import { useState } from "react";
import type { BhavaReferencePayload } from "@vedic-patro/api-client";
import { drishtiTargetHouses, formatHouseBadge, houseBadge, type BhavaHouse } from "@vedic-patro/domain/jyotish/bhava";
import { GRAHA_ICON, GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import {
  HOUSE_LORD_TITLE_NE,
  HOUSE_ORDINAL_EN,
  HOUSE_ORDINAL_NE,
  computeAspectedBy,
  splitList,
  subsetsOf3,
} from "@vedic-patro/domain/jyotish/kundali/bhava-detail";
import { bilingualText } from "@vedic-patro/domain/locale";
import { formatRashiByNumber } from "@vedic-patro/domain/panchanga/rashi-i18n";
import { useLocale } from "@vedic-patro/i18n/react";

export type BhavaTabId = "summary" | "lord" | "drishti" | "rules";
export type BhavaRating = keyof BhavaReferencePayload["ratingLabel"];
export type BhavaShloka = { label?: string; source: string; shloka: string };

const yutiKey = (keys: string[]) => [...keys].sort().join("+");

/** Copy for the dialog shell (title while the reference loads, close button). */
export function useBhavaDialogCopy() {
  const { t } = useLocale();
  return { loading: t("rashifal.profile.loading"), close: t("ui.common.close") };
}

export function useBhavaDetail({
  house,
  houses,
  reference,
}: {
  house: BhavaHouse;
  houses: BhavaHouse[];
  reference: BhavaReferencePayload;
}) {
  const { t, lang: rawLang, digits } = useLocale();
  const lang: "ne" | "en" = rawLang === "en" ? "en" : "ne";
  const pick = (ne?: string | null, en?: string | null) => bilingualText(lang, ne, en);
  const [tab, setTab] = useState<BhavaTabId>("summary");

  const grahaName = (key: string) => {
    const entry = GRAHA_NAME[key as GrahaKey];
    return entry ? bilingualText(lang, entry.ne, entry.en, key) : key;
  };
  const joinNames = (keys: string[]) => (keys.length === 0 ? t("ui.kundali.none") : keys.map(grahaName).join(", "));
  const icon = (key: string) => GRAHA_ICON[key as GrahaKey] ?? "🪐";

  const info = reference.houseInfo[house.house]!;
  const lordKey = reference.rashiLord[house.rashi]!;
  const lordHouse = houses.find((h) => h.planets.some((p) => p.key === lordKey))?.house;
  const bhaveshEntry = lordHouse != null ? reference.bhaveshPhala[house.house]?.[lordHouse] : undefined;
  const occupants = house.planets;
  const occupantKeys = occupants.map((p) => p.key);
  const aspectedBy = computeAspectedBy(houses, house.house);
  const nearby = [...occupantKeys, ...aspectedBy];
  const beneficPresent = nearby.some((k) => reference.grahaDrishti[k]?.isMalefic === false);
  const maleficPresent = nearby.some((k) => reference.grahaDrishti[k]?.isMalefic === true);
  const badge = houseBadge(house.house);
  const classicalName = reference.houseClassicalName[house.house];
  const bodyPart = reference.houseBodyPart[house.house];
  const houseDetail = reference.houseDetail[house.house];

  const yuti2 = occupantKeys.length === 2 ? reference.grahaYuti2[yutiKey(occupantKeys)] : undefined;
  const yuti3 =
    occupantKeys.length >= 3
      ? subsetsOf3(occupantKeys)
          .map((triple) => reference.grahaYuti3[yutiKey(triple)])
          .filter((e): e is NonNullable<typeof e> => Boolean(e))
      : [];
  const sutras = reference.naadiSutras
    .filter((s) => s.grahas.every((g) => occupantKeys.includes(g)))
    .sort((a, b) => a.number - b.number);
  const lalKitab = occupants
    .map((p) => ({ key: p.key, entry: reference.lalKitabHouse[p.key]?.[house.house] }))
    .filter((e): e is { key: string; entry: NonNullable<typeof e.entry> } => Boolean(e.entry));
  const lalKitabYuti =
    occupantKeys.length >= 2 && occupantKeys.length <= 3
      ? reference.lalKitabYuti.find((y) => yutiKey(y.grahas) === yutiKey(occupantKeys))
      : undefined;

  /** One occupant's karakatva and its classical placement shlokas in this house. */
  const karakatva = (key: string) => {
    const k = reference.grahaKarakatva[key];
    if (!k) return null;
    const saravali = reference.grahaHouseSaravali[key]?.[house.house];
    return {
      key,
      title: `${icon(key)} ${grahaName(key)}`,
      shloka: { label: t("ui.kundali.karakatva_shloka"), source: pick(k.shlokaSourceNe, k.shlokaSourceEn), shloka: k.shloka } as BhavaShloka,
      subjectsLabel: t("ui.kundali.karakatva_subjects"),
      subjects: `${pick(k.subjectsNe, k.subjectsEn)}${t("ui.kundali.x_d617dd33")}`,
      significanceLabel: t("ui.kundali.significance"),
      significance: pick(k.significanceNe, k.significanceEn),
      placementTitle: t("ui.kundali.lang_in_house_house_value", {
        house: digits(house.house),
        value: house.house === 1 ? t("ui.kundali.x_cf56ff65") : "",
        lang: grahaName(key),
      }),
      rating: saravali
        ? { kind: saravali.rating as BhavaRating, label: pick(reference.ratingLabel[saravali.rating].ne, reference.ratingLabel[saravali.rating].en) }
        : null,
      citations: saravali
        ? saravali.entries.map((c) => ({ source: pick(c.shlokaSourceNe, c.shlokaSourceEn), shloka: c.shloka }) as BhavaShloka)
        : [],
      summary: saravali ? pick(saravali.summaryNe, saravali.summaryEn) : null,
      noShloka: t("ui.kundali.no_classical_shloka_is_available_for"),
    };
  };

  return {
    tab,
    setTab,
    tabs: [
      { id: "summary", icon: "📋", label: t("ui.kundali.summary") },
      { id: "lord", icon: "👑", label: t("ui.kundali.lord_results") },
      { id: "drishti", icon: "👁️", label: t("ui.kundali.aspects") },
      { id: "rules", icon: "📚", label: t("ui.kundali.rules") },
    ] as { id: BhavaTabId; icon: string; label: string }[],
    header: {
      number: digits(house.house),
      title: `${pick(HOUSE_ORDINAL_NE[house.house - 1], HOUSE_ORDINAL_EN[house.house - 1])} ${t("ui.kundali.house")}`,
      classicalName: classicalName ? pick(classicalName.ne, classicalName.en) : null,
      themes: splitList(pick(info.themeNe, info.themeEn)).join(" · "),
    },
    summary: {
      occupantsTitle: t("ui.kundali.occupants"),
      occupantsRight: occupants.length === 0 ? t("ui.kundali.empty") : null,
      sign: `${digits(house.rashi)} ${formatRashiByNumber(house.rashi, lang)}`,
      signLabel: t("dainik.sign"),
      lordLabel: t("panchanga.wheel.lord"),
      lord: grahaName(lordKey),
      badge: badge ? formatHouseBadge(badge, lang) : null,
      occupants: occupants.map((p) => {
        const k = reference.grahaKarakatva[p.key];
        return { key: p.key, name: grahaName(p.key), subjects: k ? splitList(pick(k.subjectsNe, k.subjectsEn)).slice(0, 3).join(" · ") : "" };
      }),
      noOccupants: t("ui.kundali.no_graha_here_see_the_placement_2", { lang: grahaName(lordKey) }),
      health: {
        title: t("ui.kundali.health_signals"),
        verdict: maleficPresent ? t("ui.kundali.needs_attention") : t("ui.kundali.generally_fine"),
        tone: (maleficPresent ? "attention" : "fine") as "attention" | "fine",
        partsLabel: t("ui.kundali.parts"),
        parts: pick(info.medicalNe, info.medicalEn),
        bodyPart: bodyPart ? pick(bodyPart.ne, bodyPart.en) : null,
        quiet: !maleficPresent && !beneficPresent ? t("ui.kundali.no_graha_occupies_or_aspects_this") : null,
      },
      reference: houseDetail
        ? {
            title: t("ui.kundali.general_house_reference"),
            titles: pick(houseDetail.titlesNe, houseDetail.titlesEn),
            naturalLabel: t("ui.kundali.natural_significator"),
            natural: pick(houseDetail.naturalNe, houseDetail.naturalEn),
            description: pick(houseDetail.descriptionNe, houseDetail.descriptionEn),
            kalapurusha: pick(
              t("ui.kundali.x_759ec7db", { v0: houseDetail.signNe, v1: houseDetail.lordNe }),
              `In the Kalapurusha (natural zodiac) chart this house corresponds to ${houseDetail.signEn} (ruled by ${houseDetail.lordEn}) — that's not this native's actual sign; see the real sign/lord for this house above.`,
            ),
            shloka: {
              label: t("ui.kundali.classical_citation"),
              source: pick(houseDetail.shlokaSourceNe, houseDetail.shlokaSourceEn),
              shloka: houseDetail.shloka,
            } as BhavaShloka,
            effectNote: t("ui.kundali.a_graha_s_actual_effect_depends"),
            benefic: {
              label: `${t("ui.kundali.benefic_grahas")} (${pick(houseDetail.beneficGrahasNe, houseDetail.beneficGrahasEn)}):`,
              text: pick(houseDetail.beneficEffectNe, houseDetail.beneficEffectEn),
            },
            malefic: {
              label: `${t("ui.kundali.malefic_grahas")} (${pick(houseDetail.maleficGrahasNe, houseDetail.maleficGrahasEn)}):`,
              text: pick(houseDetail.maleficEffectNe, houseDetail.maleficEffectEn),
            },
          }
        : null,
    },
    lord: {
      grahasTitle: t("ui.kundali.graha_in_this_house"),
      grahasCount: occupants.length > 0 ? digits(occupants.length) : null,
      karakatva: occupants.map((p) => karakatva(p.key)).filter((k): k is NonNullable<typeof k> => Boolean(k)),
      noGrahas: t("ui.kundali.no_graha_occupies_this_house_so"),
      placementTitle: t("ui.kundali.lord_placement"),
      placementRight: lordHouse != null ? t("ui.kundali.house_lordhouse", { lordHouse: digits(lordHouse) }) : null,
      placement:
        lordHouse != null
          ? {
              title: pick(HOUSE_LORD_TITLE_NE[house.house - 1], `Lord of house ${digits(house.house)}`),
              lord: grahaName(lordKey),
              where: t("ui.kundali.house_lordhouse", { lordHouse: digits(lordHouse) }),
            }
          : null,
      lordMissing: t("ui.kundali.sign_lord_lang_wasn_t_found", { lang: grahaName(lordKey) }),
      bhavesh:
        lordHouse == null
          ? null
          : bhaveshEntry
            ? {
                shloka: bhaveshEntry.shloka ? ({ source: t("ui.kundali.bphs_ch_13"), shloka: bhaveshEntry.shloka } as BhavaShloka) : null,
                text: pick(bhaveshEntry.ne, bhaveshEntry.en),
                source: t("ui.kundali.source_bhaveshphalasource", { bhaveshPhalaSource: reference.bhaveshPhalaSource }),
              }
            : { comingSoon: t("ui.kundali.coming_soon") },
      yuti:
        occupantKeys.length >= 2
          ? {
              title: t("ui.kundali.graha_conjunction_yuti_result"),
              pair: yuti2
                ? {
                    names: joinNames(occupantKeys),
                    yoga: yuti2.yogaNameNe ? pick(yuti2.yogaNameNe, yuti2.yogaNameEn ?? yuti2.yogaNameNe) : null,
                    text: pick(yuti2.textNe, yuti2.textEn),
                  }
                : null,
              triples: yuti3.map((e) => ({ key: yutiKey(e.grahas), names: joinNames(e.grahas), text: pick(e.textNe, e.textEn) })),
              generalRule: occupantKeys.length >= 3 ? pick(reference.grahaYutiGeneralRule.ne, reference.grahaYutiGeneralRule.en) : null,
              none: !yuti2 && yuti3.length === 0 && occupantKeys.length < 3 ? t("ui.kundali.no_reference_is_available_for_this") : null,
            }
          : null,
    },
    drishti: {
      title: t("ui.kundali.aspects"),
      outgoing: occupants.map((p) => ({
        key: p.key,
        name: grahaName(p.key),
        targets: `${drishtiTargetHouses(p.key, house.house)
          .map((n) => pick(t("ui.kundali.x_b908d7d7", { v0: digits(n) }), digits(n)))
          .join(" · ")} ${t("ui.kundali.house")}`,
      })),
      noOutgoing: t("ui.kundali.no_graha_occupies_this_house_so_2"),
      allTitle: t("ui.kundali.all_aspects"),
      incomingTitle: t("ui.kundali.grahas_aspecting_this_house"),
      incoming: aspectedBy.map((k) => {
        const d = reference.grahaDrishti[k];
        return { key: k, name: grahaName(k), summary: d ? pick(d.summaryNe, d.summaryEn) : null };
      }),
      noIncoming: t("ui.kundali.no_graha_aspects_this_house"),
    },
    rules: {
      title: t("ui.kundali.related_rules"),
      sutrasTitle: t("ui.kundali.brighu_naadi_sutras"),
      sutrasCount: digits(sutras.length),
      sutras: sutras.map((s) => ({
        key: s.number,
        title: pick(t("ui.kundali.x_b54eae14", { v0: digits(s.number), v1: s.titleNe }), `Sutra ${digits(s.number)} — ${s.titleEn}`),
        category: pick(s.categoryNe, s.categoryEn),
        body: pick(s.bodyNe, s.bodyEn),
      })),
      noSutras: t("ui.kundali.no_brighu_naadi_sutras_apply_since"),
      sutraSource: t("ui.kundali.source_naadisutrasource", { naadiSutraSource: reference.naadiSutraSource }),
      lalKitabTitle: t("ui.kundali.lal_kitab"),
      lalKitabCount: digits(lalKitab.length),
      lalKitab: lalKitab.map(({ key, entry }) => {
        const tip = reference.lalKitabSafetyTips[key];
        return {
          key,
          title: `${icon(key)} ${grahaName(key)} — ${t("ui.kundali.house_house", { house: digits(house.house) })}`,
          text: pick(entry.ne, entry.en),
          tip: tip ? `${t("ui.kundali.safe_practice")} ${pick(tip.ne, tip.en)}` : null,
        };
      }),
      noLalKitab: t("ui.kundali.this_house_has_no_occupying_graha_2", { lang: joinNames(reference.lalKitabFixedLord[house.house] ?? []) }),
      lalKitabYuti: lalKitabYuti
        ? { title: `${t("ui.kundali.graha_yuti")} ${joinNames(lalKitabYuti.grahas)}`, text: pick(lalKitabYuti.textNe, lalKitabYuti.textEn) }
        : null,
      lalKitabSource: t("ui.kundali.source_lal_kitab_parts_2_11"),
      susthaTitle: t("ui.kundali.what_is_lal_kitab_s_sustha"),
      sustha: reference.lalKitabSusthaDustha.map((rule) => pick(rule.ne, rule.en)),
      susthaSource: t("ui.kundali.source_lalkitabrevisionsource", { lalKitabRevisionSource: reference.lalKitabRevisionSource }),
    },
    close: t("ui.common.close"),
  };
}
