import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/i18n/locale";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { RashifalGocharChips } from "@/components/rashifal/RashifalGocharChips";
import { getRashiName } from "@/lib/rashi-i18n";
import type {
  NavataraTone,
  RashifalDayMarker,
  RashifalPeriod,
  RashifalSignBlock,
} from "@/lib/api";
import { formatBsCivilIsoLong } from "@/lib/bs-calendar";
import { patroNavataraToneBg } from "@/lib/patro-classes";
import {
  RASHIFAL_DOMAIN_ICON,
  RASHIFAL_LUCKY_ICON,
  rashifalToneBar,
  rashifalToneText,
  toNepaliDigits,
} from "@/lib/rashifal-ui";

type Props = {
  sign: RashifalSignBlock;
  period: RashifalPeriod;
  taraLine?: string;
  tone?: NavataraTone;
};

/** Five-star strength read straight from the server's tone band. */
function StarMeter({ stars, tone }: { stars: number; tone?: NavataraTone }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={cn(
            "size-1.5 rounded-full",
            n <= stars ? rashifalToneBar(tone) : "bg-border",
          )}
        />
      ))}
    </span>
  );
}

function LuckyCell({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ChevronDown;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5" title={label}>
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">{label}: </span>
      <span className="truncate text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}

/**
 * Best/weak day of a weekly, monthly or yearly window. The server's own BS
 * label wins when it sends one; without it, Nepali still gets a Vikram date
 * from the offline table rather than the bare `2026-08-20` the AD fallback
 * used to leak onto a Nepali card.
 */
function dayMarkerLabel(marker: RashifalDayMarker, lang: string): string {
  if (lang.slice(0, 2) !== "ne") return marker.date_ad;
  return (
    marker.date_bs ??
    formatBsCivilIsoLong(marker.date_ad, lang, (n) => toNepaliDigits(n, lang))
  );
}

export function RashifalSignCard({ sign, period, taraLine, tone }: Props) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const [open, setOpen] = useState(false);

  const ne = lang === "ne";
  const displayName = ne ? sign.name : `${sign.title_en} · ${sign.name}`;
  const prediction = ne ? sign.prediction_ne : sign.prediction_en;
  const luckyColor = ne ? sign.lucky_color_ne : sign.lucky_color_en;
  const luckyNumber = ne ? sign.lucky_number_ne : sign.lucky_number_en;
  const luckyDirection = ne ? sign.lucky_direction_ne : sign.lucky_direction_en;
  const remedy = ne ? sign.remedy_ne : sign.remedy_en;
  const grade = ne ? sign.grade_ne : sign.grade_en;
  const lord = sign.rashi_lord;
  const luckyTime = sign.lucky_time;
  const detailsId = `rashifal-detail-${sign.id}`;

  return (
    <article
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card",
        "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)]",
      )}
    >
      <header className="flex items-start gap-3 border-b border-border bg-secondary/[0.08] px-4 py-3 dark:bg-secondary/15">
        <RashiGlyphIcon
          name={getRashiName(sign.id, lang)}
          number={sign.id}
          size={36}
          className="shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h3 className="m-0 text-base font-bold leading-snug text-foreground">{displayName}</h3>
          <p className="m-0 mt-1 text-xs leading-relaxed text-muted-foreground">
            {sign.syllables_ne}
          </p>
        </div>
        {taraLine && tone ? (
          <span
            className={cn(
              "shrink-0 rounded-md px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide",
              patroNavataraToneBg(tone),
            )}
          >
            {taraLine}
          </span>
        ) : null}
      </header>

      {/* Overall strength — the one number that summarises every server layer. */}
      <div className="flex items-center gap-2.5 border-b border-border/60 px-4 py-2.5">
        <StarMeter stars={sign.stars ?? 3} tone={sign.tone} />
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-[width]", rashifalToneBar(sign.tone))}
            style={{ width: `${sign.percent ?? 50}%` }}
          />
        </div>
        <span
          className={cn(
            "shrink-0 font-num tabular-nums text-xs font-bold",
            rashifalToneText(sign.tone),
          )}
        >
          {toNepaliDigits(sign.percent ?? 50, lang)}
          <span aria-hidden="true">%</span>
        </span>
      </div>

      {grade ? (
        <p className="m-0 border-b border-border/60 px-4 pb-2 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
          {grade}
        </p>
      ) : null}

      {/* Six life areas, icon-led so the row scans without reading a word. */}
      {sign.domains?.length ? (
        <ul className="m-0 grid list-none grid-cols-3 gap-x-3 gap-y-2 border-b border-border/60 px-4 py-3">
          {sign.domains.map((domain) => {
            const Icon = RASHIFAL_DOMAIN_ICON[domain.key];
            const label = ne ? domain.label_ne : domain.label_en;
            return (
              <li key={domain.key} className="m-0 min-w-0" title={`${label} · ${domain.percent}%`}>
                <div className="flex items-center gap-1">
                  <Icon
                    className={cn("size-3.5 shrink-0", rashifalToneText(domain.tone))}
                    aria-hidden="true"
                  />
                  <span className="truncate text-[0.65rem] font-semibold text-muted-foreground">
                    {label}
                  </span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", rashifalToneBar(domain.tone))}
                    style={{ width: `${domain.percent}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <p className="m-0 flex-1 px-4 py-3.5 text-sm leading-relaxed text-foreground/90">
        {prediction}
      </p>

      {/* Lucky row — colour, number, direction and (daily only) the sign lord's hora. */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-border bg-muted/25 px-4 py-2.5">
        <LuckyCell
          icon={RASHIFAL_LUCKY_ICON.color}
          label={t("rashifal.lucky_color")}
          value={luckyColor}
        />
        <LuckyCell
          icon={RASHIFAL_LUCKY_ICON.number}
          label={t("rashifal.lucky_number")}
          value={luckyNumber}
        />
        {luckyDirection ? (
          <LuckyCell
            icon={RASHIFAL_LUCKY_ICON.direction}
            label={t("rashifal.lucky_direction")}
            value={luckyDirection}
          />
        ) : null}
        {luckyTime?.start_local_time_short ? (
          <LuckyCell
            icon={RASHIFAL_LUCKY_ICON.time}
            label={t("rashifal.lucky_time")}
            value={`${luckyTime.start_local_time_short}–${luckyTime.end_local_time_short ?? ""}`}
          />
        ) : null}
      </div>

      <button
        type="button"
        className="flex min-h-10 w-full items-center justify-between gap-2 border-t border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((v) => !v)}
      >
        {t("rashifal.why_this")}
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div id={detailsId} className="border-t border-border bg-surface-muted px-4 py-3">
          {sign.components?.length ? (
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {sign.components.map((component) => (
                <li key={component.key} className="m-0 flex items-baseline gap-2 text-xs">
                  <span className="w-24 shrink-0 font-semibold text-foreground">
                    {ne ? component.label_ne : component.label_en}
                  </span>
                  <span className="min-w-0 flex-1 text-muted-foreground">
                    {ne ? component.note_ne : component.note_en}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-num tabular-nums font-bold",
                      rashifalToneText(component.tone),
                    )}
                  >
                    {toNepaliDigits(component.percent, lang)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {sign.gochar?.length ? (
            <RashifalGocharChips rows={sign.gochar} className="mt-3" />
          ) : null}

          {lord ? (
            <p className="m-0 mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              {t("rashifal.lord_line", {
                lord: ne ? lord.lord_ne : lord.lord_en,
                house: toNepaliDigits(lord.house, lang),
                sign: ne ? lord.sign_ne : lord.sign_en,
                dignity: ne ? lord.dignity_ne : lord.dignity_en,
              })}
            </p>
          ) : null}

          {period !== "daily" && sign.best_day && sign.weak_day ? (
            <p className="m-0 mt-2 text-xs text-muted-foreground">
              {t("rashifal.window_days", {
                best: dayMarkerLabel(sign.best_day, lang),
                weak: dayMarkerLabel(sign.weak_day, lang),
              })}
            </p>
          ) : null}

          {remedy ? (
            <p className="m-0 mt-2 text-xs font-medium text-foreground/80">
              {t("rashifal.remedy")}: {remedy}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
