// URL golden calls for apps/web/src/lib/api.ts.
import * as api from "@/lib/api";
const L = [undefined, { city_id: 1283240, timezone: "Asia/Kathmandu" }, { lat: 27.7, lon: 85.3, timezone: "Asia/Kathmandu" }, { city: "Pokhara", lat: 28.2, lon: 83.98 }, { city: "पोखरा", lat: 28.2, lon: 83.98 }] as any[];
const moment = { inputEra: "bs", year: 2050, month: 5, day: 12, clock: "06:30" } as any;
const display = { era: "bs", language: "ne" } as any;
const states: any[] = [
  { kind: "today", display },
  { kind: "jd", jd: 2461324.5, display: { era: "ad", language: "en" } },
  { kind: "input", inputEra: "bs", year: 2083, month: 6, day: 24, display },
];
const a: any = api;
export const calls: [string, () => unknown][] = [];
const add = (n: string, f: () => unknown) => calls.push([n, f]);
L.forEach((loc, i) => {
  const s = `#${i}`;
  add("fetchNearestCity" + s, () => a.fetchNearestCity(27.7, 85.3, "NP"));
  add("searchCities" + s, () => a.searchCities("kath", 15, "NP"));
  add("fetchTodayPanchanga" + s, () => a.fetchTodayPanchanga(loc, "bs"));
  states.forEach((st, j) => {
    add(`fetchPanchangaDay${j}` + s, () => a.fetchPanchangaDay(st, loc, { clock: "06:00" }));
    add(`fetchRashifal${j}` + s, () => a.fetchRashifal(st, "monthly", loc));
    add(`fetchPersonalRashifal${j}` + s, () => a.fetchPersonalRashifal(st, "daily", { moment, birthLat: 27.7, birthLon: 85.3, birthTz: "Asia/Kathmandu" }, loc));
    add(`fetchPanchangaAtTimeForDay${j}` + s, () => a.fetchPanchangaAtTimeForDay(st, "06:30", loc, { ayanamsha: "lahiri" }));
  });
  add("fetchPanchangaCivilDay" + s, () => a.fetchPanchangaCivilDay("2026-10-10", display, loc));
  add("fetchNepalPanchanga" + s, () => a.fetchNepalPanchanga("2026-10-10", loc));
  add("fetchCivilTimeline" + s, () => a.fetchCivilTimeline("2026-10-10", "ad", loc));
  add("fetchPanchangaAtTime" + s, () => a.fetchPanchangaAtTime("2026-10-10T06:30", loc, { ayanamsha: "lahiri" }));
  add("fetchPanchangaAtTimeJd" + s, () => a.fetchPanchangaAtTimeJd(2461324.5, "06:30", loc));
  add("fetchTropicalSeasons" + s, () => a.fetchTropicalSeasons(loc));
  add("fetchVimshottari" + s, () => a.fetchVimshottari(moment, loc, { ayanamsha: "lahiri", cycles: 2 }));
  add("fetchGochar" + s, () => a.fetchGochar("2026-10-10", "ad", loc));
  add("fetchGocharJd" + s, () => a.fetchGocharJd(2461324.5, loc));
  add("fetchGocharIngress" + s, () => a.fetchGocharIngress("2026-04-14", "2027-04-13", loc, { level: "rashi", era: "bs" }));
  add("fetchGrahaSthiti" + s, () => a.fetchGrahaSthiti("2026-10-10", loc, "ad"));
  add("fetchGrahaAstaYear" + s, () => a.fetchGrahaAstaYear(2083, loc, "bs"));
  add("fetchGrahaVakriYear" + s, () => a.fetchGrahaVakriYear(2083, loc, "bs"));
  add("fetchEclipseYear" + s, () => a.fetchEclipseYear("solar", 2083, loc, "bs"));
  add("fetchPanchakYear" + s, () => a.fetchPanchakYear(2083, loc, "bs"));
  add("fetchMonthCalendar" + s, () => a.fetchMonthCalendar(2083, 6, loc));
  add("fetchMonthCalendar-opts" + s, () => a.fetchMonthCalendar(2026, 10, loc, { era: "ad", clock: "06:00", full: false, excludeInternational: true }));
  add("fetchYearCalendar" + s, () => a.fetchYearCalendar(2083, loc, { full: true }));
  add("fetchYearWheelCalendar" + s, () => a.fetchYearWheelCalendar(2083, loc, "bs"));
  add("fetchYearSunTimes" + s, () => a.fetchYearSunTimes(2083, "bs", loc));
  add("fetchSait" + s, () => a.fetchSait(2083, "vivah", loc));
  add("fetchSaitDetail" + s, () => a.fetchSaitDetail(2083, "vivah", loc, ["b", "a"], "janma"));
  add("fetchSaitPersonalize" + s, () => a.fetchSaitPersonalize(2083, "vivah", loc, moment, "Asia/Kathmandu", "male"));
  add("fetchSaitMonthAll" + s, () => a.fetchSaitMonthAll(2083, 6, loc));
  add("fetchElementSpans" + s, () => a.fetchElementSpans("tithi", { era: "bs", year: 2083, month: 6 }, loc));
  add("fetchElementMonth" + s, () => a.fetchElementMonth("tithi", 2083, 6, loc));
  add("fetchElementDay" + s, () => a.fetchElementDay("tithi", "2026-10-10", loc));
  add("fetchKundali" + s, () => a.fetchKundali("2026-10-10", "ad", loc));
  add("fetchShadbala" + s, () => a.fetchShadbala(moment, loc));
  add("fetchKundaliDetail" + s, () => a.fetchKundaliDetail(moment, loc, { ayanamsha: "raman" }));
  add("streamKundaliReport" + s, () => a.streamKundaliReport(moment, loc, { lang: "ne" }, () => {}));
});
add("fetchPopularCities", () => a.fetchPopularCities());
add("fetchJanmaRashi", () => a.fetchJanmaRashi(moment, "Asia/Kathmandu"));
add("fetchCalendarHeader", () => a.fetchCalendarHeader(2083, 6));
add("fetchPatroMonth", () => a.fetchPatroMonth(2083, 6));
add("fetchHolidays", () => a.fetchHolidays(2083, "bs"));
add("fetchHolidays-ad", () => a.fetchHolidays(2026, "ad"));
add("fetchFestivals", () => a.fetchFestivals(2083));
add("fetchFestivals-month", () => a.fetchFestivals(2083, 6, "bs"));
add("fetchUpcomingFestivals", () => a.fetchUpcomingFestivals(30, 10, true));
add("fetchSaitYears", () => a.fetchSaitYears());
add("fetchSaitAbout", () => a.fetchSaitAbout());
add("fetchSaitAboutCategory", () => a.fetchSaitAboutCategory("vivah"));
add("fetchElements", () => a.fetchElements());
add("fetchAdToBs", () => a.fetchAdToBs("2026-10-10"));
add("fetchBsToAd", () => a.fetchBsToAd("2083-06-24"));
add("fetchSpecialMonths", () => a.fetchSpecialMonths(2083));
add("fetchYogaReference", () => a.fetchYogaReference());
add("fetchBhavaReference", () => a.fetchBhavaReference());
add("fetchDashaChildren", () => a.fetchDashaChildren("Sun", "2020-01-01", "2026-01-01", "vimshottari"));
add("fetchKundaliMilan", () => a.fetchKundaliMilan({ moment, location: { city_id: 1 } }, { moment, location: { lat: 1, lon: 2 } }, { lang: "ne" }));
add("fetchVastuSketch", () => a.fetchVastuSketch({ plot: { width: 10, depth: 12 } }));
add("fetchPatroCapabilities", () => a.fetchPatroCapabilities());
