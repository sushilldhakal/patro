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
import { isGregorianEraBrowse } from "@/components/patro-date/patro-month-labels";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { useHydrated } from "@/hooks/use-hydrated";
import { useLocale, bilingualText } from "@/i18n/locale";
import { useRouteLoading } from "@/lib/route-loading";
import { fetchGochar, gocharKeys } from "@/lib/api";
import type { Era } from "@/lib/era";
import { formatGocharPatroDate } from "@/lib/gochar-page-utils";
import type { GrahaKey } from "@/lib/graha-details";
import { pickAdDate, pickBrowseVikramDate } from "@/lib/patro-date-options";
import { toAdStr } from "@/lib/patro-day";
import { KATHMANDU, type Observer } from "@/lib/sky3d/horizon";
import {
  clockStringInTimezone,
  todayAdStringInTimezone,
  zonedWallTimeToInstant,
} from "@/lib/zoned-time";

/** Canvas height when the page is not fullscreen. */
const SCENE_HEIGHT = 560;

export function AakashGochar() {
  const { lang } = useLocale();
  const pick = (ne: string, en: string) => bilingualText(lang, ne, en);

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
        title={pick("३D आकाश गोचर", "3D Aakash Gochar")}
        subtitle={`${pick(
          "भूकेन्द्रित दृष्टिकोणबाट प्रत्यक्ष ग्रह गोचर",
          "Live graha transits from the geocentric standpoint",
        )} · ${locationLabel}`}
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
        <div className="flex items-center justify-center rounded-2xl border border-dashed border-border py-24">
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
        <p className="m-0 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-sm text-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
          <span>
            {pick(
              "सर्भरबाट ग्रह विवरण ल्याउन सकिएन — आकाश आफ्नै गणितमा चलिरहेको छ, त्यसैले स्थिति अनुमानित हुन सक्छ।",
              "Could not load graha details from the server — the sky is running on its own model, so positions may be approximate.",
            )}
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

      <div className="flex flex-col gap-2">
        <p className="m-0 text-sm leading-relaxed text-muted-foreground">
          {pick(
            "पृथ्वी केन्द्रमा छ र क्यामेरा त्यसैको वरिपरि घुम्छ — यही भूकेन्द्रित दृष्टिकोणबाट वैदिक गोचर हेरिन्छ। प्रत्येक ग्रह आफ्नो निरयन देशान्तर र शरमा राखिएको छ, र चन्द्रदेखि शनिसम्मको परम्परागत क्रममा आफ्नो कक्षमा हिँड्छ।",
            "Earth sits at the centre and the camera orbits it — the geocentric standpoint Vedic gochar is read from. Each graha is placed at its true sidereal longitude and shara, riding a shell in the classical Moon-to-Saturn order.",
          )}
        </p>
        <p className="m-0 text-sm leading-relaxed text-muted-foreground">
          {pick(
            "राशि वलय अक्षांश अनुसार ढल्किन्छ र घण्टै पिच्छे घुम्छ, त्यसैले यो पृथ्वीको कक्षसँग समानान्तर देखिँदैन। पहेँलो रेखा खगोलीय विषुवत् हो; त्यससँगको २३.४४° को झुकाव यहीँ प्रस्ट देखिन्छ।",
            "The rashi belt tips with your latitude and swings with the hour, which is why it does not sit parallel to anything. The gold line is the celestial equator; the 23.44° tilt between the two is visible right there.",
          )}
        </p>
        <p className="m-0 text-sm leading-relaxed text-muted-foreground">
          {pick(
            "कुनै पनि ग्रह — आकाशमा वा तलको कार्डमा — छानेपछि त्यसको ४५ दिन अघि र पछिको गति रेखा देखिन्छ; मंगल वा शनि वक्री हुँदा त्यही रेखामा पछाडि फर्किएको पासो देखिन्छ। क्रसहेयर थिचे क्यामेरा त्यही ग्रहमा केन्द्रित रहन्छ — वा गोलामा रहेको आफ्नै स्थान छाने त्यसैमा।",
            "Pick any graha — in the sky or on a card below — to draw its trail 45 days either side of the moment on screen; when Mars or Saturn turns vakri you can watch the loop close on itself. The crosshair button then keeps the camera centred on it — or on your own place on the globe, if that is what you point it at.",
          )}
        </p>
        <p className="m-0 text-sm leading-relaxed text-muted-foreground">
          {pick(
            "तलका ग्रह विवरण माथि छानिएको मिति र स्थानका लागि सर्भरबाट आउँछन्, र आकाश पनि तिनै अंकमा जोडिएको छ — मिति वा स्थान फेर्दा दुवै सँगै फेरिन्छन्। तर «चलाउनुहोस्» थिचेर समय अघि बढाउँदा आकाश मात्र हिँड्छ; विवरण छानिएकै मितिको रहन्छ।",
            "The graha details below come from the server for the date and place chosen above, and the sky is pinned to those same numbers — change either and both follow. Pressing play moves the sky alone, though: the details stay with the chosen date.",
          )}
        </p>
        <p className="m-0 text-sm leading-relaxed text-muted-foreground">
          {pick(
            "गोलामा रातो चिन्हले तपाईंको स्थान देखाउँछ। त्यो थिचे वा क्रसहेयरबाट «तपाईंको स्थान» छाने क्यामेरा त्यसैमा अडिन्छ — पृथ्वी उसै गरी घुमिरहन्छ, तर तपाईंको ठाउँ पर्दाको बीचमै रहन्छ, ठ्याक्कै ग्रह लक गरेजस्तै।",
            "The red marker on the globe is where you are watching from. Press it — or pick “Your location” behind the crosshair — and the camera holds it in the middle of the screen. The Earth keeps turning exactly as before; your place simply stays centred as it goes round, the same way locking a graha works.",
          )}
        </p>
        <p className="m-0 text-sm leading-relaxed text-muted-foreground">
          {pick(
            "माउसले तानेर आकाश घुमाउनुहोस्, स्क्रोल गरेर नजिक-टाढा गर्नुहोस्; टचस्क्रिनमा दुई औंलाले पनि हुन्छ।",
            "Drag to swing the sky and scroll to zoom; on a touchscreen, drag with one finger and pinch with two.",
          )}
        </p>
      </div>
    </PageShell>
  );
}

export default AakashGochar;
