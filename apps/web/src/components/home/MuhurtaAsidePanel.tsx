import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import type { ApiHoraSlot, NavataraRow, PanchangaDay, UdayaLagnaRow } from "@/lib/api";
import { useLocale, bilingualText } from "@/i18n/locale";
import {
  buildDayTimelineData,
  ghatiToCivilClockLabel,
} from "@/components/panchanga/day-timeline-data";
import {
  choghadiyaName,
  choghadiyaTone,
  choghadiyaToneLabel,
} from "@/lib/choghadiya-display";
import {
  formatClockNepali,
  formatTimeRangeShort,
  getChandrabalamTable,
  getHoraDaySlots,
  getSunrise,
  getTarabalaTable,
  getUdayaLagna,
} from "@/lib/panchanga-format";
import { GRAHA_NAME, type GrahaKey } from "@/lib/graha-details";
import { formatNavataraQuality, formatNavataraTara } from "@/lib/navatara-bala";
import {
  patroEmpty,
  patroMiniSubTab,
  patroNavataraRow,
} from "@/lib/patro-classes";

type MuhurtaSubTab = "tarabal" | "chandrabal" | "choghadiya" | "hora" | "pushkara";

const SUB_TABS: { id: MuhurtaSubTab; labelKey: string }[] = [
  { id: "tarabal", labelKey: "muhurta_aside.tarabal" },
  { id: "chandrabal", labelKey: "muhurta_aside.chandrabal" },
  { id: "choghadiya", labelKey: "muhurta_aside.choghadiya" },
  { id: "hora", labelKey: "muhurta_aside.hora" },
  { id: "pushkara", labelKey: "muhurta_aside.pushkara" },
];

const SUB_TAB_HINT_KEY: Record<MuhurtaSubTab, string> = {
  tarabal: "muhurta_aside.hint_tarabal",
  chandrabal: "muhurta_aside.hint_chandrabal",
  choghadiya: "muhurta_aside.hint_choghadiya",
  hora: "muhurta_aside.hint_hora",
  pushkara: "muhurta_aside.hint_pushkara",
};

function parseTimeToMinutes(time?: string | null): number | null {
  if (!time) return null;
  const m = time.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function NavataraAsideList({
  moonLabel,
  moonLabelEn,
  moonIdx,
  moonRefKey,
  rows,
}: {
  moonLabel: string | null;
  moonLabelEn?: string | null;
  moonIdx: number | null;
  moonRefKey: string;
  rows: NavataraRow[];
}) {
  const { t } = useTranslation();
  const { lang } = useLocale();

  if (!rows.length) {
    return <p className={patroEmpty}>{t("muhurta_aside.unavailable")}</p>;
  }

  return (
    <div>
      {moonLabel || moonLabelEn ? (
        <p className="m-0 mb-2 text-sm font-semibold text-foreground">
          {t(moonRefKey)}:{" "}
          <strong className="text-accent">
            {bilingualText(lang, moonLabel ?? moonLabelEn ?? "", moonLabelEn ?? moonLabel ?? "")}
          </strong>
        </p>
      ) : null}
      <ul className="m-0 grid list-none grid-cols-3 gap-1 p-0">
        {rows.map((row) => {
          const isMoon = moonIdx != null && row.index === moonIdx;
          return (
            <li key={row.name} className={patroNavataraRow(row.tone, isMoon)}>
              <span className="w-full text-center text-xs font-bold leading-tight text-foreground">
                {bilingualText(lang, row.name, row.name_en ?? row.name)}
              </span>
              <span className="w-full text-center text-xs font-semibold leading-snug">
                {formatNavataraTara(row.tara, lang)}
                <span className="mx-1 opacity-55">/</span>
                {formatNavataraQuality(row.quality, lang)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function ChoghadiyaList({ p }: { p: PanchangaDay }) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const timeline = buildDayTimelineData(p);
  const sunriseMin = parseTimeToMinutes(getSunrise(p));

  if (!timeline?.choghadiya.length || sunriseMin == null) {
    return <p className={patroEmpty}>{t("muhurta_aside.choghadiya_unavailable")}</p>;
  }

  return (
    <ul className="m-0 grid list-none grid-cols-3 gap-1 p-0">
      {timeline.choghadiya.map((seg, i) => {
        const tone = choghadiyaTone(seg.name, seg.bad);
        const qualityNe = choghadiyaToneLabel(seg.name, "ne", seg.bad);
        const qualityEn = choghadiyaToneLabel(seg.name, "en", seg.bad);
        const range = `${ghatiToCivilClockLabel(seg.startG, sunriseMin)} – ${ghatiToCivilClockLabel(seg.endG, sunriseMin)}`;
        return (
          <li key={`${seg.name}-${i}`} className={patroNavataraRow(tone === "good" ? "good" : tone === "bad" ? "bad" : "neutral")}>
            <span className="w-full text-center text-xs font-bold leading-tight text-foreground">
              {bilingualText(lang, seg.name, choghadiyaName(seg.name, "en"))}
            </span>
            <span className="mono w-full text-center text-xs font-semibold leading-snug">
              {range}
              <span className="mx-1 opacity-55">/</span>
              {bilingualText(lang, qualityNe, qualityEn)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function HoraList({ p }: { p: PanchangaDay }) {
  const { t } = useTranslation();
  const slots = getHoraDaySlots(p);

  if (!slots.length) {
    return <p className={patroEmpty}>{t("muhurta_aside.hora_unavailable")}</p>;
  }

  return (
    <ul className="m-0 grid list-none grid-cols-3 gap-1 p-0">
      {slots.map((slot, i) => (
        <HoraSlot key={`${slot.phase}-${slot.index}-${i}`} slot={slot} />
      ))}
    </ul>
  );
}

function HoraSlot({ slot }: { slot: ApiHoraSlot }) {
  const { lang } = useLocale();
  const start = formatClockNepali(slot.start_local_time_short) ?? slot.start_local_time_short;
  const end = formatClockNepali(slot.end_local_time_short) ?? slot.end_local_time_short;
  const tone = slot.tone === "bad" ? "bad" : "good";

  return (
    <li className={patroNavataraRow(tone)}>
      <span className="w-full text-center text-xs font-bold leading-tight text-foreground">
        {bilingualText(lang, 
          slot.planet_ne,
          GRAHA_NAME[slot.planet as GrahaKey]?.en ?? slot.planet_en ?? slot.planet ?? slot.planet_ne,
        )}
      </span>
      <span className="mono w-full text-center text-xs font-semibold leading-snug">
        {start} – {end}
        <span className="mx-1 opacity-55">/</span>
        {bilingualText(lang, slot.quality_ne, slot.tone === "bad" ? "Inauspicious" : "Auspicious")}
      </span>
    </li>
  );
}

function PushkaraList({ p }: { p: PanchangaDay }) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const rows = getUdayaLagna(p);

  if (!rows?.length) {
    return <p className={patroEmpty}>{t("muhurta_aside.pushkara_unavailable")}</p>;
  }

  const pushkaraLabel = bilingualText(lang, "पुष्कर", "Pushkara");

  return (
    <ul className="m-0 grid list-none grid-cols-3 gap-1 p-0">
      {rows.map((row, i) => (
        <PushkaraSlot key={`${row.name}-${i}`} row={row} pushkaraLabel={pushkaraLabel} />
      ))}
    </ul>
  );
}

function PushkaraSlot({ row, pushkaraLabel }: { row: UdayaLagnaRow; pushkaraLabel: string }) {
  const { lang } = useLocale();
  const hits = row.pushkara_navamsha ?? [];
  const times = hits
    .map((hit) => formatClockNepali(hit.local_time_short ?? hit.local_time) ?? hit.local_time_short)
    .filter(Boolean)
    .join(", ");
  const range =
    formatTimeRangeShort(
      row.start_local_time_short ?? row.start_local_time,
      row.end_local_time_short ?? row.end_local_time,
    ) ?? "—";
  const hasPushkara = hits.length > 0;

  return (
    <li className={patroNavataraRow(hasPushkara ? "good" : "neutral")}>
      <span className="w-full text-center text-xs font-bold leading-tight text-foreground">
        {bilingualText(lang, row.name_ne ?? row.name, row.name ?? row.name_ne)}
      </span>
      <span className="mono w-full text-center text-xs font-semibold leading-snug">
        {hasPushkara ? times : range}
        <span className="mx-1 opacity-55">/</span>
        {hasPushkara ? pushkaraLabel : "—"}
      </span>
    </li>
  );
}

type Props = {
  p: PanchangaDay;
  dateAd: string;
};

export function MuhurtaAsidePanel({ p }: Props) {
  const { t } = useTranslation();
  const [subTab, setSubTab] = useState<MuhurtaSubTab>("tarabal");
  const tara = getTarabalaTable(p);
  const chandra = getChandrabalamTable(p);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-5 gap-1" role="tablist" aria-label={t("muhurta_aside.tabs_label")}>
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            className={patroMiniSubTab(subTab === tab.id)}
            aria-selected={subTab === tab.id}
            onClick={() => setSubTab(tab.id)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      <p className="m-0 flex items-start gap-1.5 text-sm leading-snug text-base">
        <Info size={13} strokeWidth={2} className="mt-px shrink-0 opacity-75" aria-hidden />
        <span>{t(SUB_TAB_HINT_KEY[subTab])}</span>
      </p>

      <div role="tabpanel">
        {subTab === "tarabal" ? (
          <NavataraAsideList
            moonLabel={tara?.moon_label ?? null}
            moonLabelEn={tara?.moon_label_en ?? null}
            moonIdx={tara?.moon_index ?? null}
            moonRefKey="muhurta_aside.moon_ref_tarabal"
            rows={tara?.rows ?? []}
          />
        ) : null}
        {subTab === "chandrabal" ? (
          <NavataraAsideList
            moonLabel={chandra?.moon_label ?? null}
            moonLabelEn={chandra?.moon_label_en ?? null}
            moonIdx={chandra?.moon_index ?? null}
            moonRefKey="muhurta_aside.moon_ref_chandrabal"
            rows={chandra?.rows ?? []}
          />
        ) : null}
        {subTab === "choghadiya" ? <ChoghadiyaList p={p} /> : null}
        {subTab === "hora" ? <HoraList p={p} /> : null}
        {subTab === "pushkara" ? <PushkaraList p={p} /> : null}
      </div>
    </div>
  );
}
