/**
 * The data behind both apps' `components/vastu/VastuPurushaWheel.tsx`: the
 * concentric band radii, the guna bands, the 16-direction status table, the
 * ring dividers and separators, and every label and title the wheel shows
 * (guna, 16 directions and their life attribute, pada codes and deities,
 * the eight wedges, the centre, the legend). Each app draws the SVG.
 */
import { illustration } from "@vedic-patro/design-tokens";
import {
  VASTU_DIR16,
  VASTU_DIR16_ATTR,
  VASTU_INK,
  evenBearings,
  vastuElementAtBearing,
  type VastuGunaId,
} from "@vedic-patro/domain/vastu";
import { useLocale } from "@vedic-patro/i18n/react";

/**
 * Concentric bands, outside to in: degree rim, guna, 16 directions, pada
 * codes, deities, eight house wedges, inner four, Brahmasthan.
 */
const DEG_OUTER = 304;
const DEG_INNER = 288;
const GUNA_OUTER = 288;
const GUNA_INNER = 268;
const DIR16_OUTER = 268;
const DIR16_INNER = 214;
const CODE_OUTER = 214;
const CODE_INNER = 192;
const DEITY_OUTER = 192;
const DEITY_INNER = 162;
const WEDGE_OUTER = 162;
const WEDGE_INNER = 104;
const INNER4_OUTER = 104;
const INNER4_INNER = 66;

export const VASTU_WHEEL_GEOMETRY = {
  PURUSHA_OPACITY: 0.2,
  DEG_OUTER,
  DEG_INNER,
  GUNA_OUTER,
  GUNA_INNER,
  DIR16_OUTER,
  DIR16_INNER,
  CODE_OUTER,
  CODE_INNER,
  DEITY_OUTER,
  DEITY_INNER,
  WEDGE_OUTER,
  WEDGE_INNER,
  INNER4_OUTER,
  INNER4_INNER,
  CENTER_R: 60,
  /** Diagonal figure — head/feet are the square corners, so keep those inside the rim. */
  PURUSHA_SIZE: Math.round(DEG_INNER * Math.SQRT2 * 0.82),
  DEG_LABEL_R: (DEG_OUTER + DEG_INNER) / 2,
  GUNA_LABEL_R: (GUNA_OUTER + GUNA_INNER) / 2,
  DIR16_LABEL_R: (DIR16_OUTER + DIR16_INNER) / 2,
  CODE_LABEL_R: (CODE_OUTER + CODE_INNER) / 2,
  DEITY_LABEL_R: (DEITY_OUTER + DEITY_INNER) / 2,
  WEDGE_LABEL_R: (WEDGE_OUTER + WEDGE_INNER) / 2,
  INNER4_LABEL_R: (INNER4_OUTER + INNER4_INNER) / 2,
  PADA_HALF: 5.625,
  RING_DIVIDERS: [DEG_OUTER, DEG_INNER, GUNA_INNER, DIR16_INNER, CODE_INNER, DEITY_INNER, WEDGE_INNER, INNER4_INNER],
  GUNA_BOUNDARIES: [112.5, 157.5, 292.5, 337.5],
  DIR16_BOUNDARIES: evenBearings(16, 11.25),
  PADA_BOUNDARIES: evenBearings(32, 0),
  DIR8_BOUNDARIES: evenBearings(8, 22.5),
  INNER4_BOUNDARIES: evenBearings(4, 45),
} as const;

/** Door-pada +/- marks only — sector fills use the five elements. */
export const VASTU_STATUS_MARK = {
  good: illustration.green30,
  ok: VASTU_INK.line,
  bad: illustration.red36,
} as const;

/**
 * 16-direction status from Vishvakarma Prakasha (Shodasha-Griha). Mixed
 * "good-if-used-as-designated" corners (SE kitchen, SW master bedroom) stay
 * good; zones headed "bad for living" stay bad.
 */
export const VASTU_DIR16_STATUS = [
  "good", "good", "good", "good", "good", "bad", "good", "good",
  "ok", "bad", "good", "good", "good", "bad", "good", "ok",
] as const satisfies readonly ("good" | "ok" | "bad")[];

/**
 * Triguna zones on the compass — Sattva 337.5° to 112.5°, Rajas at SE
 * (112.5°–157.5°) and NW (292.5°–337.5°), Tamas 157.5° to 292.5°.
 */
export const VASTU_GUNA_BANDS: { id: VastuGunaId; key: string; bearing: number; halfAngle: number }[] = [
  { id: "sattva", key: "sattva", bearing: 45, halfAngle: 67.5 },
  { id: "rajas", key: "rajas-se", bearing: 135, halfAngle: 22.5 },
  { id: "tamas", key: "tamas", bearing: 225, halfAngle: 67.5 },
  { id: "rajas", key: "rajas-nw", bearing: 315, halfAngle: 22.5 },
];

/** The 16-direction ring, in VASTU_DIR16 order. */
export const VASTU_COMPASS_16 = VASTU_DIR16.map((d) => ({
  bearing: d.bearing,
  abbr: d.abbr,
  zone: d.id,
  nameKey: `vastu.dir16.${d.id}.name`,
}));

type PadaLike = { id: string; wall: string; index: number; element: string; status: string };

/** Every label and title on the wheel, in the reader's language. */
export function useVastuPurushaWheel() {
  const { t, digits } = useLocale();
  const padaName = (id: string) => t(`vastu.pada.${id}.name`);
  const elementName = (element: string) => t(`vastu.element.${element}`);
  const statusName = (status: string) => t(`vastu.wheel.status.${status}`);
  const padaCode = (pada: PadaLike) => `${pada.wall}${digits(pada.index)}`;
  return {
    digits,
    heading: t("vastu.wheel.heading"),
    centerDeity: t("vastu.dir.center.deity"),
    centerName: t("vastu.dir.center.name"),
    organ: (id: string) => t(`vastu.wheel.organ.${id}`),
    /** The 16-direction ring: life attribute and full title per entry of VASTU_COMPASS_16. */
    dir16: VASTU_COMPASS_16.map((point, i) => {
      const attr = t(VASTU_DIR16_ATTR[i]!);
      const status = VASTU_DIR16_STATUS[i]!;
      return {
        attr,
        status,
        title: `${t(point.nameKey)} · ${attr} · ${elementName(vastuElementAtBearing(point.bearing))} · ${statusName(status)}`,
      };
    }),
    dir16Name: (id: string) => t(`vastu.dir16.${id}.name`),
    dir16Hit: (id: string, attrKey: string) => `${t(`vastu.dir16.${id}.name`)} · ${t(attrKey)}`,
    dirName: (id: string) => t(`vastu.dir.${id}.name`),
    padaName,
    padaCode,
    padaCodeTitle: (pada: PadaLike & { code: string }) =>
      `${pada.code} · ${padaName(pada.id)} · ${elementName(pada.element)} · ${statusName(pada.status)}`,
    padaDeityTitle: (pada: PadaLike) => `${padaName(pada.id)} · ${elementName(pada.element)} · ${statusName(pada.status)}`,
    padaHit: (pada: { id: string; code: string }) => `${pada.code} · ${padaName(pada.id)}`,
    elementName,
  };
}
