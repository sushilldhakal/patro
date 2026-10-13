/**
 * Vastu page logic, shared by the website (`apps/web/src/pages/Vastu.tsx`) and
 * the app (`apps/mobile/app/(tabs)/vastu.tsx`): the selected zone and its
 * detail card, the direction chips, the live compass and its alignment
 * dialog, the classical sources, and copy. Each app passes its compass hook.
 */
import { useEffect, useState } from "react";
import {
  VASTU_DIR16,
  VASTU_DIRECTIONS,
  VASTU_DOSHAS,
  VASTU_ELEMENT_COLOR,
  VASTU_GUNA_COLOR,
  VASTU_INK,
  VASTU_ROOMS,
  vastuDir16,
  vastuDir16AtBearing,
  vastuDir16ForPada,
  vastuDirection,
  vastuPada,
  vastuSelection,
  type VastuPadaId,
  type VastuPadaStatus,
  type VastuSelectionId,
} from "@vedic-patro/domain/vastu";
import { gunaTone } from "@vedic-patro/domain/vastu-guna";
import { illustration } from "@vedic-patro/design-tokens";
import { useLocale } from "@vedic-patro/i18n/react";

export type CompassReading = { heading: number | null; drifting: boolean; requestPermission: () => Promise<boolean> };

/** A coloured tag on the zone card. `tone` picks tint (default) or a solid guna fill. */
export type VastuChip = { key: string; label: string; color: string; tone: "tint" | "sattva" | "tamas" };

export type VastuDetailRow =
  | { key: string; label: string; kind: "text"; text: string; danger?: boolean }
  | { key: string; label: string; kind: "padas"; padas: { id: VastuPadaId; label: string; color: string; active: boolean; status: VastuPadaStatus }[] }
  | { key: string; label: string; kind: "parent"; id: VastuSelectionId; text: string; color: string };

export type VastuDirChip = { id: VastuSelectionId; label: string; title?: string; color: string; active: boolean };

const SOURCE_IDS = ["mayamata", "manasara", "vishvakarma", "samarangana", "aparajita"] as const;
const COMPASS_TIMEOUT_MS = 4000;

export function useVastuPage({
  useCompass,
  canUseCompass = () => true,
}: {
  /** The app's compass hook (live while `active`). */
  useCompass: (active: boolean) => CompassReading;
  /** False where the compass cannot run (an insecure page on the web). */
  canUseCompass?: () => boolean;
}) {
  const { t, digits } = useLocale();
  const [selected, setSelected] = useState<VastuSelectionId>("northeast");
  const [alignOpen, setAlignOpen] = useState(false);
  const [compassLive, setCompassLive] = useState(false);
  const [compassError, setCompassError] = useState<string | null>(null);
  const compass = useCompass(compassLive);

  // A compass that never produces a heading would leave the wheel silently
  // un-rotated with no way back to the dialog.
  useEffect(() => {
    if (!compassLive || compass.heading != null) return;
    const id = setTimeout(() => {
      setCompassLive(false);
      setAlignOpen(true);
      setCompassError(t("vastu.compass.unavailable"));
    }, COMPASS_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [compassLive, compass.heading, t]);

  /** Choosing the centre opens the compass alignment. */
  const select = (id: VastuSelectionId) => {
    setSelected(id);
    if (id === "center" && !compassLive) {
      setCompassError(null);
      setAlignOpen(true);
    }
  };

  const startCompass = async () => {
    setCompassError(null);
    if (!canUseCompass()) {
      setCompassError(t("vastu.compass.unavailable"));
      return;
    }
    if (!(await compass.requestPermission())) {
      setCompassError(t("vastu.compass.denied"));
      return;
    }
    setCompassLive(true);
    setAlignOpen(false);
  };

  const facing = compass.heading != null ? vastuDir16(vastuDir16AtBearing(compass.heading)) : null;
  const compassLine = compassLive
    ? [
        t("vastu.compass.live"),
        facing ? ` ${t("vastu.compass.facing", { name: t(`vastu.dir16.${facing.id}.name`), abbr: facing.abbr })}` : "",
        facing && compass.heading != null ? ` · ${digits(Math.round(compass.heading))}°` : "",
      ].join("")
    : undefined;

  /* ── the selected zone ── */
  const zone = vastuSelection(selected);
  const color = VASTU_ELEMENT_COLOR[zone.element];
  const text = (key: string, label: string, value: string, danger?: boolean): VastuDetailRow => ({ key, label, kind: "text", text: value, danger });
  const chips: VastuChip[] = [
    { key: "kind", label: t(`vastu.labels.kind.${zone.kind}`), color: VASTU_INK.line, tone: "tint" },
    ...(zone.padaCode ? [{ key: "code", label: zone.padaCode, color, tone: "tint" as const }] : []),
    ...(zone.attrKey ? [{ key: "attr", label: t(zone.attrKey), color, tone: "tint" as const }] : []),
    { key: "element", label: t(`vastu.element.${zone.element}`), color, tone: "tint" },
    { key: "guna", label: t(`vastu.wheel.organ.${zone.guna}`), color: VASTU_GUNA_COLOR[zone.guna], tone: gunaTone(zone.guna) },
    ...(zone.status === "mixed"
      ? [
          { key: "good", label: t("vastu.wheel.status.good"), color: illustration.green30, tone: "tint" as const },
          { key: "bad", label: t("vastu.wheel.status.bad"), color: illustration.red36, tone: "tint" as const },
        ]
      : zone.status
        ? [
            {
              key: "status",
              label: t(`vastu.wheel.status.${zone.status}`),
              color: zone.status === "good" ? illustration.green30 : illustration.red36,
              tone: "tint" as const,
            },
          ]
        : []),
  ];
  const parent16 = zone.kind === "pada" ? vastuDir16(vastuDir16ForPada(selected as VastuPadaId)) : null;
  const rows: VastuDetailRow[] = [
    ...(zone.kind === "dir16"
      ? [
          text("quality", t("vastu.labels.quality"), t(`${zone.copyPrefix}.quality`)),
          text("element", t("vastu.labels.element"), t(`vastu.element.${zone.element}`)),
          text("guna", t("vastu.labels.guna"), t(`vastu.wheel.organ.${zone.guna}`)),
          text("description", t("vastu.labels.description"), t(`${zone.copyPrefix}.importance`)),
        ]
      : []),
    ...(zone.kind === "pada"
      ? [
          text("deity", t("vastu.labels.deity"), t(`${zone.copyPrefix}.deity`)),
          text("element", t("vastu.labels.element"), t(`vastu.element.${zone.element}`)),
          text("guna", t("vastu.labels.guna"), t(`vastu.wheel.organ.${zone.guna}`)),
        ]
      : []),
    ...(zone.kind !== "pada" && zone.kind !== "inner4" ? [text("deity", t("vastu.labels.deity"), t(`${zone.copyPrefix}.deity`))] : []),
    ...(zone.innerDeity ? [text("inner", t("vastu.labels.inner_deity"), t(`vastu.pada.${zone.innerDeity}.name`))] : []),
    ...(zone.padas && zone.padas.length > 0
      ? [
          {
            key: "padas",
            label: t("vastu.labels.pada"),
            kind: "padas" as const,
            padas: zone.padas.map((id) => {
              const pada = vastuPada(id);
              return { id, label: `${pada.code} · ${t(`vastu.pada.${id}.name`)}`, color: VASTU_ELEMENT_COLOR[pada.element], active: id === selected, status: pada.status };
            }),
          },
        ]
      : []),
    ...(parent16
      ? [
          {
            key: "parent",
            label: t("vastu.labels.kind.dir16"),
            kind: "parent" as const,
            id: parent16.id,
            text: `${parent16.abbr} · ${t(parent16.attrKey)}`,
            color: VASTU_ELEMENT_COLOR[parent16.element],
          },
        ]
      : []),
    text("best", t("vastu.labels.best"), t(`${zone.copyPrefix}.best`)),
    text("avoid", t("vastu.labels.avoid"), t(`${zone.copyPrefix}.avoid`), true),
  ];

  return {
    copy: {
      title: t("vastu.title"),
      subtitle: t("vastu.subtitle"),
      planHeading: t("vastu.plan.heading"),
      planHint: t("vastu.plan.hint"),
      wheelBlurb: t("vastu.wheel.blurb"),
      note: t("vastu.note"),
      compassStop: t("vastu.compass.stop"),
      compassDrifting: t("vastu.compass.drifting"),
      dialogTitle: t("vastu.compass.dialog_title"),
      dialogBody: t("vastu.compass.dialog_body"),
      cancel: t("vastu.compass.cancel"),
      done: t("vastu.compass.done"),
      sourcesHeading: t("vastu.sources.heading"),
      sourcesBlurb: t("vastu.sources.blurb"),
    },
    selected,
    select,
    zone: {
      title: t(`${zone.copyPrefix}.name`),
      color,
      chips,
      /** The zone's importance line (eight directions and the inner four). */
      importance: zone.kind !== "dir16" && zone.kind !== "pada" ? t(`${zone.copyPrefix}.importance`) : undefined,
      rows,
    },
    directions: VASTU_DIRECTIONS.map((dir): VastuDirChip => ({
      id: dir.id,
      label: t(`vastu.dir.${dir.id}.name`),
      color: VASTU_ELEMENT_COLOR[dir.element],
      active: dir.id === selected,
    })),
    directions16: VASTU_DIR16.map((dir): VastuDirChip => ({
      id: dir.id,
      label: dir.abbr,
      title: t(`vastu.dir16.${dir.id}.name`),
      color: VASTU_ELEMENT_COLOR[dir.element],
      active: dir.id === selected,
    })),
    compass: {
      live: compassLive,
      heading: compassLive ? compass.heading : null,
      line: compassLine,
      drifting: compassLive && compass.drifting,
      stop: () => setCompassLive(false),
    },
    dialog: { open: alignOpen, setOpen: setAlignOpen, error: compassError, confirm: () => void startCompass() },
    sources: SOURCE_IDS.map((id, i) => ({
      id,
      index: `${digits(i + 1)}.`,
      credit: t(`vastu.sources.${id}.credit`),
      edition: t(`vastu.sources.${id}.edition`),
      used: t(`vastu.sources.${id}.used`),
    })),
    /** Room placement and dosha reference (drawn by the app below the sources). */
    rooms: {
      heading: t("vastu.rooms.heading"),
      ideal: t("vastu.rooms.ideal"),
      blurb: t("vastu.rooms.blurb"),
      items: VASTU_ROOMS.map((room) => ({
        id: room.id,
        name: t(`vastu.room.${room.id}.name`),
        direction: t(`vastu.dir.${room.direction}.name`),
        color: VASTU_ELEMENT_COLOR[vastuDirection(room.direction).element],
        note: t(`vastu.room.${room.id}.note`),
      })),
    },
    doshas: {
      heading: t("vastu.dosha.heading"),
      blurb: t("vastu.dosha.blurb"),
      items: VASTU_DOSHAS.map((id) => ({ id, problem: t(`vastu.dosha.${id}.problem`), remedy: t(`vastu.dosha.${id}.remedy`) })),
    },
  };
}

export type VastuPage = ReturnType<typeof useVastuPage>;
