/**
 * 3D Aakash Gochar — the website's drawing of `useAakashGocharPage`
 * (@vedic-patro/features): the day, the clock, the instant the scene shows,
 * the fetch, the selection and the copy are shared with the app. The calendar
 * the date nav browses in (BS / BBS / AD) is page state here.
 */

import { useCallback, useRef, useState } from "react";
import { Orbit, TriangleAlert } from "lucide-react";
import { useAakashGocharPage } from "@vedic-patro/features/aakash-gochar";
import { PageShell, PageHeader } from "@/components/PageShell";
import { PatroDayTimeNav } from "@/components/patro-date";
import { VedicPatroLoader } from "@/components/VedicPatroLoader";
import { AakashGocharSky } from "@/components/sky3d/AakashGocharSky";
import { GocharSkySection } from "@vedic-patro/ui/kit/panchanga";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { isGregorianEraBrowse } from "@vedic-patro/domain/calendar/patro-month-labels";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { useOnCalendarSwitch } from "@/hooks/use-on-calendar-switch";
import { eraForCalendar } from "@vedic-patro/domain/calendar/calendar-system";
import { useHydrated } from "@/hooks/use-hydrated";
import { useRouteLoading } from "@/lib/route-loading";
import type { Era } from "@vedic-patro/domain/calendar/era";
import { pickAdDate, pickBrowseVikramDate } from "@/lib/patro-date-options";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";
import { cn } from "@vedic-patro/design-tokens/cn";

/** Canvas height when the page is not fullscreen. */
const SCENE_HEIGHT = 560;

export function AakashGochar() {
  const { location, setLocation } = usePanchangaLocation();
  /* WebGL cannot run during the prerender; the sky waits one commit. */
  const hydrated = useHydrated();
  const page = useAakashGocharPage({ location, ready: hydrated });
  const { setDate } = page;

  /* Which calendar the date nav browses in — page state rather than the URL:
     the era names the day on screen, the Date stays the one source of truth. */
  const calendarEra = useCalendarEra();
  const [era, setEra] = useState<Era>(() => (calendarEra === "ad" ? "ad" : "bs"));
  /* The Vikram day the nav shows when it came from a Vikram pick (adToBS cannot
     name a पू.वि.सं. day). */
  const [vikram, setVikram] = useState<{ era: Era; year: number; month: number; day: number } | null>(null);
  /* Flipping the calendar system moves the nav to the new calendar on the same civil day. */
  useOnCalendarSwitch((calendar) => {
    setEra(eraForCalendar(calendar));
    setVikram(null);
  });

  /** A date from anywhere but a Vikram pick drops the Vikram parts of the day being left. */
  const changeDate = useCallback(
    (next: Date) => {
      setVikram(null);
      setDate(next);
    },
    [setDate],
  );

  /** Which Vikram pick is the live one — only the newest backend answer may land. */
  const pickToken = useRef(0);
  const handleEraChange = useCallback(
    (nextEra: Era, calendar?: { year: number; month: number; day: number }) => {
      setEra(nextEra);
      if (!calendar) return;
      if (isGregorianEraBrowse(nextEra)) {
        setVikram(null);
        pickAdDate(setDate, calendar.year, calendar.month, calendar.day);
        return;
      }
      pickToken.current += 1;
      const token = pickToken.current;
      pickBrowseVikramDate(
        (next, parts) => {
          if (token !== pickToken.current) return;
          setVikram(parts ? { era: nextEra, ...parts } : null);
          setDate(next);
        },
        nextEra,
        calendar.year,
        calendar.month,
        calendar.day,
        location.params,
      );
    },
    [location.params, setDate],
  );

  useRouteLoading(page.loading);

  return (
    <PageShell>
      <PageHeader
        icon={<Orbit className="size-7 text-secondary" strokeWidth={1.75} aria-hidden />}
        title={page.copy.title}
        subtitle={page.copy.subtitle}
      />

      <PatroDayTimeNav
        date={page.date}
        onDateChange={changeDate}
        era={era}
        onEraChange={handleEraChange}
        vikram={vikram}
        civilDateAd={page.dateAd}
        todayAd={page.todayAd}
        clock={page.clock}
        onClockChange={page.setClock}
        location={location}
        onLocationChange={setLocation}
      />

      {page.showLoader ? (
        <div className={cn("flex justify-center", gocharClasses.skyLoading)}>
          <VedicPatroLoader />
        </div>
      ) : (
        <AakashGocharSky
          gochar={page.gochar}
          ayanamsaDeg={page.ayanamsaDeg}
          vedicStars={page.vedicStars}
          date={page.sceneDate}
          onDateChange={changeDate}
          era={era}
          vikram={vikram}
          onEraChange={handleEraChange}
          clock={page.clock}
          onClockChange={page.setClock}
          observer={page.observer}
          timeZone={page.timeZone}
          placeLabel={page.locationLabel}
          height={SCENE_HEIGHT}
          selectedKey={page.selectedKey}
          onSelectedKeyChange={page.setSelectedKey}
        />
      )}

      {page.isError ? (
        <p className={cn("m-0 flex items-start", gocharClasses.skyNotice)}>
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          <span>{page.copy.fetchError}</span>
        </p>
      ) : null}

      {page.gochar ? (
        <div className={page.stale ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <GocharSkySection
            gochar={page.gochar}
            dateLabel={page.dateLabel}
            selectedPlanet={page.selectedKey}
            onSelectPlanet={page.toggleSelected}
          />
        </div>
      ) : null}

      <div className={cn("flex flex-col", gocharClasses.footnoteStack)}>
        {page.copy.footnotes.map((note) => (
          <p key={note} className={cn("m-0", gocharClasses.footnote)}>
            {note}
          </p>
        ))}
      </div>
    </PageShell>
  );
}

export default AakashGochar;
