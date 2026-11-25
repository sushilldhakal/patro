import { useRef, type CSSProperties } from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import {
  ChevronDown,
  CloudSun,
  MapPin,
  Navigation2,
  Plus,
  Star,
  X,
} from "lucide-react";
import {
  useWeatherPage,
  type WeatherFact,
  type WeatherHourView,
  type WeatherHourlyRow,
  type WeatherPage,
  type WeatherPlacesStorage,
} from "@vedic-patro/features/weather";
import { weatherInk } from "@vedic-patro/design-tokens";
import { cn } from "@vedic-patro/design-tokens/cn";
import { weatherClasses as wc } from "@vedic-patro/design-tokens/classes/weather-classes";
import { PageHeader, PageShell } from "@/components/PageShell";
import {
  usePanchangaLocation,
  type PanchangaLocation,
} from "@/components/panchanga/use-panchanga-location";
import { Sheet } from "@vedic-patro/ui";
import {
  FactIcon,
  UiIcon,
  UvDot,
  WeatherGlyph,
  WindArrow,
} from "@vedic-patro/ui/kit/weather";
import { usePatroLocationUrlBrowse } from "@/hooks/use-patro-url-browse";
import { useRouteLoading } from "@/lib/route-loading";
import { getLocalStorageItem, setLocalStorageItem } from "@/lib/browser";
import { LocationSearchPanel } from "@/components/panchanga/LocationSearchPanel";
import { locateDevice } from "@/components/panchanga/locate-device";

const routeApi = getRouteApi("/panchanga-shell/weather");

/** The sky gradient of both themes, from the shared tokens. */
const SKY = {
  "--wx-a": weatherInk.sky.light[0],
  "--wx-b": weatherInk.sky.light[1],
  "--wx-c": weatherInk.sky.dark[0],
  "--wx-d": weatherInk.sky.dark[1],
} as CSSProperties;

function Facts({ title, facts }: { title: string; facts: WeatherFact[] }) {
  return (
    <div className={cn("flex flex-col", wc.detailBlock)}>
      <h3 className={cn("m-0", wc.detailTitle)}>{title}</h3>
      {facts.map((f) => (
        <p key={f.key} className="m-0 flex items-center gap-2.5">
          {f.icon ? <FactIcon icon={f.icon} size={18} /> : null}
          <span>
            <span className={wc.factValue}>{f.value}</span>{" "}
            <span className={wc.factLabel}>{f.label}</span>
          </span>
        </p>
      ))}
    </div>
  );
}

function Hero({ page }: { page: WeatherPage }) {
  const now = page.now!;
  // A horizontal swipe on the sky (touch screens) moves between places.
  const touchX = useRef<number | null>(null);
  const { copy } = page;
  return (
    <section className={cn(wc.hero, wc.heroEnter)}>
      <div
        style={SKY}
        onTouchStart={(e) => (touchX.current = e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          const start = touchX.current;
          const end = e.changedTouches[0]?.clientX;
          touchX.current = null;
          if (start == null || end == null || Math.abs(end - start) < 50)
            return;
          if (end < start) page.places.next();
          else page.places.prev();
        }}
        className={cn(
          "flex flex-col bg-[linear-gradient(to_bottom,var(--wx-a),var(--wx-b))] dark:bg-[linear-gradient(to_bottom,var(--wx-c),var(--wx-d))]",
          wc.heroBody,
        )}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => page.places.setListOpen(true)}
            className={cn(wc.placeTrigger, wc.heroPlace)}
          >
            {page.usingGps ? (
              <Navigation2 className="size-5 shrink-0" aria-hidden />
            ) : (
              <MapPin className="size-5 shrink-0" aria-hidden />
            )}
            <span className="truncate">{page.placeName}</span>
            <ChevronDown className="size-4 shrink-0" aria-hidden />
          </button>
          <button
            type="button"
            aria-label={page.copy.addPlace}
            onClick={() => page.places.setAddOpen(true)}
            className={cn(wc.iconButton, wc.chipPress)}
          >
            <Plus className="size-6 text-foreground" aria-hidden />
          </button>
        </div>
        <div className={cn("flex", wc.heroTempRow)}>
          <div>
            <p className={cn("m-0", wc.heroTemp)}>{now.temperature}</p>
            <p className={cn("m-0 mt-2", wc.heroFeels)}>{now.feelsLike}</p>
          </div>
          <WeatherGlyph glyph={now.glyph} size={88} />
        </div>
        <div className="flex gap-8">
          {now.range.map((r) => (
            <div key={r.key}>
              <p className={cn("m-0", wc.heroRangeValue)}>{r.value}</p>
              <p className={cn("m-0", wc.heroRangeLabel)}>{r.label}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <p className={cn("m-0", wc.heroLine)}>{now.rainLine}</p>
          <p className={cn("m-0", wc.heroLine)}>{now.glyph.label}</p>
        </div>
      </div>
      <button
        type="button"
        aria-expanded={page.todayOpen}
        onClick={page.toggleToday}
        className={cn("flex w-full cursor-pointer text-left", wc.heroToggle)}
      >
        <span className={wc.heroToggleText}>
          {page.todayOpen ? copy.showLessToday : copy.showMoreToday}
        </span>
        <ChevronDown
          className={cn(
            "size-5 text-secondary transition-transform dark:text-primary",
            page.todayOpen && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {page.todayOpen ? (
        <div className={cn("animate-in fade-in duration-200", wc.todayGrid)}>
          <Facts title={copy.currentTitle} facts={now.current} />
          {now.rainChanceLine ? (
            <Facts
              title={copy.rainTitle}
              facts={[
                {
                  key: "rain",
                  value: now.rainChanceLine,
                  label: "",
                  icon: { kind: "icon", name: "raindrops" },
                },
              ]}
            />
          ) : null}
          <Facts title={copy.sunTitle} facts={now.sun} />
        </div>
      ) : null}
    </section>
  );
}

function RowCells({
  row,
  hours,
  starts,
}: {
  row: WeatherHourlyRow;
  hours: WeatherHourView[];
  starts: Set<string>;
}) {
  return (
    <div className="flex">
      {hours.map((h) => (
        <div
          key={h.key}
          className={cn(
            "flex flex-col",
            wc.cell,
            h.night && wc.cellNight,
            starts.has(h.key) && wc.dayDivider,
          )}
        >
          {row === "feels" ? (
            <span className={wc.cellText}>{h.feels}</span>
          ) : null}
          {row === "rain_mm" ? (
            <span className={wc.cellText}>{h.rainMm}</span>
          ) : null}
          {row === "gust" ? (
            <span className={wc.cellText}>{h.gust}</span>
          ) : null}
          {row === "humidity" ? (
            <span className={wc.cellText}>{h.humidity}</span>
          ) : null}
          {row === "dew" ? <span className={wc.cellText}>{h.dew}</span> : null}
          {row === "wind" && h.wind ? (
            <>
              <WindArrow wind={h.wind} />
              <span className={wc.cellText}>{h.wind.direction}</span>
              <span className={wc.cellSub}>{h.wind.value}</span>
            </>
          ) : null}
          {row === "uv" && h.uv ? (
            <span className={cn("flex items-center gap-1.5", wc.cellText)}>
              <UvDot uv={h.uv} />
              {h.uv.value}
            </span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function Hourly({ page }: { page: WeatherPage }) {
  const hours = page.hourGroups.flatMap((g) => g.hours);
  // The first hour of every later day draws the day line.
  const starts = new Set(page.hourGroups.slice(1).map((g) => g.hours[0]!.key));
  return (
    <section className={wc.section}>
      <div className="flex gap-2 overflow-x-auto p-4" role="tablist">
        {page.filters.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={f.active}
            onClick={f.select}
            className={cn(wc.chipPress, f.active ? wc.chipActive : wc.chip)}
          >
            <span className={f.active ? wc.chipTextActive : wc.chipText}>
              {f.label}
            </span>
          </button>
        ))}
      </div>
      <div className="overflow-x-auto overscroll-x-contain pb-2">
        <div className="w-max min-w-full">
          <div className="flex">
            {page.hourGroups.map((g, i) => (
              <div
                key={g.key}
                className={cn(wc.dayHead, i > 0 && wc.dayDivider)}
                style={{ width: `${g.hours.length * 4}rem` }}
              >
                <span className={cn("sticky left-3", wc.dayHeadText)}>
                  {g.label}
                </span>
              </div>
            ))}
          </div>
          <div className="flex">
            {hours.map((h) => (
              <div
                key={h.key}
                className={cn(
                  "flex flex-col gap-2",
                  wc.cell,
                  h.night && wc.cellNight,
                  starts.has(h.key) && wc.dayDivider,
                )}
              >
                <span className={wc.cellTime}>{h.time}</span>
                <WeatherGlyph glyph={h.glyph} size={40} />
                <span className={wc.cellTemp}>{h.temperature}</span>
              </div>
            ))}
          </div>
          {page.rows.map((row) => (
            <div key={row}>
              <div className={wc.rowCaption}>
                <span
                  className={cn(
                    "sticky left-3 inline-flex",
                    wc.rowCaptionInner,
                  )}
                >
                  <span className={wc.rowCaptionText}>
                    {page.copy.rows[row].label}
                  </span>
                  <button
                    type="button"
                    aria-label={`${page.copy.aboutRow}: ${page.copy.rows[row].label}`}
                    onClick={() => page.openInfo(row)}
                    className="inline-flex cursor-pointer rounded-full p-0.5"
                  >
                    <UiIcon name="info" size={18} />
                  </button>
                </span>
              </div>
              <RowCells row={row} hours={hours} starts={starts} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Daily({ page }: { page: WeatherPage }) {
  const { copy } = page;
  return (
    <section className={wc.section}>
      <h2 className={cn("m-0 px-4 pt-4 pb-2", wc.sectionTitle)}>
        {copy.dailyTitle}
      </h2>
      <ul className="m-0 list-none p-0">
        {page.days.map((d) => {
          const open = page.openDay === d.key;
          return (
            <li key={d.key}>
              <button
                type="button"
                aria-expanded={open}
                onClick={() => page.toggleDay(d.key)}
                className={cn("flex", wc.dayButton, wc.dayRow)}
              >
                <span
                  className={cn("w-20 shrink-0 truncate sm:w-28", wc.dayName)}
                >
                  <span className="sm:hidden">{d.weekdayShort}</span>
                  <span className="max-sm:hidden">{d.weekday}</span>
                </span>
                <WeatherGlyph glyph={d.glyph} size={36} />
                <span className={cn("min-w-0 flex-1 truncate", wc.dayLabel)}>
                  {d.glyph.label}
                </span>
                <span className={cn("w-9 shrink-0 text-right", wc.dayLow)}>
                  {d.low}
                </span>
                <span className={cn("w-9 shrink-0 text-right", wc.dayHigh)}>
                  {d.high}
                </span>
                <span className={cn("w-16 shrink-0 text-right", wc.dayRain)}>
                  {d.rainAmount}
                </span>
                <ChevronDown
                  className={cn(wc.chevron, open && "rotate-180")}
                  aria-hidden
                />
              </button>
              {open ? (
                <div
                  className={cn("flex flex-col", wc.panelEnter, wc.dayPanel)}
                >
                  <p className={cn("m-0", wc.dayPanelDate)}>
                    {d.weekday} · {d.dateLabel}
                  </p>
                  <div className="flex items-center gap-4">
                    <WeatherGlyph glyph={d.glyph} size={56} />
                    <p className={cn("m-0", wc.dayPanelLabel)}>
                      {d.glyph.label} · {d.rainAmount}
                    </p>
                  </div>
                  <dl className={wc.dayFacts}>
                    {d.details.map((f) => (
                      <div key={f.key} className="flex gap-2">
                        <dt className={wc.factLabel}>{f.label}</dt>
                        <dd className={cn("m-0", wc.factValue)}>{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {page.toggleAllDays ? (
        <button
          type="button"
          onClick={page.toggleAllDays}
          className={cn("w-full cursor-pointer text-left", wc.moreButton)}
        >
          <span className={wc.moreButtonText}>
            {page.allDays ? copy.showFewerDays : copy.showAllDays}
          </span>
        </button>
      ) : null}
    </section>
  );
}

/** Saved weather places (localStorage). */
const PLACES_STORAGE: WeatherPlacesStorage = {
  read: getLocalStorageItem,
  write: setLocalStorageItem,
};

/** Which place is showing; each dot is a button. Under the sky, centred. */
function PlaceDots({ page }: { page: WeatherPage }) {
  const { places, copy } = page;
  if (places.pages.length < 2) return null;
  return (
    <div className="flex justify-center" title={copy.swipeHint}>
      <div className={cn("flex", wc.dotsPill)}>
        {places.pages.map((p, i) => (
          <button
            key={p.id}
            type="button"
            aria-label={p.name}
            aria-current={i === places.index}
            onClick={() => places.select(i)}
            className={wc.dotButton}
          >
            {p.here ? (
              <Navigation2
                className={cn(
                  "size-2.5",
                  i === places.index ? "opacity-100" : "opacity-40",
                )}
                aria-hidden
              />
            ) : (
              <span className={i === places.index ? wc.dotActive : wc.dot} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function PlacesDialogs({
  page,
  location,
}: {
  page: WeatherPage;
  location: PanchangaLocation;
}) {
  const { places, copy } = page;
  const closeList = () => places.setListOpen(false);
  return (
    <>
      <Sheet
        open={places.addOpen}
        onClose={() => places.setAddOpen(false)}
        title={copy.addPlace}
        closeLabel={copy.close}
      >
        <LocationSearchPanel
          location={location}
          onLocationChange={places.pick}
          active={places.addOpen}
        />
      </Sheet>
      <Sheet
        open={places.pending != null}
        onClose={places.cancel}
        title={copy.primaryAsk}
        closeLabel={copy.close}
        placement="center"
      >
        <p className={cn("m-0", wc.infoBody)}>{copy.primaryAskBody}</p>
        <div className={cn("flex", wc.dialogActions)}>
          <button
            type="button"
            onClick={() => places.confirm(false)}
            className={cn(wc.chip, wc.chipPress)}
          >
            <span className={wc.chipText}>{copy.justAdd}</span>
          </button>
          <button
            type="button"
            onClick={() => places.confirm(true)}
            className={cn(wc.chipActive, wc.chipPress)}
          >
            <span className={wc.chipTextActive}>{copy.makePrimary}</span>
          </button>
        </div>
      </Sheet>
      <Sheet
        open={places.listOpen}
        onClose={closeList}
        title={copy.placesTitle}
        closeLabel={copy.close}
      >
        <ul className="m-0 list-none p-0">
          {places.pages.map((p, i) => (
            <li key={p.id} className={cn("flex", wc.placeRow)}>
              <button
                type="button"
                onClick={() => {
                  places.select(i);
                  closeList();
                }}
                className={cn("flex", wc.placeRowButton)}
              >
                {p.here ? (
                  <Navigation2 className="size-4 shrink-0 text-secondary dark:text-primary" />
                ) : (
                  <MapPin className="size-4 shrink-0 text-secondary dark:text-primary" />
                )}
                <span
                  className={cn(
                    "truncate",
                    i === places.index ? wc.placeNameActive : wc.placeName,
                  )}
                >
                  {p.name}
                </span>
                {p.primary ? (
                  <span className={wc.primaryBadge}>{copy.primary}</span>
                ) : null}
              </button>
              {p.primary ? null : (
                <button
                  type="button"
                  aria-label={copy.makePrimary}
                  onClick={() => places.makePrimary(p.id)}
                  className={wc.iconButton}
                >
                  <Star className="size-5 text-secondary dark:text-primary" />
                </button>
              )}
              {p.here ? null : (
                <button
                  type="button"
                  aria-label={copy.remove}
                  onClick={() => places.remove(p.id)}
                  className={wc.iconButton}
                >
                  <X className="size-5 text-secondary dark:text-primary" />
                </button>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            closeList();
            places.setAddOpen(true);
          }}
          className={cn(
            "mt-4 inline-flex items-center gap-2",
            wc.chipActive,
            wc.chipPress,
          )}
        >
          <Plus className="size-4" aria-hidden />
          <span className={wc.chipTextActive}>{copy.addPlace}</span>
        </button>
      </Sheet>
    </>
  );
}

/** Weather — the website's drawing of `useWeatherPage` (@vedic-patro/features). */
export function Weather() {
  const navigate = useNavigate({ from: "/weather" });
  const search = routeApi.useSearch();
  const { location, setLocation } = usePanchangaLocation();
  usePatroLocationUrlBrowse(search, navigate, location, setLocation);
  const page = useWeatherPage({
    location,
    locate: locateDevice,
    storage: PLACES_STORAGE,
  });
  const { copy } = page;

  useRouteLoading(page.status === "loading");

  return (
    <PageShell className="space-y-4 pb-16" showRelatedLinks={false}>
      <div className={cn("flex", wc.headerRow)}>
        <PageHeader
          icon={
            <CloudSun
              className="size-7 text-secondary dark:text-primary"
              strokeWidth={1.8}
            />
          }
          title={copy.title}
          subtitle={copy.subtitle}
        />
      </div>

      {page.status === "error" ? (
        <p className="text-sm text-danger">{copy.loadError}</p>
      ) : null}
      {page.status === "loading" ? (
        <p className="text-sm text-muted-foreground">{copy.loading}</p>
      ) : null}
      {page.now ? (
        <>
          <Hero page={page} />
          <PlaceDots page={page} />
          <Hourly page={page} />
          <Daily page={page} />
          <footer className={cn("flex flex-col", wc.footer)}>
            <div>
              <h3 className={cn("m-0", wc.footerTitle)}>{copy.updatedTitle}</h3>
              <p className={cn("m-0", wc.footerText)}>{copy.updated}</p>
            </div>
            <div>
              <h3 className={cn("m-0", wc.footerTitle)}>
                {copy.locationTitle}
              </h3>
              <p className={cn("m-0", wc.footerText)}>{copy.locationNote}</p>
            </div>
            <p className={cn("m-0", wc.footerText)}>{copy.unitsNote}</p>
            <p className={cn("m-0", wc.footerText)}>{copy.source}</p>
          </footer>
        </>
      ) : null}
      <PlacesDialogs page={page} location={location} />
      <Sheet
        open={page.info != null}
        onClose={page.closeInfo}
        title={page.info?.title}
        closeLabel={copy.close}
        placement="center"
      >
        <p className={cn("m-0", wc.infoBody)}>{page.info?.body}</p>
      </Sheet>
    </PageShell>
  );
}

export default Weather;
