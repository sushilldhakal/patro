// k6 load test for the Vedic Patro API.
//
//   k6 run apps/api/scripts/loadtest/load.js                       # smoke (safe)
//   PROFILE=baseline k6 run apps/api/scripts/loadtest/load.js
//   PROFILE=stress BASE=https://staging.example/api/v1 k6 run ...
//
// Two scenarios run side by side:
//   hot  — what every phone asks for on launch (today's patro month, header,
//          panchanga, upcoming festivals, rashifal). Cloudflare and Redis answer
//          most of these, so this measures the cached path.
//   cold — a random date and a random point in Nepal on every request, so
//          neither Cloudflare nor Redis has it and uvicorn must compute it.
//          This is the CPU-bound path and the real ceiling of one server.
//
// Production is one VM shared with real users. Run anything above "baseline"
// at night Nepal time, watch htop on the server, and Ctrl-C when errors climb.
// From a laptop your own connection runs out first; use a cloud VM for stress.

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE = __ENV.BASE || 'https://www.vedicpatro.com/api/v1';
const PROFILE = __ENV.PROFILE || 'smoke';

// [hot VUs ramp stages, cold arrival rates]. A VU is one user with think time
// between screens; cold load is set as requests/sec so it never piles up.
const PROFILES = {
  smoke: {
    hot: [{ duration: '30s', target: 20 }, { duration: '30s', target: 20 }],
    coldRate: 1, coldDuration: '1m',
  },
  baseline: {
    hot: [{ duration: '1m', target: 200 }, { duration: '3m', target: 200 }, { duration: '30s', target: 0 }],
    coldRate: 2, coldDuration: '4m',
  },
  stress: {
    hot: [
      { duration: '2m', target: 500 },
      { duration: '3m', target: 2000 },
      { duration: '3m', target: 5000 },
      { duration: '1m', target: 0 },
    ],
    coldRate: 5, coldDuration: '8m',
  },
};
const P = PROFILES[PROFILE];
if (!P) throw new Error(`PROFILE must be one of ${Object.keys(PROFILES).join(', ')}`);

export const options = {
  scenarios: {
    hot: { executor: 'ramping-vus', exec: 'hot', startVUs: 0, stages: P.hot },
    cold: {
      executor: 'constant-arrival-rate', exec: 'cold',
      rate: P.coldRate, timeUnit: '1s', duration: P.coldDuration,
      preAllocatedVUs: P.coldRate * 10, maxVUs: P.coldRate * 30,
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.01'],
    'http_req_duration{scenario:hot}': ['p(95)<800'],
    'http_req_duration{scenario:cold}': ['p(95)<8000'],
  },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'max'],
};

const cdnHit = new Rate('cdn_hit');
const coldTime = new Trend('cold_compute_ms', true);

// Today in Nepal (UTC+5:45), and its BS year/month for the patro screens.
// The BS month is approximate (BS ≈ AD + 56y 8.5m); close enough for load.
function nepalToday() {
  const d = new Date(Date.now() + (5 * 60 + 45) * 60000);
  return d.toISOString().slice(0, 10);
}
function bsYearMonth() {
  const d = new Date(Date.now() + (5 * 60 + 45) * 60000);
  let m = d.getUTCMonth() + 1 + 8 + (d.getUTCDate() >= 15 ? 1 : 0);
  let y = d.getUTCFullYear() + 56;
  while (m > 12) { m -= 12; y += 1; }
  return [y, m];
}

function hit(res) {
  check(res, { 'status 200': (r) => r.status === 200 });
  cdnHit.add(res.headers['Cf-Cache-Status'] === 'HIT');
}

export function hot() {
  const today = nepalToday();
  const [y, m] = bsYearMonth();
  group('launch', () => {
    http.batch([
      ['GET', `${BASE}/nepal/patro/${y}/${m}`],
      ['GET', `${BASE}/calendar/header/${y}/${m}`],
      ['GET', `${BASE}/nepal/panchanga/${today}?era=ad`],
      ['GET', `${BASE}/nepal/festivals/upcoming`],
    ]).forEach(hit);
  });
  sleep(2 + Math.random() * 4); // reads the calendar
  group('browse', () => {
    hit(http.get(`${BASE}/panchanga/rashifal?period=daily`));
    const nm = m === 12 ? 1 : m + 1;
    const ny = m === 12 ? y + 1 : y;
    hit(http.get(`${BASE}/nepal/patro/${ny}/${nm}`)); // swipes to next month
  });
  sleep(5 + Math.random() * 10);
}

function randomDate() {
  const start = Date.UTC(1950, 0, 1), end = Date.UTC(2050, 0, 1);
  return new Date(start + Math.random() * (end - start)).toISOString().slice(0, 10);
}

export function cold() {
  // Random point inside Nepal, 4 decimals: effectively never seen before.
  const lat = (26.4 + Math.random() * 3.8).toFixed(4);
  const lon = (80.1 + Math.random() * 8.0).toFixed(4);
  const res = http.get(
    `${BASE}/nepal/panchanga/${randomDate()}?era=ad&lat=${lat}&lon=${lon}&timezone=Asia/Kathmandu`,
    { timeout: '30s' },
  );
  hit(res);
  coldTime.add(res.timings.duration);
}
