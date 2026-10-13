import { useState } from "react";
import { useTranslation } from "@vedic-patro/i18n/react";
import { ChevronDown, Clock } from "lucide-react";
import { cn } from "@vedic-patro/domain/utils";
import { rashifalClasses } from "@vedic-patro/design-tokens/classes/rashifal-classes";
import { useLocale } from "@/i18n/locale";
import { RashiGlyphIcon } from "@/components/panchanga/element/ElementGlyphIcon";
import { RashifalGocharChips } from "@/components/rashifal/RashifalGocharChips";
import { getRashiName } from "@vedic-patro/domain/rashi-i18n";
import type { RashifalPersonal } from "@/lib/api";
import { formatBsCivilIsoLong } from "@vedic-patro/domain/bs-calendar";
import { civilIsoFromDate } from "@vedic-patro/domain/patro-day";
import { formatPatroCivilDayLabel } from "@vedic-patro/domain/patro-headline-subtitle";
import {
  RASHIFAL_DOMAIN_ICON,
  RASHIFAL_LUCKY_ICON,
  rashifalToneBar,
  rashifalToneText,
  toNepaliDigits,
} from "@/lib/rashifal-ui";

type Props = {
  name: string;
  personal: RashifalPersonal;
};

function StarMeter({ stars, tone }: { stars: number; tone: RashifalPersonal["tone"] }) {
  return (
    <span className={cn("inline-flex", rashifalClasses.stars)} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={cn(rashifalClasses.star, n <= stars ? rashifalToneBar(tone) : rashifalClasses.starOff)}
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
  icon: typeof Clock;
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
 * Dasha end date. The server sends AD only, so Nepali gets the Vikram date
 * (असार १५, २०९३) from the offline BS table — the same label the kundali
 * dasha tree shows — rather than a Gregorian date in Nepali digits, which is
 * what "२९ अप्रिल २०३६" was. English keeps the AD label.
 *
 * Both come from the app's own static month-name tables plus digit
 * localisation, not the browser's Intl data, which cannot be relied on to
 * carry full Nepali month names.
 */
function formatDasha(iso: string, lang: string, digitFn: (n: number | string) => string): string {
  try {
    const civilIso = civilIsoFromDate(new Date(iso));
    if (lang.slice(0, 2) === "ne") {
      return formatBsCivilIsoLong(civilIso, lang, digitFn);
    }
    return formatPatroCivilDayLabel(civilIso, lang, digitFn);
  } catch {
    return iso.slice(0, 10);
  }
}

/**
 * A single personal rashifal — cast on the profile's own birth chart (Lagna,
 * natal Ashtakavarga, running Vimshottari dasha) rather than the general
 * engine's twelve-sign Moon-sign sweep. Mirrors {@link RashifalSignCard}'s
 * layout so switching between "all signs" and "my reading" doesn't jar.
 */
export function RashifalPersonalCard({ name, personal }: Props) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const [open, setOpen] = useState(false);

  const ne = lang === "ne";
  const prediction = ne ? personal.prediction_ne : personal.prediction_en;
  const luckyColor = ne ? personal.lucky_color_ne : personal.lucky_color_en;
  const luckyNumber = ne ? personal.lucky_number_ne : personal.lucky_number_en;
  const luckyDirection = ne ? personal.lucky_direction_ne : personal.lucky_direction_en;
  const lord = personal.rashi_lord;
  const dasha = personal.dasha;
  const detailsId = "rashifal-personal-detail";

  const lagnaLabel = ne ? personal.lagna_sign_ne : personal.lagna_sign_en;
  const moonLabel = ne ? personal.moon_sign_ne : personal.moon_sign_en;
  const sunLabel = ne ? personal.sun_sign_ne : personal.sun_sign_en;

  return (
    <article
      className={cn(
        rashifalClasses.cardPersonal,
        "shadow-[0_0_0_1px_color-mix(in_srgb,var(--secondary)_18%,transparent)]",
      )}
    >
      {/* Leads with the Rashi (Moon sign) — "राशि" in everyday usage — with the
          Lagna named explicitly alongside rather than standing in for it. The
          engine's own scoring is Lagna-anchored (see rashifal_personal.py);
          only the *display* order changes here. */}
      <header className={rashifalClasses.header}>
        <RashiGlyphIcon
          name={getRashiName(personal.moon_sign, lang)}
          number={personal.moon_sign}
          size={36}
          className="shrink-0"
        />
        <div className={rashifalClasses.headerBody}>
          <h3 className={rashifalClasses.name}>{name}</h3>
          <p className={rashifalClasses.nameSub}>
            {t("rashifal.personal.lagna_line", { lagna: lagnaLabel, moon: moonLabel, sun: sunLabel })}
          </p>
        </div>
      </header>

      <div className={rashifalClasses.meter}>
        <StarMeter stars={personal.stars} tone={personal.tone} />
        <div className={rashifalClasses.meterTrack}>
          <div
            className={cn(rashifalClasses.meterFill, "transition-[width]", rashifalToneBar(personal.tone))}
            style={{ width: `${personal.percent}%` }}
          />
        </div>
        <span
          className={cn(
            rashifalClasses.percent,
            rashifalToneText(personal.tone),
          )}
        >
          {toNepaliDigits(personal.percent, lang)}
          <span aria-hidden="true">%</span>
        </span>
      </div>

      {/* Running dasha — the layer only a birth chart can give. */}
      <div className={rashifalClasses.dashaRow}>
        <Clock className="size-3.5 shrink-0 text-secondary" aria-hidden="true" />
        <span className={cn("truncate", rashifalClasses.dashaText)}>
          {t("rashifal.personal.dasha_line", {
            maha: ne ? dasha.mahadasha.lord_ne : dasha.mahadasha.lord_en,
            antar: ne ? dasha.antardasha.lord_ne : dasha.antardasha.lord_en,
          })}
        </span>
      </div>

      {personal.domains?.length ? (
        <ul className={cn("m-0 grid list-none grid-cols-3 gap-x-3 gap-y-2", rashifalClasses.domains)}>
          {personal.domains.map((domain) => {
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

      <div className={cn("grid grid-cols-2 sm:grid-cols-3", rashifalClasses.lucky)}>
        <LuckyCell icon={RASHIFAL_LUCKY_ICON.color} label={t("rashifal.lucky_color")} value={luckyColor} />
        <LuckyCell
          icon={RASHIFAL_LUCKY_ICON.number}
          label={t("rashifal.lucky_number")}
          value={luckyNumber}
        />
        <LuckyCell
          icon={RASHIFAL_LUCKY_ICON.direction}
          label={t("rashifal.lucky_direction")}
          value={luckyDirection}
        />
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
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>

      {open ? (
        <div id={detailsId} className={rashifalClasses.details}>
          {personal.components?.length ? (
            <ul className={cn("m-0 flex list-none flex-col p-0", rashifalClasses.componentList)}>
              {personal.components.map((component) => (
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

          {personal.gochar?.length ? (
            <RashifalGocharChips rows={personal.gochar} className="mt-3" />
          ) : null}

          {lord ? (
            <p className={rashifalClasses.lordLine}>
              {t("rashifal.personal.lord_line", {
                lord: ne ? lord.lord_ne : lord.lord_en,
                house: toNepaliDigits(lord.house, lang),
                sign: ne ? lord.sign_ne : lord.sign_en,
                dignity: ne ? lord.dignity_ne : lord.dignity_en,
              })}
            </p>
          ) : null}

          <p className={rashifalClasses.footNote}>
            {t("rashifal.personal.dasha_range", {
              maha: ne ? dasha.mahadasha.lord_ne : dasha.mahadasha.lord_en,
              mahaEnd: formatDasha(dasha.mahadasha.end, lang, (n) => toNepaliDigits(n, lang)),
              antar: ne ? dasha.antardasha.lord_ne : dasha.antardasha.lord_en,
              antarEnd: formatDasha(dasha.antardasha.end, lang, (n) => toNepaliDigits(n, lang)),
            })}
          </p>
        </div>
      ) : null}
    </article>
  );
}
