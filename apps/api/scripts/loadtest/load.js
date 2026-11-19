// k6 load test for the Vedic Patro API: real users moving through many screens.
//
//   k6 run apps/api/scripts/loadtest/load.js                     # smoke, 30 users
//   USERS=1000 k6 run apps/api/scripts/loadtest/load.js          # ramp to 1000 users
//   USERS=5000 HOLD=10m BASE=https://staging.example/api/v1 k6 run ...
//
// Each virtual user is one phone. It opens the app (home screen requests), then
// goes through 6–20 screens picked with the weights real traffic shows in the
// nginx logs: reading Purana/Gita chapters, calendar months, day detail,
// rashifal, sait, kundali, gochar, year pages, festivals, city search. Every
// user has its own city and language, and 40% have a birth profile, so personal
// pages (kundali, personal rashifal) are unique per user exactly as in real life.
// Between screens the user reads for 4–20 s.
//
// URL shapes and cache versions (cv, sv, v, ev) are copied from what the
// current production app sends, so Cloudflare and Redis see the same keys.
//
// Production is one 2-core VM shared with real users. Watch it while this runs:
//   ssh ubuntu@193.123.67.133 'top -d 2'
// and press Ctrl-C when errors climb. One laptop tops out around 1–3k users;
// for more, run the same script from several cloud VMs at once.

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const BASE = __ENV.BASE || 'https://www.vedicpatro.com/api/v1';
const USERS = parseInt(__ENV.USERS || '30', 10);
const RAMP = __ENV.RAMP || (USERS > 200 ? '3m' : '30s');
const HOLD = __ENV.HOLD || (USERS > 200 ? '5m' : '1m');

// Production app cache versions (packages/api-client/src/client.ts at release).
const CV = __ENV.CV || '6106';
const SV = __ENV.SV || '17';
const DV = '42';
const EV = '8';
const GV = '5';

export const options = {
  scenarios: {
    users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: RAMP, target: USERS },
        { duration: HOLD, target: USERS },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '20s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
    'http_req_duration{screen:home}': ['p(95)<1500'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  discardResponseBodies: true,
};
// Per-screen lines in the summary (always-true thresholds just make k6 print them).
for (const s of ['home', 'calendar', 'day', 'document', 'rashifal', 'sait', 'kundali',
  'gochar', 'festivals', 'year', 'cities']) {
  options.thresholds[`cdn_hit{screen:${s}}`] = ['rate>=0'];
  options.thresholds[`origin_duration{screen:${s}}`] = ['avg>=0'];
  options.thresholds[`http_req_failed{screen:${s}}`] = ['rate>=0'];
}

const cdnHit = new Rate('cdn_hit');          // answered by Cloudflare, never reached the server
const originReq = new Counter('origin_requests');
const originTime = new Trend('origin_duration', true);

// ─── Users ───────────────────────────────────────────────────────────────────

// Popular cities from /nepal/cities/popular. Weights: most users stay on the
// Kathmandu default, the rest spread over other cities.
const CITIES = [
  [1283240, 27.70169, 85.3206, 50], [1282898, 28.26689, 83.96851, 8],
  [1283613, 27.68027, 84.43647, 5], [1282931, 27.67658, 85.31417, 5],
  [1283582, 26.45505, 87.27007, 5], [1283562, 27.70055, 83.44836, 5],
  [1283460, 26.81436, 87.27972, 4], [6941099, 28.05, 81.61667, 4],
  [1283095, 28.96399, 80.17715, 3], [1273294, 28.65195, 77.23149, 3],
  [1275339, 19.07283, 72.88261, 3], [5128581, 40.71427, -74.00597, 3],
  [2147714, -33.86785, 151.20732, 2],
];

// Documents with chapters, weighted by what people read in the logs.
const DOCS = [
  ['bhagavata-purana', 335, 12], ['brahma-purana', 246, 11], ['agni-purana', 343, 9],
  ['garuda-purana', 120, 6], ['vishnu-purana', 127, 5], ['narada-purana', 168, 4],
  ['vayu-purana', 112, 4], ['shiva-purana', 103, 4], ['matsya-purana', 100, 3],
  ['brahmanda-purana', 100, 3], ['skanda-purana', 116, 3], ['kurma-purana', 90, 3],
  ['markandeya-purana', 91, 2], ['graha-shanti-paddhati', 38, 2], ['bhagavad-gita', 18, 2],
  ['ashtavakra-gita', 20, 2], ['mahabharata', 18, 1], ['durga-pujan-vidhi', 26, 1],
  ['parvana-shraddha', 49, 1], ['sri-rudram', 11, 1], ['samaveda', 6, 1],
];

const SAIT = ['vivah', 'bratabandha', 'griha-aarambha', 'griha-pravesh', 'annaprasan',
  'byaparik-pratisthan', 'agni-jurne', 'rudri-jurne'];

function pick(list, wIdx) {
  const total = list.reduce((s, x) => s + x[wIdx], 0);
  let r = Math.random() * total;
  for (const x of list) { r -= x[wIdx]; if (r <= 0) return x; }
  return list[list.length - 1];
}
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pad = (n) => String(n).padStart(2, '0');

function newUser() {
  const [cityId, lat, lon] = pick(CITIES, 3);
  const u = { cityId, lat, lon, lang: Math.random() < 0.8 ? 'ne' : 'en', birth: null };
  if (Math.random() < 0.4) {
    u.birth = {
      year: rnd(2005, 2068), month: rnd(1, 12), day: rnd(1, 29),
      clock: `${pad(rnd(0, 23))}%3A${pad(rnd(0, 59))}`,
      lat: (lat + (Math.random() - 0.5)).toFixed(4),
      lon: (lon + (Math.random() - 0.5)).toFixed(4),
    };
  }
  return u;
}

// ─── Dates ───────────────────────────────────────────────────────────────────

function nepalNow() { return new Date(Date.now() + (5 * 60 + 45) * 60000); }
function adDate(offsetDays = 0) {
  const d = new Date(nepalNow().getTime() + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}
// Approximate BS year/month for "now" (BS ≈ AD + 56y 8.5m): good enough for keys.
function bsNow() {
  const d = nepalNow();
  let m = d.getUTCMonth() + 1 + 8 + (d.getUTCDate() >= 15 ? 1 : 0);
  let y = d.getUTCFullYear() + 56;
  while (m > 12) { m -= 12; y += 1; }
  return [y, m];
}
function bsShift(y, m, k) {
  let t = y * 12 + (m - 1) + k;
  return [Math.floor(t / 12), (t % 12) + 1];
}

// ─── Requests ────────────────────────────────────────────────────────────────

function record(res, screen) {
  const ok = check(res, { 'status 2xx': (r) => r.status >= 200 && r.status < 300 });
  if (!ok && __ENV.SHOW_FAILS) console.warn(`${res.status} ${res.request.url}`);
  const tags = { screen };
  const hit = res.headers['Cf-Cache-Status'] === 'HIT';
  cdnHit.add(hit, tags);
  if (!hit) { originReq.add(1, tags); originTime.add(res.timings.duration, tags); }
}
function get(path, screen) {
  record(http.get(BASE + path, { tags: { screen, name: screen } }), screen);
}
function batch(paths, screen) {
  http.batch(paths.map((p) => ['GET', BASE + p, null, { tags: { screen, name: screen } }])).forEach((r) => record(r, screen));
}
const loc = (u) => `city_id=${u.cityId}`;

// ─── Screens ─────────────────────────────────────────────────────────────────

function home(u) {
  const [y, m] = bsNow();
  const now = nepalNow();
  const at = `${adDate()}T${pad(now.getUTCHours())}%3A${pad(now.getUTCMinutes())}%3A00`;
  batch([
    `/panchanga/${adDate()}?era=ad&festivals=true&detail=true&slim=true&cv=${CV}&${loc(u)}&language=${u.lang}`,
    `/panchanga/rashifal?date=${adDate()}&era=ad&period=daily&cv=${CV}&${loc(u)}`,
    `/panchanga/${y}/${m}?era=bs&language=${u.lang}&cv=${CV}&${loc(u)}`,
    `/panchanga/at-time?datetime=${at}&cv=${CV}&${loc(u)}`,
    `/veda/daily?date=${adDate()}&v=${DV}`,
    `/nepal/patro/${y}/${m}?cv=${CV}`,
  ], 'home');
}

function calendarMonth(u) {
  const [y0, m0] = bsNow();
  const [y, m] = bsShift(y0, m0, rnd(-3, 3));
  const els = ['tithi', 'nakshatra', 'yoga', 'karana', 'chandra-rashi'].map((e) =>
    `/panchanga/element/${e}/spans?era=bs&language=${u.lang}&year=${y}&month=${m}&cv=${CV}&${loc(u)}`);
  batch([
    `/panchanga/${y}/${m}?era=bs&language=${u.lang}&cv=${CV}&${loc(u)}`,
    `/nepal/gochar/ingress?from=${y}-${pad(m)}-01&to=${y}-${pad(m)}-29&era=bs&level=patro&${loc(u)}`,
    ...els,
  ], 'calendar');
}

function dayDetail(u) {
  get(`/panchanga/${adDate(rnd(-20, 40))}?era=ad&festivals=true&detail=true&slim=true&cv=${CV}&${loc(u)}&language=${u.lang}`, 'day');
}

function readDocument(u) {
  const [slug, chapters] = pick(DOCS, 2);
  let ch = rnd(1, chapters);
  const n = rnd(1, 4); // reads a few chapters in a row
  for (let i = 0; i < n && ch <= chapters; i++, ch++) {
    get(`/documents/${slug}/chapters/${ch}?limit=25&v=${DV}`, 'document');
    sleep(rnd(8, 30));
  }
}

function rashifal(u) {
  const periods = ['daily', 'weekly', 'monthly'];
  if (u.birth) {
    const b = u.birth;
    get(`/panchanga/rashifal/personal?date=${adDate()}&era=ad&period=${periods[rnd(0, 2)]}` +
      `&birth_lat=${b.lat}&birth_lon=${b.lon}&birth_tz=Asia%2FKathmandu&birth_era=bs` +
      `&birth_year=${b.year}&birth_month=${b.month}&birth_day=${b.day}&birth_clock=${b.clock}&cv=${CV}&${loc(u)}`, 'rashifal');
  } else {
    get(`/panchanga/rashifal?date=${adDate(rnd(0, 6))}&era=ad&period=daily&cv=${CV}&${loc(u)}`, 'rashifal');
  }
}

function sait(u) {
  const [y0, m0] = bsNow();
  const [y, m] = bsShift(y0, m0, rnd(0, 3));
  const cat = SAIT[rnd(0, SAIT.length - 1)];
  batch([
    `/nepal/sait/${y}/month/${m}?${loc(u)}&sv=${SV}`,
    `/nepal/sait/${y}/${cat}?${loc(u)}&sv=${SV}`,
  ], 'sait');
  sleep(rnd(3, 8));
  // agni-jurne and rudri-jurne have no detail page in the app.
  if (!cat.endsWith('-jurne')) get(`/nepal/sait/${y}/${cat}/detail?${loc(u)}&sv=${SV}`, 'sait');
}

function kundali(u) {
  if (!u.birth) return rashifal(u);
  const b = u.birth;
  const q = `inputEra=bs&era=bs&year=${b.year}&month=${b.month}&day=${b.day}&clock=${b.clock}` +
    `&ayanamsha=nepal&lat=${b.lat}&lon=${b.lon}&timezone=Asia%2FKathmandu`;
  batch([`/kundali/detail?${q}&ev=${EV}`, `/kundali/reference/bhava?v=26`], 'kundali');
  sleep(rnd(5, 15));
  get(`/kundali/report?${q}&lang=${u.lang}`, 'kundali');
}

function gochar(u) {
  get(`/nepal/gochar/${adDate(rnd(-10, 30))}?era=ad&${loc(u)}`, 'gochar');
}

function festivals(u) {
  const [y] = bsNow();
  batch([
    `/nepal/festivals?year=${y}&era=bs&language=${u.lang}&${loc(u)}&cv=${CV}`,
    `/nepal/holidays?year=${y}&era=bs&language=${u.lang}&${loc(u)}&cv=${CV}`,
    `/nepal/special-months/${y}?cv=${CV}`,
  ], 'festivals');
}

function yearPages(u) {
  const [y] = bsNow();
  const q = `era=bs&language=${u.lang}&year=${y}&${loc(u)}`;
  const pages = [
    `/panchanga/year/${y}?wheel=true&era=bs&cv=${CV}&${loc(u)}`,
    `/nepal/panchak/year/${y}?${q}`,
    `/nepal/eclipse/lunar/year/${y}?${q}&gv=${GV}`,
    `/nepal/graha-asta/year/${y}?${q}&gv=${GV}`,
    `/panchanga/year/${y}/sun?${q}`,
    `/seasons/tropical?${loc(u)}`,
  ];
  get(pages[rnd(0, pages.length - 1)], 'year');
}

function citySearch(u) {
  const qs = ['Ka', 'Po', 'Bh', 'Dh', 'Bi', 'Ja', 'Bu', 'Ne', 'La', 'Hetauda'];
  get(`/nepal/cities/search?q=${qs[rnd(0, qs.length - 1)]}&limit=15`, 'cities');
}

// Weights follow request counts per screen in three days of nginx logs.
const SCREENS = [
  [readDocument, 30], [calendarMonth, 14], [dayDetail, 12], [rashifal, 10],
  [sait, 8], [festivals, 6], [gochar, 5], [kundali, 5], [yearPages, 5], [citySearch, 2],
];

// ─── One phone ───────────────────────────────────────────────────────────────

export default function () {
  const u = newUser();
  group('open app', () => home(u));
  sleep(rnd(3, 10));
  const screens = rnd(6, 20);
  for (let i = 0; i < screens; i++) {
    const [fn] = pick(SCREENS, 1);
    group(fn.name, () => fn(u));
    sleep(rnd(4, 20));
  }
}
