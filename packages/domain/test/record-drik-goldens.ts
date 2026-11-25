// Records the Rust server's Drik answers (`siddhanta=drik`) for engine-drik.test.ts. Needs a local Rust server
// with the Drik kernel: PATRO_RS__PORT=8199 PATRO_RS_EPHDATA=<dir with kernel.veph> ./target/debug/vedic-patro
// Run: DRIK_SERVER=http://127.0.0.1:8199 npx tsx test/record-drik-goldens.ts
import { writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const server = process.env.DRIK_SERVER ?? "http://127.0.0.1:8199";
const cities = [1283240, 1282898, 5128581];
const paths: string[] = [];
for (const c of cities) {
  for (const d of ["2026-01-14", "2026-03-20", "2026-06-21", "2026-12-16", "2027-04-14", "2030-09-02"]) {
    paths.push(`/v1/panchanga/${d}?era=ad&language=en&city_id=${c}&detail=true`, `/v1/panchanga/${d}?era=ad&language=en&city_id=${c}&detail=false`);
  }
  paths.push(`/v1/panchanga/2083-09-01?era=bs&language=ne&city_id=${c}&detail=true&slim=true&festivals=true`);
  paths.push(`/v1/panchanga/2026-12-16?era=ad&language=en&city_id=${c}&reference=midnight&detail=true&slim=true&festivals=true`);
  paths.push(`/v1/panchanga/2026-12-16?era=ad&language=en&city_id=${c}&civil=true&detail=false`);
  for (const [jd, clock] of [[2461365.5, "10:30"], [2461400.5, "18:45"], [2461290.5, "05:10"]] as const) paths.push(`/v1/panchanga/at-time?jd=${jd}&clock=${clock}&era=ad&language=en&city_id=${c}`);
  for (const [y, m] of [[2083, 1], [2083, 9], [2082, 12]]) {
    paths.push(`/v1/panchanga/${y}/${m}?full=false&era=bs&language=ne&city_id=${c}`);
    paths.push(`/v1/panchanga/${y}/${m}?full=true&slim=true&era=bs&language=ne&city_id=${c}`);
    paths.push(`/v1/panchanga/${y}/${m}?full=true&era=bs&language=en&city_id=${c}`);
  }
  paths.push(`/v1/panchanga/year/2083/sun?era=bs&language=ne&city_id=${c}`, `/v1/panchanga/year/2083?wheel=true&era=bs&city_id=${c}`);
  for (const name of ["tithi", "nakshatra", "yoga", "karana"]) {
    paths.push(`/v1/panchanga/element/${name}/day/2026-12-16?era=ad&language=en&city_id=${c}`, `/v1/panchanga/element/${name}/month/2083/9?city_id=${c}`);
  }
  paths.push(`/v1/nepal/panchak/year/2083?era=bs&language=ne&city_id=${c}`, `/v1/nepal/patro/2083/9?city_id=${c}`);
}
const out: { path: string; status: number; body: string }[] = [];
for (const p of paths) {
  const res = await fetch(`${server}${p}${p.includes("?") ? "&" : "?"}siddhanta=drik`);
  const body = await res.text();
  if (res.status !== 200) console.log(res.status, p, body.slice(0, 100));
  out.push({ path: p, status: res.status, body });
}
writeFileSync(new URL("./fixtures/drik-golden.json.gz", import.meta.url), gzipSync(JSON.stringify(out), { level: 9 }));
console.log("recorded", out.length, "of", paths.length, "ok:", out.filter((o) => o.status === 200).length);
