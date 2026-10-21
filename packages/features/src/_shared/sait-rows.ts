/**
 * The day's saits (`festival_saits`) as display rows — shared by the home
 * highlight card and the panchanga page's festival list. One row per rite; a
 * ceremony split across several lagnas lists each stretch.
 */
import type { FestivalSait } from "@vedic-patro/api-client";
import { AD_MONTH_NAMES, AD_MONTH_NAMES_NE } from "@vedic-patro/domain/calendar/bs-calendar";
import { bilingualText } from "@vedic-patro/domain/locale";
import { formatClockNepali, formatTimeShort } from "@vedic-patro/domain/panchanga/panchanga-format";
import type { TFunction } from "@vedic-patro/i18n/runtime";

// Literal keys, not `ui.home.sait_ritual_${ritual}`: the website's i18n bundle keeps
// only the `ui.*` keys that appear as literals in its source.
const SAIT_RITUAL_KEYS: Record<string, string> = {
  ghatasthapana: "ui.home.sait_ritual_ghatasthapana",
  fulpati: "ui.home.sait_ritual_fulpati",
  "dashain-tika": "ui.home.sait_ritual_dashain_tika",
  "laxmi-puja": "ui.home.sait_ritual_laxmi_puja",
  "bhai-tika": "ui.home.sait_ritual_bhai_tika",
  vivah: "ui.home.sait_ritual_vivah",
  bratabandha: "ui.home.sait_ritual_bratabandha",
  "griha-pravesh": "ui.home.sait_ritual_griha_pravesh",
};
const SAIT_DIRECTION_KEYS: Record<string, string> = {
  east: "ui.home.sait_dir_east",
  south: "ui.home.sait_dir_south",
  west: "ui.home.sait_dir_west",
  north: "ui.home.sait_dir_north",
};

/** One rite: its clock times, one per lagna stretch. */
export type SaitRow = {
  key: string;
  festivalId: string;
  kind: FestivalSait["kind"];
  label: string;
  times: Array<{ key: string; time: string; detail: string }>;
  /** Tika rites: the direction to face (Chandra Vasa). */
  facing?: string;
};

export function buildSaitRows(
  saits: FestivalSait[] | undefined,
  { t, lang, digits, selectedAdDate }: { t: TFunction; lang: string; digits: (value: string | number) => string; selectedAdDate: string },
): SaitRow[] {
  const english = lang === "en";
  const clock = (raw: string) => {
    const short = formatTimeShort(raw) ?? raw;
    return english ? short : (formatClockNepali(short) ?? digits(short));
  };
  // Far from Nepal the tithi can hold on the local day before or after the
  // patro's; such a sait carries its own date.
  const span = (w: { date_local?: string; start_local: string; end_local: string }) => {
    const times = `${clock(w.start_local)} – ${clock(w.end_local)}`;
    if (!w.date_local || w.date_local === selectedAdDate) return times;
    const [, m, d] = w.date_local.split("-").map(Number);
    const monthLabel = bilingualText(lang, AD_MONTH_NAMES_NE[m - 1], AD_MONTH_NAMES[m - 1]);
    return `${monthLabel} ${digits(d)}, ${times}`;
  };
  const label = (keys: Record<string, string>, id: string | null | undefined) => {
    const key = id ? keys[id] : undefined;
    return key ? t(key) : "";
  };

  const rows: SaitRow[] = [];
  for (const sait of saits ?? []) {
    const lagna = sait.lagna ? t("ui.home.sait_lagna", { v0: bilingualText(lang, sait.lagna.name_ne, sait.lagna.name) }) : "";
    const time = { key: sait.sait.start, time: span(sait.sait), detail: lagna };
    const key = `${sait.festival_id}:${sait.ritual}`;
    const row = rows.find((r) => r.key === key);
    if (row) {
      row.times.push(time);
      continue;
    }
    rows.push({
      key,
      festivalId: sait.festival_id,
      kind: sait.kind,
      label: label(SAIT_RITUAL_KEYS, sait.ritual),
      times: [time],
      facing: sait.facing
        ? t("ui.home.sait_facing", {
            v0: label(SAIT_DIRECTION_KEYS, sait.facing.direction),
            v1: bilingualText(lang, sait.facing.moon_rashi.name_ne, sait.facing.moon_rashi.name),
          })
        : undefined,
    });
  }
  return rows;
}

/** The note under a list of saits: they are local, and Abhijit may serve instead. */
export function saitNote(saits: FestivalSait[] | undefined, t: TFunction): string {
  // Set by the API when a daytime sait lies outside the local Abhijit muhurta.
  const abhijitAlternate = (saits ?? []).some((sait) => sait.alternate);
  return [t("ui.home.sait_local_note"), abhijitAlternate ? t("ui.home.sait_abhijit_note") : ""].filter(Boolean).join(" ");
}
