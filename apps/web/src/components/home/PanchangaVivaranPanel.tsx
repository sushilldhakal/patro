import type { ReactNode } from "react";
import type { TFunction } from "i18next";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
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
} from "@/lib/panchanga-format";
import { useLocale } from "@/i18n/locale";
import { cn } from "@/lib/utils";
import { patroAyanaNorth, patroAyanaSouth } from "@/lib/patro-classes";
import { Button } from "@/components/ui/button";

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
    <div className="mt-2.5 border-t border-foreground/10 pt-2.5">
      {abhijit ? (
        <p className="m-0 text-sm leading-snug text-foreground">
          <span className="font-semibold">{t("abhijit.title")}</span>{" "}
          <span className="font-num font-semibold">
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
    <div className={cn("min-w-0 rounded-lg bg-surface-inset p-2.5 shadow-ring-soft", wide && "col-span-2")}>
      <div className="text-sm text-base tracking-[0.12em] uppercase">{label}</div>
      <div className={cn("mt-1 text-base leading-snug font-semibold text-foreground", mono && "mono text-sm")}>
        {value ?? "—"}
      </div>
      {hint ? <div className="mt-0.5 text-sm leading-snug text-base break-words">{hint}</div> : null}
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
    <div className="flex min-w-0 flex-col gap-0.5 rounded-[5px] bg-surface-inset p-2.5 shadow-ring-soft">
      <span className="text-sm leading-tight font-semibold text-foreground">{label}</span>
      <span className="mono text-sm font-semibold leading-tight tabular-nums text-foreground">{value}</span>
    </div>
  );
}

export function PanchangaVivaranPanel({ p, selectedDay, selectedAdDate, location, loading }: Props) {
  const { t } = useTranslation();
  const { lang } = useLocale();

  if (loading || !p) {
    return (
      <section className="rounded-lg bg-card shadow-ring-soft">
        <div className="mb-2.5 grid grid-cols-2 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="min-w-0 rounded-lg bg-surface-inset p-2.5 shadow-ring-soft">
              <div className="text-sm text-base tracking-[0.12em] uppercase">…</div>
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
      <div className="mb-2.5 grid grid-cols-2 gap-2">
        {cells.map((cell) => (
          <VivaranCell key={cell.label} {...cell} />
        ))}
      </div>

      {planets.length > 0 ? (
        <div className="mt-2.5 border-t border-foreground/10">
          <div className="mb-1.5 text-sm font-bold text-foreground">{t("aside.gochar")}</div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {planets.map(({ key, label, rashi, degree, isRetrograde, isCombust }) => (
              <div
                key={key}
                className="flex min-w-0 flex-col gap-0.5 rounded-[5px] bg-surface-inset p-2.5 shadow-ring-soft"
              >
                <span className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-sm leading-tight font-semibold text-foreground">
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
                <span className="font-num text-sm font-semibold leading-tight tabular-nums text-foreground">
                  {degree}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {solarCards.length > 0 ? (
        <div
          className={cn(
            "border-t border-foreground/10 pt-2",
            planets.length > 0 ? "mt-1.5" : "mt-2.5",
          )}
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
