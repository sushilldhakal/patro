import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { cn } from "@vedic-patro/domain/utils";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";
import { useLocale } from "@/i18n/locale";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { RashifalGocharChips } from "@/components/rashifal/RashifalGocharChips";
import { getRashiName } from "@vedic-patro/domain/rashi-i18n";
import type {
  NavataraTone,
  RashifalDayMarker,
  RashifalPeriod,
  RashifalSignBlock,
} from "@/lib/api";
import { formatBsCivilIsoLong } from "@vedic-patro/domain/bs-calendar";
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
    <span className={cn("inline-flex", rashifalClasses.stars)} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={cn(
            rashifalClasses.star,
            n <= stars ? rashifalToneBar(tone) : rashifalClasses.starOff,
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
    <div className={cn("flex", rashifalClasses.luckyCell)} title={label}>
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">{label}: </span>
      <span className={cn("truncate", rashifalClasses.luckyValue)}>{value}</span>
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
        rashifalClasses.card,
        "shadow-[0_0_0_1px_color-mix(in_srgb,var(--foreground)_6%,transparent)]",
      )}
    >
      <header className={rashifalClasses.header}>
        <RashiGlyphIcon
          name={getRashiName(sign.id, lang)}
          number={sign.id}
          size={36}
          className="shrink-0"
        />
        <div className={rashifalClasses.headerBody}>
          <h3 className={rashifalClasses.name}>{displayName}</h3>
          <p className={rashifalClasses.nameSub}>
            {sign.syllables_ne}
          </p>
        </div>
        {taraLine && tone ? (
          <span
            className={cn(
              rashifalClasses.taraBadge,
              patroNavataraToneBg(tone),
            )}
          >
            {taraLine}
          </span>
        ) : null}
      </header>

      {/* Overall strength — the one number that summarises every server layer. */}
      <div className={rashifalClasses.meter}>
        <StarMeter stars={sign.stars ?? 3} tone={sign.tone} />
        <div className={rashifalClasses.meterTrack}>
          <div
            className={cn(rashifalClasses.meterFill, "transition-[width]", rashifalToneBar(sign.tone))}
            style={{ width: `${sign.percent ?? 50}%` }}
          />
        </div>
        <span
          className={cn(
            rashifalClasses.percent,
            rashifalToneText(sign.tone),
          )}
        >
          {toNepaliDigits(sign.percent ?? 50, lang)}
          <span aria-hidden="true">%</span>
        </span>
      </div>

      {grade ? (
        <p className={rashifalClasses.grade}>
          {grade}
        </p>
      ) : null}

      {/* Six life areas, icon-led so the row scans without reading a word. */}
      {sign.domains?.length ? (
        <ul className={cn("m-0 grid list-none grid-cols-3 gap-x-3 gap-y-2", rashifalClasses.domains)}>
          {sign.domains.map((domain) => {
            const Icon = RASHIFAL_DOMAIN_ICON[domain.key];
            const label = ne ? domain.label_ne : domain.label_en;
            return (
              <li key={domain.key} className={rashifalClasses.domain} title={`${label} · ${domain.percent}%`}>
                <div className={rashifalClasses.domainHead}>
                  <Icon
                    className={cn("size-3.5 shrink-0", rashifalToneText(domain.tone))}
                    aria-hidden="true"
                  />
                  <span className={cn("truncate", rashifalClasses.domainLabel)}>
                    {label}
                  </span>
                </div>
                <div className={rashifalClasses.domainTrack}>
                  <div
                    className={cn(rashifalClasses.domainFill, rashifalToneBar(domain.tone))}
                    style={{ width: `${domain.percent}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      <p className={cn("m-0 flex-1", rashifalClasses.prediction)}>
        {prediction}
      </p>

      {/* Lucky row — colour, number, direction and (daily only) the sign lord's hora. */}
      <div className={cn("grid grid-cols-2", rashifalClasses.lucky)}>
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
        className={cn(
          "flex",
          rashifalClasses.whyButton,
          rashifalClasses.whyLabel,
          "transition-colors hover:bg-muted/40 hover:text-foreground",
        )}
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
        <div id={detailsId} className={rashifalClasses.details}>
          {sign.components?.length ? (
            <ul className={cn("m-0 flex list-none flex-col p-0", rashifalClasses.componentList)}>
              {sign.components.map((component) => (
                <li key={component.key} className={cn("m-0 flex", rashifalClasses.componentRow)}>
                  <span className={rashifalClasses.componentLabel}>
                    {ne ? component.label_ne : component.label_en}
                  </span>
                  <span className={rashifalClasses.componentNote}>
                    {ne ? component.note_ne : component.note_en}
                  </span>
                  <span
                    className={cn(rashifalClasses.componentValue, rashifalToneText(component.tone))}
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
            <p className={rashifalClasses.lordLine}>
              {t("rashifal.lord_line", {
                lord: ne ? lord.lord_ne : lord.lord_en,
                house: toNepaliDigits(lord.house, lang),
                sign: ne ? lord.sign_ne : lord.sign_en,
                dignity: ne ? lord.dignity_ne : lord.dignity_en,
              })}
            </p>
          ) : null}

          {period !== "daily" && sign.best_day && sign.weak_day ? (
            <p className={rashifalClasses.footNote}>
              {t("rashifal.window_days", {
                best: dayMarkerLabel(sign.best_day, lang),
                weak: dayMarkerLabel(sign.weak_day, lang),
              })}
            </p>
          ) : null}

          {remedy ? (
            <p className={rashifalClasses.remedy}>
              {t("rashifal.remedy")}: {remedy}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
