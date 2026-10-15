import { Link } from "@tanstack/react-router";
import type { CalendarDay, PanchangaDay } from "@/lib/api";
import type { PanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { currentPatroDayLinkSearch } from "@/lib/url-state";
import { GrahaStatusBadges } from "@/components/graha/GrahaStatusBadges";
import {
  usePanchangaVivaran,
  type VivaranCell as VivaranCellData,
} from "@vedic-patro/features/home";
import { cn } from "@vedic-patro/domain/utils";
import { patroAyanaNorth, patroAyanaSouth } from "@/lib/patro-classes";
import { Button } from "@/components/ui/button";
import { homeClasses } from "@vedic-patro/design-tokens/classes/home-classes";

type Props = {
  p?: PanchangaDay;
  selectedDay?: CalendarDay | null;
  selectedAdDate?: string;
  location?: PanchangaLocation;
  bsYear?: number;
  bsMonth?: number;
  loading?: boolean;
};

function VivaranCell({ label, value, hint, mono, ayana }: VivaranCellData) {
  return (
    <div className={cn(homeClasses.vivaranTile, "shadow-ring-soft")}>
      <div className={homeClasses.vivaranLabel}>{label}</div>
      <div
        className={cn(
          homeClasses.vivaranValue,
          mono && homeClasses.vivaranValueMono,
        )}
      >
        {value ?? "—"}
        {ayana ? (
          <span
            className={cn(
              ayana.north ? patroAyanaNorth : patroAyanaSouth,
              "mb-0 ml-1.5",
            )}
            title={ayana.label}
          >
            {ayana.mark}
          </span>
        ) : null}
      </div>
      {hint ? (
        <div className={cn(homeClasses.vivaranHint, "break-words")}>{hint}</div>
      ) : null}
    </div>
  );
}

function SolarCorrectionAsideCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col",
        homeClasses.vivaranTile,
        homeClasses.gocharTile,
        "shadow-ring-soft",
      )}
    >
      <span className={homeClasses.gocharName}>{label}</span>
      <span className={cn(homeClasses.solarValue, "tabular-nums")}>
        {value}
      </span>
    </div>
  );
}

export function PanchangaVivaranPanel({
  p,
  selectedDay,
  selectedAdDate,
  location,
  loading,
}: Props) {
  const view = usePanchangaVivaran({ p, selectedDay });
  if (loading || !p || !view) {
    return (
      <section className="rounded-lg bg-card shadow-ring-soft">
        <div className={cn("grid grid-cols-2 gap-2", homeClasses.vivaranCells)}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={cn(homeClasses.vivaranTile, "shadow-ring-soft")}
            >
              <div className={homeClasses.vivaranLabel}>…</div>
              <div className="mt-1.5 h-[18px] animate-pulse rounded-full bg-muted-foreground/20" />
            </div>
          ))}
        </div>
        <div className="mt-2.5 h-[120px] animate-pulse rounded-md bg-muted" />
      </section>
    );
  }

  return (
    <section className="min-h-full rounded-lg bg-card">
      <div className={cn("grid grid-cols-2 gap-2", homeClasses.vivaranCells)}>
        {view.cells.map((cell) => (
          <VivaranCell key={cell.label} {...cell} />
        ))}
      </div>

      {view.planets.length > 0 ? (
        <div className={homeClasses.gocharSection}>
          <div className={homeClasses.gocharTitle}>{view.gocharTitle}</div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {view.planets.map(
              ({ key, label, rashi, degree, isRetrograde, isCombust }) => (
                <div
                  key={key}
                  className={cn(
                    "flex flex-col",
                    homeClasses.vivaranTile,
                    homeClasses.gocharTile,
                    "shadow-ring-soft",
                  )}
                >
                  <span
                    className={cn(
                      "flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5",
                      homeClasses.gocharName,
                    )}
                  >
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
                  <span
                    className={cn(homeClasses.gocharDegree, "tabular-nums")}
                  >
                    {degree}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      ) : null}

      {view.solar.length > 0 ? (
        <div
          className={
            view.planets.length > 0
              ? homeClasses.solarWithPlanets
              : homeClasses.solarAlone
          }
        >
          <div className="grid grid-cols-3 gap-1.5">
            {view.solar.map(({ label, value }) => (
              <SolarCorrectionAsideCard
                key={label}
                label={label}
                value={value}
              />
            ))}
          </div>
        </div>
      ) : null}

      {location && selectedAdDate ? (
        <div className={homeClasses.vivaranFooter}>
          {view.abhijit ? (
            <p className={cn("m-0", homeClasses.vivaranFooterText)}>
              <span className={homeClasses.vivaranFooterStrong}>
                {view.abhijit.title}
              </span>{" "}
              <span className={homeClasses.vivaranFooterNum}>
                {view.abhijit.range}
              </span>
            </p>
          ) : (
            <p className="m-0 text-sm text-base">{view.abhijitUnavailable}</p>
          )}
          <Button variant="outline" size="sm" className="mt-3 w-full" asChild>
            <Link
              to="/panchanga"
              search={currentPatroDayLinkSearch(location, selectedAdDate)}
            >
              {view.detailLink}
            </Link>
          </Button>
        </div>
      ) : null}
    </section>
  );
}
