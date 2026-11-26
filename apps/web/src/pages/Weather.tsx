import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type TouchEvent,
} from "react";
import { getRouteApi, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  ChevronRight,
  CloudSun,
  Ellipsis,
  MapPin,
  Menu,
  Navigation2,
  RefreshCw,
  Search,
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
import { weatherInk, weatherSkyAt } from "@vedic-patro/design-tokens";
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

/** Text and marks on the sky: white at every hour, in both themes (the sky follows the sun). */
const ON_SKY = "text-white";
/** Night hours: neutral grey on light (from --wx-night, set on the table), the muted tone on dark. */
const NIGHT_CELL = "bg-[var(--wx-night)] dark:bg-muted";

/** One fact with its icon: bold value, then its label. */
function FactLine({ fact }: { fact: WeatherFact }) {
  return (
    <p className="m-0 flex items-center gap-2.5">
      {fact.icon ? <FactIcon icon={fact.icon} size={18} /> : null}
      <span>
        <span className={wc.factValue}>{fact.value}</span>{" "}
        <span className={wc.factLabel}>{fact.label}</span>
      </span>
    </p>
  );
}

function Facts({ title, facts }: { title: string; facts: WeatherFact[] }) {
  return (
    <div className={cn("flex flex-col", wc.detailBlock)}>
      <h3 className={cn("m-0", wc.detailTitle)}>{title}</h3>
      {facts.map((f) => (
        <FactLine key={f.key} fact={f} />
      ))}
    </div>
  );
}

function Hero({ page }: { page: WeatherPage }) {
  const now = page.now!;
  const { copy } = page;
  const [top, bottom] = weatherSkyAt(now.daylight);
  return (
    <section className={cn(wc.hero, wc.heroEnter)}>
      <div
        style={{ backgroundImage: `linear-gradient(to bottom, ${top}, ${bottom})` }}
        className={cn("flex flex-col", wc.heroBody)}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => page.places.setListOpen(true)}
            className={cn(wc.placeTrigger, wc.heroPlace, ON_SKY)}
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
            aria-label={page.copy.placesTitle}
            onClick={() => page.places.setListOpen(true)}
            className={cn(wc.iconButton, wc.chipPress)}
          >
            <Menu className={cn("size-6", ON_SKY)} aria-hidden />
          </button>
        </div>
        {/* Two columns, so the sky is short: temperature, feels-like and low/high on the left;
            the icon, condition, rain and air quality on the right. */}
        <div className="flex gap-4">
          <div className="flex flex-col gap-3">
            <div>
              <p className={cn("m-0", wc.heroTemp, ON_SKY)}>{now.temperature}</p>
              <p className={cn("m-0", wc.heroFeels, ON_SKY)}>{now.feelsLike}</p>
            </div>
            <div className="flex gap-6">
              {now.range.map((r) => (
                <div key={r.key}>
                  <p className={cn("m-0", wc.heroRangeValue, ON_SKY)}>{r.value}</p>
                  <p className={cn("m-0", wc.heroRangeLabel, ON_SKY)}>{r.label}</p>
                </div>
              ))}
            </div>
          </div>
          <div className={cn("flex flex-col", wc.heroSide)}>
            <WeatherGlyph glyph={now.glyph} size={88} onSky />
            <p className={cn("m-0", wc.heroLine, ON_SKY)}>{now.glyph.label}</p>
            <p className={cn("m-0", wc.heroFeels, ON_SKY)}>{now.rainLine}</p>
            {now.airLine ? <p className={cn("m-0", wc.heroFeels, ON_SKY)}>{now.airLine}</p> : null}
          </div>
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

/** Height of the tallest rain bar (the wettest hour shown), in px. */
const RAIN_BAR = 28;
/** Bars scale to at least this many mm, so a drizzle-only day does not draw full bars. */
const RAIN_SCALE_MIN = 2;

function RowCells({
  row,
  hours,
  maxRain,
}: {
  row: WeatherHourlyRow;
  hours: WeatherHourView[];
  maxRain: number;
}) {
  return (
    <div className="flex">
      {hours.map((h) => (
        <div
          key={h.key}
          className={cn(
            "flex flex-col",
            wc.cell,
            h.night && NIGHT_CELL,
          )}
        >
          {row === "feels" ? (
            <span className={wc.cellText}>{h.feels}</span>
          ) : null}
          {row === "rain_mm" ? (
            <>
              <span className={wc.cellText}>{h.rainMm}</span>
              {/* A bar as tall as the hour's share of the wettest hour, in the dim accent. */}
              <span className="flex w-full items-end" style={{ height: RAIN_BAR }}>
                {h.rain > 0 ? (
                  <span
                    className="w-full rounded-sm bg-secondary/25 dark:bg-primary/30"
                    style={{ height: Math.max(2, (h.rain / Math.max(maxRain, RAIN_SCALE_MIN)) * RAIN_BAR) }}
                  />
                ) : null}
              </span>
            </>
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

/** Column index where each later day starts. */
function dayLineOffsets(groups: WeatherPage["hourGroups"]): number[] {
  let n = 0;
  return groups.map((g) => (n += g.hours.length) - g.hours.length).slice(1);
}

function Hourly({ page }: { page: WeatherPage }) {
  const hours = page.hourGroups.flatMap((g) => g.hours);
  const maxRain = Math.max(0, ...hours.map((h) => h.rain));
  const lineOffsets = dayLineOffsets(page.hourGroups);
  return (
    <section className={wc.section} data-no-swipe>
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
        <div
          className="relative w-max min-w-full"
          style={{ "--wx-night": weatherInk.nightCellLight } as CSSProperties}
        >
          <div className="flex">
            {page.hourGroups.map((g) => (
              <div
                key={g.key}
                className={wc.dayHead}
                style={{ width: `${g.hours.length * 4}rem` }}
              >
                <span className={cn("sticky left-3", wc.dayHeadText)}>
                  {g.label}
                </span>
              </div>
            ))}
          </div>
          <div className="flex border-t border-border">
            {hours.map((h) => (
              <div
                key={h.key}
                className={cn(
                  "flex flex-col gap-2",
                  wc.cell,
                  h.night && NIGHT_CELL,
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
                    "sticky left-3 z-10 inline-flex",
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
              <RowCells row={row} hours={hours} maxRain={maxRain} />
            </div>
          ))}
          {lineOffsets.map((n) => (
            <div
              key={n}
              aria-hidden
              className={cn("pointer-events-none", wc.dayLine)}
              style={{ left: `calc(${n * 4}rem - 1px)` }}
            />
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
                  {/* Icon beside min/max and the condition. */}
                  <div className="flex items-center gap-4">
                    <WeatherGlyph glyph={d.glyph} size={56} />
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="m-0 flex flex-wrap gap-x-5">
                        {d.range.map((r) => (
                          <span key={r.key}>
                            <span className={wc.dayPanelRangeValue}>{r.value}</span>{" "}
                            <span className={wc.factLabel}>{r.label}</span>
                          </span>
                        ))}
                      </p>
                      <p className={cn("m-0", wc.dayPanelLabel)}>{d.glyph.label}</p>
                    </div>
                  </div>
                  {/* Rain | wind side by side, then sun/moon/UV across with its lines in two columns;
                      one column on a narrow screen. */}
                  <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    {d.sections.map((sec) => {
                      const full = sec.facts.length > 2;
                      return (
                        <div key={sec.key} className={cn("flex flex-col", wc.dayPanelSection, full && "sm:col-span-2")}>
                          <h3 className={cn("m-0", wc.dayPanelTitle)}>{sec.title}</h3>
                          <div className={cn("grid gap-3", full && "sm:grid-cols-2")}>
                            {sec.facts.map((f) => (
                              <FactLine key={f.key} fact={f} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
                  "size-3.5",
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

function MenuItem({
  label,
  onClick,
  checked,
  chevron,
}: {
  label: string;
  onClick: () => void;
  checked?: boolean;
  chevron?: boolean;
}) {
  return (
    <button
      type="button"
      role={checked == null ? "menuitem" : "menuitemradio"}
      aria-checked={checked}
      onClick={onClick}
      className={cn("flex w-full cursor-pointer text-left", wc.menuItem)}
    >
      <span className={wc.menuItemText}>{label}</span>
      {checked ? <Check className="size-4" aria-hidden /> : null}
      {chevron ? <ChevronRight className="size-4" aria-hidden /> : null}
    </button>
  );
}

/** One saved place: name, local time, temperature now, condition and today's low / high. */
function PlaceCard({
  page,
  place: p,
  index,
}: {
  page: WeatherPage;
  place: WeatherPage["places"]["pages"][number];
  index: number;
}) {
  const { places, copy } = page;
  const s = p.summary;
  const open = () => {
    places.select(index);
    places.setListOpen(false);
  };
  return (
    <li
      className={cn(
        "flex flex-col",
        wc.placeCard,
        index === places.index && wc.placeCardActive,
        !places.editing && "cursor-pointer hover:bg-muted",
      )}
      onClick={places.editing ? undefined : open}
    >
      <div className="flex items-start gap-3">
        <div className={cn("flex flex-col", wc.placeText)}>
          <button
            type="button"
            disabled={places.editing}
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
            className={cn(
              "flex",
              wc.placeNameRow,
              wc.placeCardName,
            )}
          >
            {p.here ? (
              <Navigation2 className="size-3.5 shrink-0" aria-hidden />
            ) : null}
            <span className="truncate">{p.name}</span>
          </button>
          <div className="flex items-center gap-2">
            <span className={wc.placeCardTime}>{s?.time ?? " "}</span>
            {p.primary ? (
              <span className={wc.primaryBadge}>{copy.primary}</span>
            ) : null}
          </div>
        </div>
        {places.editing ? (
          <div className="flex">
            {p.primary ? null : (
              <button
                type="button"
                aria-label={`${copy.makePrimary}: ${p.name}`}
                onClick={() => places.makePrimary(p.id)}
                className={wc.iconButton}
              >
                <Star className="size-5 text-secondary dark:text-primary" />
              </button>
            )}
            {p.here ? null : (
              <button
                type="button"
                aria-label={`${copy.remove}: ${p.name}`}
                onClick={() => places.remove(p.id)}
                className={wc.iconButton}
              >
                <X className="size-5 text-secondary dark:text-primary" />
              </button>
            )}
          </div>
        ) : (
          <span className={wc.placeCardTemp}>{s?.temperature ?? "–"}</span>
        )}
      </div>
      {s ? (
        <div className="flex items-center gap-2">
          <WeatherGlyph glyph={s.glyph} size={24} />
          <span className={cn("flex-1 truncate", wc.placeCardMeta)}>
            {s.glyph.label}
          </span>
          <span className={wc.placeCardMeta}>
            L:{s.low} H:{s.high}
          </span>
        </div>
      ) : null}
    </li>
  );
}

/** Units: temperature, wind and rain, each a list with a tick. */
function UnitsSheet({
  page,
  open,
  onClose,
}: {
  page: WeatherPage;
  open: boolean;
  onClose: () => void;
}) {
  const { units, copy } = page;
  const groups = [
    ["temp", copy.unitsTemp],
    ["wind", copy.unitsWind],
    ["rain", copy.unitsRain],
  ] as const;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={copy.units}
      closeLabel={copy.close}
    >
      {groups.map(([key, title]) => (
        <div key={key} role="group" aria-label={title}>
          <h3 className={cn("m-0", wc.unitGroupTitle)}>{title}</h3>
          {units.options[key].map((o) => (
            <MenuItem
              key={o.id}
              label={o.label}
              checked={units.value[key] === o.id}
              onClick={() => units.set({ [key]: o.id })}
            />
          ))}
        </div>
      ))}
    </Sheet>
  );
}

/**
 * The places list (the ☰ in the sky): every saved place with its temperature now, today's
 * low / high and local time; a search bar at the bottom adds one; ⋯ holds edit list and units.
 */
function PlacesDialogs({
  page,
  location,
}: {
  page: WeatherPage;
  location: PanchangaLocation;
}) {
  const { places, copy, units } = page;
  const [menuOpen, setMenuOpen] = useState(false);
  const [unitsOpen, setUnitsOpen] = useState(false);
  return (
    <>
      <Sheet
        open={places.listOpen}
        onClose={() => {
          setMenuOpen(false);
          places.setListOpen(false);
        }}
        title={copy.placesTitle}
        closeLabel={copy.close}
        fullHeight
      >
        <div className="flex min-h-full flex-col gap-3">
          <div className="relative flex justify-end">
            {places.editing ? (
              <button
                type="button"
                onClick={() => places.setEditing(false)}
                className={cn(wc.chip, wc.chipPress)}
              >
                <span className={wc.chipText}>{copy.done}</span>
              </button>
            ) : (
              <button
                type="button"
                aria-label={copy.moreOptions}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((v) => !v)}
                className={cn(wc.iconButton, "border border-border")}
              >
                <Ellipsis className="size-5 text-foreground" aria-hidden />
              </button>
            )}
            {menuOpen ? (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden
                />
                <div role="menu" className={cn("z-20 top-12", wc.menuCard)}>
                  <MenuItem
                    label={copy.editList}
                    onClick={() => {
                      setMenuOpen(false);
                      places.setEditing(true);
                    }}
                  />
                  {units.options.temp.map((o) => (
                    <MenuItem
                      key={o.id}
                      label={o.label}
                      checked={units.value.temp === o.id}
                      onClick={() => {
                        setMenuOpen(false);
                        units.set({ temp: o.id });
                      }}
                    />
                  ))}
                  <MenuItem
                    label={copy.units}
                    chevron
                    onClick={() => {
                      setMenuOpen(false);
                      setUnitsOpen(true);
                    }}
                  />
                </div>
              </>
            ) : null}
          </div>
          <ul className={cn("flex flex-col", wc.placeList)}>
            {places.pages.map((p, i) => (
              <PlaceCard key={p.id} page={page} place={p} index={i} />
            ))}
          </ul>
          <div className={wc.placeListFooter}>
            <button
              type="button"
              onClick={() => places.setAddOpen(true)}
              className={cn("w-full cursor-pointer text-left", wc.searchBar)}
            >
              <Search className="size-5 text-muted-foreground" aria-hidden />
              <span className={wc.searchBarText}>{copy.searchPlace}</span>
            </button>
          </div>
        </div>
      </Sheet>
      <UnitsSheet
        page={page}
        open={unitsOpen}
        onClose={() => setUnitsOpen(false)}
      />
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
    </>
  );
}

/**
 * Pull down at the top of the page (touch screens) to refetch, with a spinner like the browser's.
 * The browser's own pull-to-reload is turned off on this page so the two do not both fire.
 */
function usePullRefresh(refresh: () => Promise<unknown>) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const live = useRef({ startY: null as number | null, pull: 0, busy: false });
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });
  useEffect(() => {
    const html = document.documentElement;
    const before = html.style.overscrollBehaviorY;
    html.style.overscrollBehaviorY = "contain";
    const s = live.current;
    const onStart = (e: globalThis.TouchEvent) => {
      s.startY = window.scrollY <= 0 && !s.busy ? (e.touches[0]?.clientY ?? null) : null;
    };
    const onMove = (e: globalThis.TouchEvent) => {
      if (s.startY == null) return;
      const dy = (e.touches[0]?.clientY ?? 0) - s.startY;
      s.pull = dy > 0 && window.scrollY <= 0 ? Math.min(120, dy * 0.5) : 0;
      setPull(s.pull);
    };
    const onEnd = () => {
      if (s.startY == null) return;
      s.startY = null;
      const go = s.pull >= 64;
      s.pull = 0;
      setPull(0);
      if (!go) return;
      s.busy = true;
      setBusy(true);
      void refreshRef.current().finally(() => {
        s.busy = false;
        setBusy(false);
      });
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      html.style.overscrollBehaviorY = before;
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, []);
  const shown = busy ? 64 : pull;
  return shown > 0 ? (
    <div
      aria-live="polite"
      className={cn("flex", wc.pullLayer)}
      style={{ transform: `translateY(${shown - 24}px)` }}
    >
      <span className={cn("flex", wc.pullBubble)}>
        <RefreshCw
          className={cn(
            "size-5 text-secondary dark:text-primary",
            busy && "animate-spin",
          )}
          style={busy ? undefined : { transform: `rotate(${pull * 3}deg)` }}
          aria-hidden
        />
      </span>
    </div>
  ) : null;
}

const EASE = "cubic-bezier(0.2, 0, 0, 1)";
const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/**
 * Touch screens: the page follows the finger sideways (anywhere but the hourly table), then slides
 * out and the next place slides in from the other side. Dots and the list slide the same way.
 */
function useDragPager(page: WeatherPage) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    x: number;
    y: number;
    dx: number;
    axis: "x" | "y" | null;
  } | null>(null);
  const { places } = page;
  const canNext = places.index < places.pages.length - 1;
  const canPrev = places.index > 0;

  // The new place slides in from the side it came from.
  const shown = useRef(places.index);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || shown.current === places.index) return;
    const from = places.fromRight ? "100%" : "-100%";
    shown.current = places.index;
    el.style.transition = "none";
    el.style.transform = "";
    if (!reducedMotion())
      el.animate(
        [{ transform: `translateX(${from})` }, { transform: "translateX(0)" }],
        { duration: 280, easing: EASE },
      );
  }, [places.index, places.fromRight]);

  const set = (x: number, ms: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = ms ? `transform ${ms}ms ${EASE}` : "none";
    el.style.transform = x ? `translateX(${x}px)` : "";
  };

  return {
    ref,
    style: { touchAction: "pan-y" } as CSSProperties,
    onTouchStart: (e: TouchEvent) => {
      const t = e.touches[0];
      const inScroller = (e.target as Element).closest("[data-no-swipe]");
      drag.current =
        t && !inScroller
          ? { x: t.clientX, y: t.clientY, dx: 0, axis: null }
          : null;
    },
    onTouchMove: (e: TouchEvent) => {
      const d = drag.current;
      const t = e.touches[0];
      if (!d || !t) return;
      const dx = t.clientX - d.x;
      const dy = t.clientY - d.y;
      if (!d.axis && Math.hypot(dx, dy) > 8)
        d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      if (d.axis !== "x") return;
      // Past the first or last place the page only gives a little.
      const edge = (dx < 0 && !canNext) || (dx > 0 && !canPrev);
      d.dx = edge ? dx * 0.25 : dx;
      set(d.dx, 0);
    },
    onTouchEnd: () => {
      const d = drag.current;
      drag.current = null;
      if (!d || d.axis !== "x") return;
      const width = ref.current?.offsetWidth ?? window.innerWidth;
      const go =
        Math.abs(d.dx) > Math.min(120, width * 0.25)
          ? d.dx < 0 && canNext
            ? places.next
            : d.dx > 0 && canPrev
              ? places.prev
              : null
          : null;
      if (!go || reducedMotion()) {
        set(0, go ? 0 : 220);
        go?.();
        return;
      }
      set(d.dx < 0 ? -width : width, 200);
      window.setTimeout(go, 200);
    },
  };
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
  const pager = useDragPager(page);
  const pullSpinner = usePullRefresh(page.refresh);

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
        <div className="overflow-x-clip">
        <div className="space-y-4" {...pager}>
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
        </div>
        </div>
      ) : null}
      {pullSpinner}
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
