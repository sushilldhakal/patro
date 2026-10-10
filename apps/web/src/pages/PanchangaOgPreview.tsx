import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { fetchPanchangaDay, panchangaKeys, type PanchangaDay } from "@/lib/api";
import { parsePatroDayUrl } from "@/lib/patro-day-url";
import { parseCivilIsoToDate } from "@/lib/patro-day";
import { searchToLocation } from "@/lib/url-state";
import { DayTimeline } from "@/components/panchanga/DayTimeline";
import { resolveTimeZone } from "@/lib/zoned-time";
import { useRouteLoading } from "@/lib/route-loading";
import { useLocale, bilingualText } from "@/i18n/locale";
import { BS_MONTH_NAMES, BS_MONTHS_NE, adToBS } from "@/lib/bs-calendar";
import {
  formatTimeShort,
  getPanchangaDetail,
  getSunriseDisplay,
  getSunsetDisplay,
  getVaaraEn,
  getVaaraNe,
  toNepaliDigits,
} from "@/lib/panchanga-format";

/**
 * Headless render target for the Open Graph share image. The backend points
 * Playwright at this route and screenshots the #og-capture element to produce
 * the /og-image PNG for a shared /panchanga link. Not linked anywhere and
 * noindex — it exists purely to be screenshotted.
 *
 * The capture box is locked to the 1200×630 Open Graph frame so the PNG fills
 * the preview card edge to edge: the chart is scaled to the available height and
 * the width it leaves over carries a summary panel. (A capture taller than
 * 1.91:1 gets fit-scaled by the backend, which is what left cream bars down
 * both sides of the old single-column layout.)
 */
const routeApi = getRouteApi("/panchanga/og-preview");

/** Default when the URL carries no location: Kathmandu (coords → no cities DB dependency). */
const KATHMANDU = {
  label: "Kathmandu",
  params: { lat: 27.7172, lon: 85.324, timezone: "Asia/Kathmandu" },
} as const;

const OG_W = 1200;
const OG_H = 630;
/** Width the chart is laid out at before it is scaled down into the frame. */
const CHART_NATURAL_W = 1000;
/** The summary panel needs at least this much, so the chart never eats the row. */
const PANEL_MIN_W = 330;
const COL_GAP = 18;

const AD_MONTHS_NE = [
  "जनवरी", "फेब्रुअरी", "मार्च", "अप्रिल", "मे", "जुन",
  "जुलाई", "अगस्ट", "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर",
];

type AngaLike = { name?: string; name_ne?: string; end_local_time?: string } | undefined;

function anga(p: PanchangaDay | undefined, key: "tithi" | "nakshatra" | "yoga" | "karana"): AngaLike {
  if (!p) return undefined;
  const detail = getPanchangaDetail(p);
  const fromDetail = p.mode === "ephemeris" ? undefined : (detail?.[key] as AngaLike);
  return fromDetail ?? ((p as unknown as Record<string, AngaLike>)[key]);
}

/** `full=1` keeps the old standalone tall chart (no 630px frame, no panel). */
function isFullMode(): boolean {
  if (typeof window === "undefined") return false;
  const v = new URLSearchParams(window.location.search).get("full");
  return v === "1" || v === "true";
}

export function PanchangaOgPreview() {
  const { lang, digits } = useLocale();
  const search = routeApi.useSearch();
  const location = searchToLocation(search) ?? KATHMANDU;
  const dayState = parsePatroDayUrl(search as Record<string, unknown>, lang === "en" ? "en" : "ne");
  const [full] = useState(isFullMode);

  const q = useQuery({
    queryKey: panchangaKeys.daySelection(dayState, location.params),
    queryFn: () => fetchPanchangaDay(dayState, location.params),
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });
  const p = q.data;
  const adDateStr = p?.date_ad ?? "";
  const tz = resolveTimeZone(p?.location?.timezone, location.params.timezone);

  // Never show the full-page route-loading overlay on the capture target — the
  // chart shows its own inline skeleton until the data arrives.
  useRouteLoading(false);

  // Scale the chart to the height the frame leaves it. Measured rather than
  // hard-coded because the chart grows a band whenever a day stacks extra
  // अशुभ / शुभ lanes.
  const bodyRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (full) return;
    const chart = chartRef.current;
    const body = bodyRef.current;
    if (!chart || !body) return;
    const natural = chart.getBoundingClientRect().height / (scale ?? 1);
    const avail = body.getBoundingClientRect().height;
    if (!natural || !avail) return;
    const maxScale = (OG_W - 40 - COL_GAP - PANEL_MIN_W) / CHART_NATURAL_W;
    const next = Math.min(maxScale, avail / natural);
    if (scale == null || Math.abs(next - scale) > 0.002) setScale(next);
  }, [full, p, scale]);

  // Signal the screenshotter that fonts have loaded and the chart has painted.
  const ready = (Boolean(p) || q.isError) && (full || scale != null);
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    let timer = 0;
    const mark = () => {
      document.getElementById("og-capture")?.setAttribute("data-og-ready", "1");
    };
    const fontsReady = (document as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready
      ?? Promise.resolve();
    void fontsReady.then(() => {
      raf = requestAnimationFrame(() => requestAnimationFrame(mark));
      // rAF never fires in a backgrounded tab; don't leave the screenshotter
      // waiting on a frame that isn't coming.
      timer = window.setTimeout(mark, 400);
    });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [ready]);

  const placeLabel =
    ("place" in search && search.place) || location.label || p?.location?.name || "Kathmandu";

  const civilDate = adDateStr ? parseCivilIsoToDate(adDateStr) : new Date();
  const bs = adToBS(civilDate);
  const bsLine = `${bilingualText(lang, BS_MONTHS_NE[bs.month - 1], BS_MONTH_NAMES[bs.month - 1])} ${digits(bs.day)}, ${digits(bs.year)}`;
  const adLine = `${digits(civilDate.getDate())} ${AD_MONTHS_NE[civilDate.getMonth()]} ${digits(civilDate.getFullYear())}`;
  const weekday = p
    ? bilingualText(lang, getVaaraNe(p, p.weekday) ?? "", getVaaraEn(p, p.weekday) ?? "")
    : "";

  const timeline = (
    <DayTimeline
      p={p}
      dateAd={adDateStr}
      isToday={false}
      timezone={tz}
      mode="Day-Night"
      showToggle={false}
      chartOnly
      showNeedle={Boolean("time" in search && search.time)}
      needleClock={"time" in search ? search.time : undefined}
    />
  );

  const header = (
    <div className="flex items-end justify-between" style={{ height: 46, flex: "0 0 auto" }}>
      <div className="flex items-baseline gap-3">
        <span className="text-[28px] font-extrabold tracking-tight text-[#0b565a]">
          वैदिक पात्रो
        </span>
        <span className="text-[18px] font-bold text-[#d97706]">{placeLabel}</span>
      </div>
      <div className="text-right leading-tight">
        <div className="text-[20px] font-bold text-[#202a2c]">
          {[weekday, bsLine].filter(Boolean).join(" · ")}
        </div>
        <div className="text-[15px] text-[#6e7878]">{adLine} · vedicpatro.com</div>
      </div>
    </div>
  );

  if (full) {
    return (
      <div style={{ width: OG_W + 32, padding: 16, background: "#F7F3EA" }}>
        <div
          id="og-capture"
          style={{ width: OG_W, background: "#F7F3EA", borderRadius: 16, padding: "18px 20px 20px" }}
        >
          <div className="mb-3">{header}</div>
          {timeline}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: OG_W + 32, padding: 16, background: "#F7F3EA" }}>
      <div
        id="og-capture"
        style={{
          width: OG_W,
          height: OG_H,
          background: "#F7F3EA",
          borderRadius: 16,
          padding: "18px 0 20px",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {header}
        <div
          ref={bodyRef}
          style={{ flex: "1 1 auto", minHeight: 0, display: "flex", gap: COL_GAP, paddingTop: 6 }}
        >
          <div
            style={{
              position: "relative",
              width: CHART_NATURAL_W * (scale ?? 1),
              height: "100%",
              overflow: "hidden",
              flex: "0 0 auto",
            }}
          >
            <div
              ref={chartRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: CHART_NATURAL_W,
                transform: `scale(${scale ?? 1})`,
                transformOrigin: "top left",
              }}
            >
              {timeline}
            </div>
          </div>
          <SummaryPanel p={p} />
        </div>
      </div>
    </div>
  );
}

function SummaryPanel({ p }: { p: PanchangaDay | undefined }) {
  const { lang } = useLocale();

  const angaRow = (key: "tithi" | "nakshatra" | "yoga" | "karana") => {
    const a = anga(p, key);
    if (!a) return { value: "—", upto: "" };
    const name = bilingualText(lang, a.name_ne ?? a.name ?? "—", a.name ?? a.name_ne ?? "—");
    const end = formatTimeShort(a.end_local_time);
    return { value: name, upto: end ? `${toNepaliDigits(end)} ${bilingualText(lang, "सम्म", "until")}` : "" };
  };

  const rows: { label: string; value: string; upto?: string }[] = [
    { label: bilingualText(lang, "तिथि", "Tithi"), ...angaRow("tithi") },
    { label: bilingualText(lang, "नक्षत्र", "Nakshatra"), ...angaRow("nakshatra") },
    { label: bilingualText(lang, "योग", "Yoga"), ...angaRow("yoga") },
    { label: bilingualText(lang, "करण", "Karana"), ...angaRow("karana") },
    {
      label: bilingualText(lang, "सूर्योदय", "Sunrise"),
      value: (p && getSunriseDisplay(p)) || "—",
    },
    {
      label: bilingualText(lang, "सूर्यास्त", "Sunset"),
      value: (p && getSunsetDisplay(p)) || "—",
    },
  ];

  return (
    <div
      style={{
        flex: "1 1 auto",
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 2,
        borderRadius: 14,
        border: "1px solid #e2dccb",
        background: "#FFFDF7",
        padding: "10px 16px",
      }}
    >
      {rows.map((row, i) => (
        <div
          key={row.label}
          className="flex items-baseline justify-between gap-3"
          style={{
            padding: "9px 0",
            borderTop: i === 0 ? "none" : "1px solid #ece6d8",
          }}
        >
          <span className="text-[17px] font-semibold text-[#6e7878]">{row.label}</span>
          <span className="text-right leading-tight">
            <span className="text-[21px] font-bold text-[#202a2c]">{row.value}</span>
            {row.upto ? (
              <span className="block text-[14px] font-medium text-[#8a9494]">{row.upto}</span>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  );
}
