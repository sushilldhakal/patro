/**
 * The home page's muhurta aside, shared by the website's and the app's
 * `components/home/MuhurtaAsidePanel.tsx`: five sub-tabs (tarabala,
 * chandrabala, choghadiya, hora, pushkara navamsha), the hint for the open
 * one, and its slots as `{title, value, quality, tone}` tiles.
 */
import { useState } from "react";
import type { NavataraRow, PanchangaDay } from "@vedic-patro/api-client";
import { choghadiyaName, choghadiyaTone, choghadiyaToneLabel } from "@vedic-patro/domain/choghadiya-display";
import { buildDayTimelineData, ghatiToCivilClockLabel } from "@vedic-patro/domain/day-timeline-data";
import { GRAHA_NAME, type GrahaKey } from "@vedic-patro/domain/graha-details";
import { bilingualText } from "@vedic-patro/domain/locale";
import { formatNavataraQuality, formatNavataraTara } from "@vedic-patro/domain/navatara-bala";
import {
  formatClockNepali,
  formatTimeRangeShort,
  getChandrabalamTable,
  getHoraDaySlots,
  getSunrise,
  getTarabalaTable,
  getUdayaLagna,
} from "@vedic-patro/domain/panchanga-format";
import { useLocale } from "@vedic-patro/i18n/react";

export type MuhurtaSubTab = "tarabal" | "chandrabal" | "choghadiya" | "hora" | "pushkara";

const SUB_TABS: { id: MuhurtaSubTab; label: string; hint: string; element: string }[] = [
  { id: "tarabal", label: "muhurta_aside.tarabal", hint: "muhurta_aside.hint_tarabal", element: "tarabala" },
  { id: "chandrabal", label: "muhurta_aside.chandrabal", hint: "muhurta_aside.hint_chandrabal", element: "chandrabala" },
  { id: "choghadiya", label: "muhurta_aside.choghadiya", hint: "muhurta_aside.hint_choghadiya", element: "choghadiya" },
  { id: "hora", label: "muhurta_aside.hora", hint: "muhurta_aside.hint_hora", element: "hora" },
  { id: "pushkara", label: "muhurta_aside.pushkara", hint: "muhurta_aside.hint_pushkara", element: "pushkara" },
];

export type MuhurtaSlotTone = "good" | "bad" | "neutral" | NavataraRow["tone"];

export type MuhurtaSlot = {
  key: string;
  title: string;
  value: string;
  quality: string;
  tone: MuhurtaSlotTone;
  /** The moon's own nakshatra in the tara/chandra tables. */
  isMoon?: boolean;
};

export type MuhurtaPanel = {
  moonRef: { label: string; value: string } | null;
  slots: MuhurtaSlot[];
  /** Shown instead of the slots when the day has none. */
  empty: string | null;
};

function parseTimeToMinutes(time?: string | null): number | null {
  const m = time?.match(/(\d{1,2}):(\d{2})/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function useMuhurtaAside(p: PanchangaDay) {
  const { t, lang } = useLocale();
  const [subTab, setSubTab] = useState<MuhurtaSubTab>("tarabal");
  const current = SUB_TABS.find((s) => s.id === subTab)!;

  const navatara = (table: ReturnType<typeof getTarabalaTable>, refKey: string): MuhurtaPanel => {
    const rows = table?.rows ?? [];
    if (!rows.length) return { moonRef: null, slots: [], empty: t("muhurta_aside.unavailable") };
    const moonLabel = table?.moon_label ?? null;
    const moonLabelEn = table?.moon_label_en ?? null;
    const moonIdx = table?.moon_index ?? null;
    return {
      moonRef:
        moonLabel || moonLabelEn
          ? { label: `${t(refKey)}:`, value: bilingualText(lang, moonLabel ?? moonLabelEn ?? "", moonLabelEn ?? moonLabel ?? "") }
          : null,
      slots: rows.map((row) => ({
        key: row.name,
        title: bilingualText(lang, row.name, row.name_en ?? row.name),
        value: formatNavataraTara(row.tara, lang),
        quality: formatNavataraQuality(row.quality, lang),
        tone: row.tone,
        isMoon: moonIdx != null && row.index === moonIdx,
      })),
      empty: null,
    };
  };

  const choghadiya = (): MuhurtaPanel => {
    const timeline = buildDayTimelineData(p);
    const sunriseMin = parseTimeToMinutes(getSunrise(p));
    if (!timeline?.choghadiya.length || sunriseMin == null) return { moonRef: null, slots: [], empty: t("muhurta_aside.choghadiya_unavailable") };
    return {
      moonRef: null,
      slots: timeline.choghadiya.map((seg, i) => {
        const tone = choghadiyaTone(seg.name, seg.bad);
        return {
          key: `${seg.name}-${i}`,
          title: bilingualText(lang, seg.name, choghadiyaName(seg.name, "en")),
          value: `${ghatiToCivilClockLabel(seg.startG, sunriseMin)} – ${ghatiToCivilClockLabel(seg.endG, sunriseMin)}`,
          quality: bilingualText(lang, choghadiyaToneLabel(seg.name, "ne", seg.bad), choghadiyaToneLabel(seg.name, "en", seg.bad)),
          tone: tone === "good" ? "good" : tone === "bad" ? "bad" : "neutral",
        };
      }),
      empty: null,
    };
  };

  const hora = (): MuhurtaPanel => {
    const slots = getHoraDaySlots(p);
    if (!slots.length) return { moonRef: null, slots: [], empty: t("muhurta_aside.hora_unavailable") };
    return {
      moonRef: null,
      slots: slots.map((slot, i) => ({
        key: `${slot.phase}-${slot.index}-${i}`,
        title: bilingualText(lang, slot.planet_ne, GRAHA_NAME[slot.planet as GrahaKey]?.en ?? slot.planet_en ?? slot.planet ?? slot.planet_ne),
        value: `${formatClockNepali(slot.start_local_time_short, lang) ?? slot.start_local_time_short} – ${
          formatClockNepali(slot.end_local_time_short, lang) ?? slot.end_local_time_short
        }`,
        quality: bilingualText(lang, slot.quality_ne, slot.tone === "bad" ? "Inauspicious" : "Auspicious"),
        tone: slot.tone === "bad" ? "bad" : "good",
      })),
      empty: null,
    };
  };

  const pushkara = (): MuhurtaPanel => {
    const rows = getUdayaLagna(p);
    if (!rows?.length) return { moonRef: null, slots: [], empty: t("muhurta_aside.pushkara_unavailable") };
    const pushkaraLabel = t("common.pushkara");
    return {
      moonRef: null,
      slots: rows.map((row, i) => {
        const hits = row.pushkara_navamsha ?? [];
        const has = hits.length > 0;
        const times = hits
          .map((hit) => formatClockNepali(hit.local_time_short ?? hit.local_time, lang) ?? hit.local_time_short)
          .filter(Boolean)
          .join(", ");
        const range =
          formatTimeRangeShort(row.start_local_time_short ?? row.start_local_time, row.end_local_time_short ?? row.end_local_time, lang) ?? "—";
        return {
          key: `${row.name}-${i}`,
          title: bilingualText(lang, row.name_ne ?? row.name ?? "—", row.name ?? row.name_ne ?? "—"),
          value: has ? times : range,
          quality: has ? pushkaraLabel : "—",
          tone: has ? "good" : "neutral",
        };
      }),
      empty: null,
    };
  };

  const panel =
    subTab === "tarabal"
      ? navatara(getTarabalaTable(p), "muhurta_aside.moon_ref_tarabal")
      : subTab === "chandrabal"
        ? navatara(getChandrabalamTable(p), "muhurta_aside.moon_ref_chandrabal")
        : subTab === "choghadiya"
          ? choghadiya()
          : subTab === "hora"
            ? hora()
            : pushkara();

  return {
    tabsLabel: t("muhurta_aside.tabs_label"),
    tabs: SUB_TABS.map((s) => ({ id: s.id, label: t(s.label), active: s.id === subTab, select: () => setSubTab(s.id) })),
    hint: t(current.hint),
    /** The open sub-tab's full page under /panchanga/element/. */
    elementId: current.element,
    panel,
    viewFullTable: t("ui.home.view_full_table"),
  };
}
