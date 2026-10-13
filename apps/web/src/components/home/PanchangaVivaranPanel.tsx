import type { ReactNode } from "react";
import type { TFunction } from "@vedic-patro/i18n/react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "@vedic-patro/i18n/react";
import type { CalendarDay, PanchangaDay } from "@/lib/api";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { currentPatroDayLinkSearch } from "@/lib/url-state";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import {
  formatAngaPatroTransitionHint,
  formatClockNepali,
  formatMonthMoonEventDisplay,
  formatPatroSignedCorrection,
  getAbhijitMuhurta,
  getAyanaDisplay,
  getMoonriseDisplay,
  getPanchangaDetail,
  getPlanetGocharLines,
  getRituDisplay,
  getRituSeason,
  getSolarCorrections,
  getSunriseDisplay,
  getSunsetDisplay,
  isAyanaNorthMark,
} from "@vedic-patro/domain/panchanga-format";
import { useLocale } from "@/i18n/locale";
import { cn } from "@vedic-patro/domain/utils";
import { patroAyanaNorth, patroAyanaSouth } from "@/lib/patro-classes";
import { Button } from "@/components/ui/button";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

type AngaBlock = {
  name_ne?: string;
  name?: string;
  end_local_time?: string;
  end_hours_clock?: string;
  end_ghati_clock?: string;
  next?: AngaBlock;
};

type Props = {
  p?: PanchangaDay;
  selectedDay?: CalendarDay | null;
  selectedAdDate?: string;
  location?: PanchangaLocation;
  bsYear?: number;
  bsMonth?: number;
  loading?: boolean;
};

function AsideFooter({
  p,
  location,
  selectedAdDate,
}: {
  p: PanchangaDay;
  location: PanchangaLocation;
  selectedAdDate: string;
}) {
  const { t } = useTranslation();
  const { lang } = useLocale();
  const abhijit = getAbhijitMuhurta(p);
  const isEn = lang === "en";

  return (
    <div className={homeClasses.vivaranFooter}>
      {abhijit ? (
        <p className={cn("m-0", homeClasses.vivaranFooterText)}>
          <span className={homeClasses.vivaranFooterStrong}>{t("abhijit.title")}</span>{" "}
          <span className={homeClasses.vivaranFooterNum}>
            {abhijit.rangeDisplay}
            {abhijit.noonDisplay
              ? isEn
                ? ` (noon ${abhijit.noonDisplay})`
                : ` (${t("abhijit.noon_short")} ${abhijit.noonDisplay})`
              : ""}
          </span>
        </p>
      ) : (
        <p className="m-0 text-sm text-base">{t("abhijit.unavailable")}</p>
      )}
      <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
        <Link to="/panchanga" search={currentPatroDayLinkSearch(location, selectedAdDate)}>
          {t("panchanga.detail_title")}
        </Link>
      </Button>
    </div>
  );
}

type DetailCell = {
  label: string;
  value?: ReactNode;
  hint?: ReactNode;
  wide?: boolean;
  mono?: boolean;
};

function angaName(anga: AngaBlock | null | undefined, lang: string): string | undefined {
  if (!anga) return undefined;
  return lang === "en" ? anga.name ?? anga.name_ne : anga.name_ne ?? anga.name;
}

function VivaranCell({ label, value, hint, wide, mono }: DetailCell) {
  return (
    <div className={cn(homeClasses.vivaranTile, "shadow-ring-soft", wide && "col-span-2")}>
      <div className={homeClasses.vivaranLabel}>{label}</div>
      <div className={cn(homeClasses.vivaranValue, mono && homeClasses.vivaranValueMono)}>
        {value ?? "—"}
      </div>
      {hint ? <div className={cn(homeClasses.vivaranHint, "break-words")}>{hint}</div> : null}
    </div>
  );
}

function buildPanchangaDetailCells(
  p: PanchangaDay,
  t: TFunction,
  lang: string,
  selectedDay?: CalendarDay | null,
): DetailCell[] {
  const detail = getPanchangaDetail(p);
  const nakshatra = (detail?.nakshatra ?? p.nakshatra) as AngaBlock | undefined;
  const yoga = (detail?.yoga ?? p.yoga) as AngaBlock | undefined;
  const karana = (detail?.karana ?? p.karana) as AngaBlock | undefined;
  const karanaHint = formatAngaPatroTransitionHint(karana, lang);

  const sunrise =
    getSunriseDisplay(p) ?? (selectedDay?.sunrise ? formatClockNepali(selectedDay.sunrise) : undefined);
  const sunset =
    getSunsetDisplay(p) ?? (selectedDay?.sunset ? formatClockNepali(selectedDay.sunset) : undefined);
  const moonrise =
    getMoonriseDisplay(p, lang) ??
    (selectedDay ? formatMonthMoonEventDisplay(selectedDay, "moonrise", lang) : undefined);
  const ayana = getAyanaDisplay(p, selectedDay, lang);

  return [
    {
      label: t("aside.sunrise_sunset"),
      value:
        sunrise && sunset ? (
          <>
            {sunrise} / {sunset}
            {ayana ? (
              <span
                className={cn(
                  isAyanaNorthMark(ayana.mark) ? patroAyanaNorth : patroAyanaSouth,
                  "mb-0 ml-1.5",
                )}
                title={ayana.label}
              >
                {ayana.mark}
              </span>
            ) : null}
          </>
        ) : undefined,
      mono: true,
    },
    { label: t("aside.moonrise"), value: moonrise ?? t("sections.dash"), mono: true },
    (() => {
      const value = getRituDisplay(p, lang);
      const hint = getRituSeason(p, lang);
      // Nepali names the season and the ritu with the same word — don't print
      // "ग्रीष्म" twice.
      return { label: t("aside.ritu"), value, hint: hint === value ? undefined : hint };
    })(),
    {
      label: t("aside.nakshatra"),
      value: angaName(nakshatra, lang),
      hint: formatAngaPatroTransitionHint(nakshatra, lang),
    },
    {
      label: t("aside.yoga"),
      value: angaName(yoga, lang),
      hint: formatAngaPatroTransitionHint(yoga, lang),
    },
    {
      label: t("aside.karana"),
      value: angaName(karana, lang),
      hint: karanaHint,
    },
  ];
}

function SolarCorrectionAsideCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn("flex flex-col", homeClasses.vivaranTile, homeClasses.gocharTile, "shadow-ring-soft")}>
      <span className={homeClasses.gocharName}>{label}</span>
      <span className={cn(homeClasses.solarValue, "tabular-nums")}>{value}</span>
    </div>
  );
}

export function PanchangaVivaranPanel({ p, selectedDay, selectedAdDate, location, loading }: Props) {
  const { t } = useTranslation();
  const { lang } = useLocale();

  if (loading || !p) {
    return (
      <section className="rounded-lg bg-card shadow-ring-soft">
        <div className={cn("grid grid-cols-2 gap-2", homeClasses.vivaranCells)}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={cn(homeClasses.vivaranTile, "shadow-ring-soft")}>
              <div className={homeClasses.vivaranLabel}>…</div>
              <div className="mt-1.5 h-[18px] animate-pulse rounded-full bg-muted-foreground/20" />
            </div>
          ))}
        </div>
        <div className="mt-2.5 h-[120px] animate-pulse rounded-md bg-muted" />
      </section>
    );
  }

  const cells = buildPanchangaDetailCells(p, t, lang, selectedDay);
  const planets = getPlanetGocharLines(p, lang);
  const solar = getSolarCorrections(p);
  const hasSolar =
    solar?.deshaantar != null || solar?.akshamsha != null || solar?.belaantar != null;
  const solarCards = hasSolar
    ? (
        [
          ["aside.deshaantar", solar?.deshaantar] as const,
          ["aside.akshamsha", solar?.akshamsha] as const,
          ["aside.belaantar", solar?.belaantar] as const,
        ] as const
      ).map(([labelKey, block]) => ({
        label: t(labelKey),
        value: formatPatroSignedCorrection(block) ?? "—",
      }))
    : [];

  return (
    <section className="min-h-full rounded-lg bg-card">
      <div className={cn("grid grid-cols-2 gap-2", homeClasses.vivaranCells)}>
        {cells.map((cell) => (
          <VivaranCell key={cell.label} {...cell} />
        ))}
      </div>

      {planets.length > 0 ? (
        <div className={homeClasses.gocharSection}>
          <div className={homeClasses.gocharTitle}>{t("aside.gochar")}</div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {planets.map(({ key, label, rashi, degree, isRetrograde, isCombust }) => (
              <div
                key={key}
                className={cn("flex flex-col", homeClasses.vivaranTile, homeClasses.gocharTile, "shadow-ring-soft")}
              >
                <span className={cn("flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5", homeClasses.gocharName)}>
                  <span className="min-w-0 break-words">
                    {label}
                    {rashi ? (
                      <>
                        {" "}
                        <span aria-hidden>→</span> {rashi}
                      </>
                    ) : null}
                  </span>
                  <GrahaStatusBadges
                    planetKey={key}
                    isRetrograde={isRetrograde}
                    isCombust={isCombust}
                    size={12}
                  />
                </span>
                <span className={cn(homeClasses.gocharDegree, "tabular-nums")}>
                  {degree}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {solarCards.length > 0 ? (
        <div
          className={planets.length > 0 ? homeClasses.solarWithPlanets : homeClasses.solarAlone}
        >
          <div className="grid grid-cols-3 gap-1.5">
            {solarCards.map(({ label, value }) => (
              <SolarCorrectionAsideCard key={label} label={label} value={value} />
            ))}
          </div>
        </div>
      ) : null}

      {location && selectedAdDate ? (
        <AsideFooter p={p} location={location} selectedAdDate={selectedAdDate} />
      ) : null}
    </section>
  );
}
