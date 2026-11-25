// Records the Rust server's answers for a list of paths into a gzipped fixture (the engine tests read them).
//   DRIK_SERVER=http://127.0.0.1:8199 npx tsx test/record-extra.ts <out.json.gz> <surya|drik> <paths.json>
// A local server: PATRO_RS__PORT=8199 PATRO_RS_EPHDATA=<dir with kernel.veph> ./target/debug/vedic-patro
import { readFileSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const [out, system, list] = process.argv.slice(2);
const server = process.env.DRIK_SERVER ?? "http://127.0.0.1:8199";
const paths = JSON.parse(readFileSync(list, "utf8")) as string[];
const rows: { path: string; status: number; body: string }[] = [];
for (const p of paths) {
  const url = `${server}${p}${system === "drik" ? `${p.includes("?") ? "&" : "?"}siddhanta=drik` : ""}`;
  const res = await fetch(url);
  const body = await res.text();
  if (res.status !== 200) console.log(res.status, p, body.slice(0, 120));
  rows.push({ path: p, status: res.status, body });
}
writeFileSync(new URL(`./fixtures/${out}`, import.meta.url), gzipSync(JSON.stringify(rows), { level: 9 }));
console.log("recorded", rows.length, "ok", rows.filter((r) => r.status === 200).length);
