/**
 * Copy for both apps' `components/panchanga/PanchangaWheel.tsx` — the wheel
 * around the panchanga chart: the heading (eyebrow, title, the date / time /
 * tithi / place line), the hover tip for a nakshatra or rashi segment, the
 * corner buttons, the year-playback controls and the legend. Each app draws
 * the wheel, its dock and its gestures.
 */
import { bilingualText } from "@vedic-patro/domain/locale";
import { NAKSHATRA_ICONS } from "@vedic-patro/domain/nakshatra-icons";
import { bsMonthEnOf } from "@vedic-patro/domain/panchanga-wheel";
import { getWheelRashis } from "@vedic-patro/domain/wheel-data";
import { NAK_LORD_EN } from "@vedic-patro/domain/wheel-locale";
import { useLocale } from "@vedic-patro/i18n/react";

export type PanchangaWheelTip = { kind: string; title: string; rows: { label: string; value: string }[]; sym?: string };

export function usePanchangaWheelCopy() {
  const { t, lang, digits } = useLocale();
  const pick = (ne: string, en: string) => bilingualText(lang, ne, en);
  const monthName = (bsMonthNe: string) => pick(bsMonthNe, bsMonthEnOf(bsMonthNe));

  return {
    pick,
    monthName,
    eyebrow: t("ui.panchanga.nepali_patro_panchanga_wheel"),
    defaultLocation: t("panchanga.wheel.default_location"),
    /** "Today's panchanga wheel" (no "today" once the reader scrubs away). */
    title: (today: boolean) => `${today ? `${t("panchanga.wheel.today_prefix")} ` : ""}${t("panchanga.wheel.title")}`,
    /** Weekday, month day, year · clock · tithi · place. */
    sub: ({
      weekday,
      bsMonthNe,
      bsDay,
      bsYear,
      clock,
      tithi,
      location,
    }: {
      weekday: { ne: string; en: string };
      bsMonthNe: string;
      bsDay: number;
      bsYear: number;
      clock: string;
      tithi: { ne: string; en: string };
      location?: string;
    }) =>
      `${pick(weekday.ne, weekday.en)}, ${monthName(bsMonthNe)} ${digits(bsDay)}, ${digits(bsYear)} · ${digits(clock)} · ${pick(tithi.ne, tithi.en)} · ${location ?? t("panchanga.wheel.default_location")}`,
    /** The hover tip for a nakshatra (`nak`) or rashi segment. */
    tip: (hover: { type: "nak" | "rashi"; i: number }, bsMonthNe: string): PanchangaWheelTip => {
      if (hover.type === "nak") {
        const ic = NAKSHATRA_ICONS[hover.i]!;
        return {
          kind: `${t("nakshatra")} · ${digits(hover.i + 1)}`,
          title: pick(ic.ne, ic.en),
          rows: [{ label: t("panchanga.wheel.lord"), value: pick(ic.lord_ne, NAK_LORD_EN[ic.lord_ne] ?? ic.lord_ne) }],
          sym: ic.sym_ne,
        };
      }
      const rs = getWheelRashis()[hover.i]!;
      return {
        kind: `${t("panchanga.wheel.rashi")} · ${digits(hover.i + 1)}`,
        title: pick(rs.ne, rs.en),
        rows: [{ label: t("common.month"), value: monthName(bsMonthNe) }],
      };
    },
    /** "2 weeks / 1 sec · 4x" while the year plays. */
    playRate: (label: string, speed: number) => `${label} · ${digits(speed)}×`,
    speed: (speed: number) => `${digits(speed)}×`,
    labels: {
      pickDateTime: t("ui.panchanga.pick_date_and_time"),
      reload: t("ui.panchanga.reload"),
      reloadTitle: (civil: boolean) =>
        t("ui.panchanga.reload_reset_zoom", { mode: t(civil ? "panchanga.wheel.midnight" : "panchanga.wheel.sunrise") }),
      fullWidth: t("panchanga.wheel.full_width"),
      exitFullWidth: t("panchanga.wheel.exit_full_width"),
      rewind: t("panchanga.wheel.rewind"),
      fastForward: t("panchanga.wheel.fast_forward"),
      playBackward: t("panchanga.wheel.play_backward"),
      playForward: t("panchanga.wheel.play_forward"),
      play: t("panchanga_year.play"),
      playTitle: t("panchanga_year.play_title"),
      pause: t("panchanga_year.pause"),
      currentNakTithi: t("ui.panchanga.current_nakshatra_tithi"),
      dragHint: t("ui.panchanga.drag_to_rotate_pinch_to_zoom"),
      dragScrollHint: t("ui.panchanga.drag_to_rotate_scroll_to_zoom"),
      time: t("common.time"),
      currentTime: t("panchanga.wheel.current_time"),
      now: t("ui.panchanga.now"),
      dateAndTime: t("ui.panchanga.date_and_time"),
      month: t("common.month"),
      year: t("common.year"),
      hour: t("panchanga.hour_aria"),
      minute: t("panchanga.minute_aria"),
      close: t("ui.common.close"),
      sunSign: t("panchanga.wheel.sun_sign"),
      moonSign: t("common.moon_sign"),
    },
  };
}
