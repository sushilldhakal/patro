/**
 * 3D Aakash Gochar — the live sky in three dimensions, seen from the Earth.
 *
 * The API supplies the sidereal longitudes for the chosen date; the scene pins
 * its own orbital model onto them and animates outward from there, so pressing
 * play walks the real gochar forward rather than an approximation of it.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Orbit, TriangleAlert } from "lucide-react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { PatroDayTimeNav } from "@/components/patro-date";
import { VedicPatroLoader } from "@/components/VedicPatroLoader";
import { AakashGocharSky } from "@/components/sky3d/AakashGocharSky";
import { GocharSkySection } from "@/components/gochar/GocharSkySection";
import {
  displayLocationLabel,
  resolveLocationTimezone,
  usePanchangaLocation,
} from "@/components/panchanga/use-panchanga-location";
import { isGregorianEraBrowse } from "@vedic-patro/domain/patro-month-labels";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { useHydrated } from "@/hooks/use-hydrated";
import { useLocale } from "@/i18n/locale";
import { useRouteLoading } from "@/lib/route-loading";
import { fetchGochar, gocharKeys } from "@/lib/api";
import type { Era } from "@vedic-patro/domain/era";
import { formatGocharPatroDate } from "@vedic-patro/domain/gochar-page-utils";
import type { GrahaKey } from "@vedic-patro/domain/graha-details";
import { pickAdDate, pickBrowseVikramDate } from "@/lib/patro-date-options";
import { toAdStr } from "@vedic-patro/domain/patro-day";
import { KATHMANDU, type Observer } from "@vedic-patro/domain/sky3d/horizon";
import {
  clockStringInTimezone,
  todayAdStringInTimezone,
  zonedWallTimeToInstant,
} from "@vedic-patro/domain/zoned-time";
import { gocharClasses } from "@vedic-patro/design-tokens/classes/gochar-classes";
import { cn } from "@vedic-patro/domain/utils";

import { tFor } from "@vedic-patro/i18n/runtime";
/** Canvas height when the page is not fullscreen. */
const SCENE_HEIGHT = 560;

export function AakashGochar() {
  const { lang } = useLocale();

  const { location, setLocation } = usePanchangaLocation();
  /* The HUD names this zone on screen, and the default location carries no
     timezone of its own — so resolve through the helper that falls back to
     Nepal time rather than letting it read "UTC" over a Kathmandu sky. */
  const tz = resolveLocationTimezone(location);
  const todayAd = todayAdStringInTimezone(new Date(), tz);
  /* Noon rather than midnight, and only ever read for its year/month/day: an
     hour in the middle of the day cannot be tipped onto the day either side by
     the device's own offset the way `T00:00:00` can. The time of day the scene
     actually opens at is {@link clock}. */
  const [date, setDate] = useState(() => new Date(`${todayAd}T12:00:00`));

  /**
   * The time of day the sky opens at — the place's own wall clock, now.
   *
   * The page is "what is overhead here", so a fixed midday meant every visit
   * outside the middle of the day opened on a sky that was not the one outside
   * the window, and the reader had to correct the clock before the view said
   * anything true. Read in the location's zone, not the device's, for the same
   * reason the rest of the page is: the pickers offer that place's wall clock
   * and the HUD reads it back the same way.
   */
  const [clock, setClock] = useState(() => clockStringInTimezone(new Date(), tz));

  /**
   * Whether the reader has set a time themselves.
   *
   * Until they have, the clock is a default rather than a choice, so it follows
   * the place: picking Tokyo should open on Tokyo's sky now, not on Tokyo at
   * Kathmandu's hour. Once they have chosen an hour it is theirs, and changing
   * the location must not quietly overwrite it.
   */
  const [clockChosen, setClockChosen] = useState(false);
  const changeClock = useCallback((next: string) => {
    setClockChosen(true);
    setClock(next);
  }, []);

  /* Re-anchor on the new zone during the render that first sees it — the
     derived-state-from-props pattern, rather than an effect that would paint
     the old place's hour for one frame first. */
  const [clockTz, setClockTz] = useState(tz);
  if (clockTz !== tz) {
    setClockTz(tz);
    if (!clockChosen) setClock(clockStringInTimezone(new Date(), tz));
  }

  /**
   * Which calendar the date nav is browsing in.
   *
   * The nav only offers its BS↔BBS toggle to a page that can take the answer,
   * so without this the era was whatever the UI language implied and पू.वि.सं.
   * — every date before the Vikram epoch — was simply unreachable here. Which
   * is the one page it least belongs on: the sky runs to both ends of history,
   * and the eight thousand years the nav can now reach are all inside it.
   *
   * Page state rather than the URL browse machinery the other day pages use:
   * this route carries no search params, and the era is a way of naming the day
   * on screen, not a second source of truth for which day that is. The `Date`
   * stays the only one of those.
   */
  const langEra = useCalendarEra();
  const [era, setEra] = useState<Era>(() => (langEra === "ad" ? "ad" : "bs"));
  /**
   * The Vikram day the nav is showing, when it came from a Vikram pick.
   *
   * Without it the nav re-derives the day through `adToBS`, whose table starts
   * at the Vikram epoch: a पू.वि.सं. date came back as a nonsense BS year with
   * a वि.सं. label on it, so arriving at the date you asked for still left the
   * wrong one on screen. The parts here are the ones that were asked for and
   * anchored, which is what the nav wants to print.
   */
  const [vikram, setVikram] = useState<{
    era: Era;
    year: number;
    month: number;
    day: number;
  } | null>(null);

  /**
   * A date arriving from anywhere but a Vikram pick — the AD picker, "today",
   * the sky's own date sheet. The Vikram parts on screen belonged to the day
   * being left, so they go with it and the nav derives the new one itself.
   */
  const changeDate = useCallback((next: Date) => {
    setVikram(null);
    setDate(next);
  }, []);
  /* Held here rather than inside the sky, so clicking a graha up in the canvas
     and clicking its card down in the grid are the same act. */
  const [selectedKey, setSelectedKey] = useState<GrahaKey | null>(null);

  /**
   * WebGL cannot run during the build-time prerender, and rendering the canvas
   * on the very first client pass would not match the HTML that shipped. So the
   * sky waits one commit; the loader below is what the crawler sees.
   */
  const hydrated = useHydrated();

  /**
   * Whether the sky has ever been on screen.
   *
   * Once it has, it stays: swapping it back out for the loader unmounts the
   * canvas and takes the camera, the view mode, the selection and fullscreen
   * with it — so picking a date from inside the sky would drop you back to the
   * page's default view instead of moving to that date. The query keeps the
   * previous day's rows on screen meanwhile, and the scene runs on its own
   * model regardless, so there is nothing to wait for.
   */
  const [skyShown, setSkyShown] = useState(false);

  /** Which Vikram pick is the live one — see {@link handleEraChange}. */
  const pickToken = useRef(0);

  /* Through the shared helper, not hand-rolled: a पू.वि.सं. day lands in the
     centuries before the Christian era, and `${year}-${m}-${d}` writes those as
     "-57-01-01" — which is not the proleptic ISO the API reads. */
  const dateAd = useMemo(() => toAdStr(date), [date]);

  /* The scene reads a single instant — merge the picked day with the picked
     clock so the time pickers actually move the sky, not just the date.

     Resolved in the *place's* zone, not the device's: the pickers offer
     Kathmandu's wall clock and the HUD reads it back the same way, so building
     the instant with `setHours` would land whoever is not sitting in that zone
     on a different moment than the one they chose. */
  const sceneDate = useMemo(() => {
    const [hour = 0, minute = 0, second = 0] = clock.split(":").map(Number);
    return zonedWallTimeToInstant(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
      hour || 0,
      minute || 0,
      tz,
      second || 0,
    );
  }, [date, clock, tz]);

  /* The horizon/globe view is drawn from these coordinates — the observer frame
     and the "you are here" pin both. Every stored location carries them, so the
     constant below is a type-level backstop rather than a place we land on. */
  const observer: Observer = useMemo(() => {
    const { lat, lon } = location.params;
    return lat != null && lon != null ? { lat, lon } : KATHMANDU;
  }, [location.params]);

  const query = useQuery({
    queryKey: gocharKeys.dayLegacy(dateAd, "ad", location.params),
    queryFn: () => fetchGochar(dateAd, "ad", location.params),
    /* Without this, `isLoading` goes true on every date change (no data yet
       under the new key), which swaps AakashGocharSky out for the spinner —
       unmounting it and wiping its fullscreen/mode/camera state. Keeping the
       previous day's data on screen during the refetch keeps it mounted.
       {@link skyShown} covers the case this cannot: a date whose fetch fails or
       has nothing to fall back on. */
    placeholderData: keepPreviousData,
  });

  // A one-way latch — once the sky has shown, it stays shown — so it's
  // flipped directly during render rather than through an effect: there is
  // no external system to synchronize with here, just a derived value.
  if (!skyShown && hydrated && !query.isLoading) {
    setSkyShown(true);
  }

  /* Clicking the card already selected clears it, matching the canvas. */
  const toggleSelected = useCallback(
    (key: GrahaKey) => setSelectedKey((prev) => (prev === key ? null : key)),
    [],
  );

  /**
   * The nav answering with a new era, and the day it wants read in it.
   *
   * Once the page takes this callback the nav routes its whole day-browse
   * through it — the era toggle, the year/day sheet, the arrows — so the
   * conversion has to happen here. `pickBrowseVikramDate` is the one that
   * matters: the offline Vikram table starts at the epoch and cannot date a
   * पू.वि.सं. day at all, so it asks the backend and lands the answer on
   * `setDate` when it comes back.
   */
  const handleEraChange = useCallback(
    (nextEra: Era, calendar?: { year: number; month: number; day: number }) => {
      setEra(nextEra);
      if (!calendar) return;
      if (isGregorianEraBrowse(nextEra)) {
        setVikram(null);
        pickAdDate(setDate, calendar.year, calendar.month, calendar.day);
        return;
      }
      /* A पू.वि.सं. day is a round trip to the backend, and the reader can pick
         again while it is in the air — so only the newest answer is allowed to
         land, or an abandoned date arrives after the one that replaced it. */
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
    [location.params],
  );

  const locationLabel = displayLocationLabel(location, undefined, lang);
  const dateLabel = useMemo(
    () => `${formatGocharPatroDate(dateAd, lang, { includeYear: true })} · ${locationLabel}`,
    [dateAd, lang, locationLabel],
  );

  /* Every data-driven page reports its own readiness — the shell's overlay
     starts up and stays up until one of them says otherwise, so without this a
     direct load of this route sits behind the loader for good. */
  useRouteLoading(query.isLoading && !query.data);

  const gochar = query.data?.gochar;
  /* The rows on screen belong to the previous date until the new ones land —
     say so rather than let the grid read as current. */
  const stale = query.isPlaceholderData && query.isFetching;

  return (
    <PageShell>
      <PageHeader
        icon={<Orbit className="size-7 text-secondary" strokeWidth={1.75} aria-hidden />}
        title={tFor(lang, "sidebar_nav.items.aakash-gochar.label")}
        subtitle={`${tFor(lang, "ui.aakash_gochar.live_graha_transits_from_the_geocentric")} · ${locationLabel}`}
      />

      <PatroDayTimeNav
        date={date}
        onDateChange={changeDate}
        era={era}
        onEraChange={handleEraChange}
        vikram={vikram}
        civilDateAd={dateAd}
        todayAd={todayAd}
        clock={clock}
        onClockChange={changeClock}
        location={location}
        onLocationChange={setLocation}
      />

      {!hydrated || (query.isLoading && !skyShown) ? (
        <div className={cn("flex justify-center", gocharClasses.skyLoading)}>
          <VedicPatroLoader />
        </div>
      ) : (
        /* The scene runs on its own model, so a failed fetch costs accuracy for
           the day on screen, not the view itself. */
        <AakashGocharSky
          gochar={gochar}
          ayanamsaDeg={query.data?.ayanamsa?.degrees}
          vedicStars={query.data?.vedic_stars}
          date={sceneDate}
          onDateChange={changeDate}
          /* The sky's own date picker is the only one within reach in
             fullscreen, so it browses through the same era machinery the nav
             above the canvas does — पू.वि.सं. included. */
          era={era}
          vikram={vikram}
          onEraChange={handleEraChange}
          clock={clock}
          onClockChange={changeClock}
          observer={observer}
          timeZone={tz}
          /* The sky names its observer-meridian toggle after this, so switching
             the page to another city renames the line with it. */
          placeLabel={locationLabel}
          height={SCENE_HEIGHT}
          selectedKey={selectedKey}
          onSelectedKeyChange={setSelectedKey}
        />
      )}

      {/* The scene carries its own orbital model, so a failed fetch costs the
          calibration for this date rather than the view — which is worth saying
          plainly, since nothing else on screen would look wrong. */}
      {query.isError ? (
        <p className={cn("m-0 flex items-start", gocharClasses.skyNotice)}>
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          <span>
            {tFor(lang, "ui.aakash_gochar.could_not_load_graha_details_from")}
          </span>
        </p>
      ) : null}

      {/* The server's own reading for the chosen date and place: the numbers the
          scene is pinned to. Selection runs both ways — picking a card marks
          that graha in the sky and draws its trail, and clicking one up in the
          canvas rings its card down here. */}
      {gochar ? (
        <div className={stale ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <GocharSkySection
            gochar={gochar}
            dateLabel={dateLabel}
            selectedPlanet={selectedKey}
            onSelectPlanet={toggleSelected}
          />
        </div>
      ) : null}

      <div className={cn("flex flex-col", gocharClasses.footnoteStack)}>
        <p className={cn("m-0", gocharClasses.footnote)}>
          {tFor(lang, "ui.aakash_gochar.earth_sits_at_the_centre_and")}
        </p>
        <p className={cn("m-0", gocharClasses.footnote)}>
          {tFor(lang, "ui.aakash_gochar.the_rashi_belt_tips_with_your")}
        </p>
        <p className={cn("m-0", gocharClasses.footnote)}>
          {tFor(lang, "ui.aakash_gochar.pick_any_graha_in_the_sky")}
        </p>
        <p className={cn("m-0", gocharClasses.footnote)}>
          {tFor(lang, "ui.aakash_gochar.the_graha_details_below_come_from")}
        </p>
        <p className={cn("m-0", gocharClasses.footnote)}>
          {tFor(lang, "ui.aakash_gochar.the_red_marker_on_the_globe")}
        </p>
        <p className={cn("m-0", gocharClasses.footnote)}>
          {tFor(lang, "ui.aakash_gochar.drag_to_swing_the_sky_and")}
        </p>
      </div>
    </PageShell>
  );
}

export default AakashGochar;
