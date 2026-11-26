// NRB rates: asks the last week up to today in Kathmandu and keeps the latest published day.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchForexRates } from "../src/index.ts";

test("fetchForexRates takes the latest day in Kathmandu's week", async () => {
  let asked = "";
  const day = (date: string, buy: string) => ({ date, rates: [{ currency: { iso3: "USD", name: "U.S. Dollar", unit: 1 }, buy, sell: "147.88" }] });
  globalThis.fetch = (async (url: string) => {
    asked = url;
    return new Response(JSON.stringify({ data: { payload: [day("2026-11-26", "147.28"), day("2026-11-25", "146.00")] } }));
  }) as typeof fetch;
  // 2026-11-25 20:00 UTC is already 26 Nov in Kathmandu.
  const got = await fetchForexRates(Date.UTC(2026, 10, 25, 20, 0));
  assert.match(asked, /from=2026-11-19&to=2026-11-26$/);
  assert.deepEqual(got, { date: "2026-11-26", rates: [{ iso3: "USD", name: "U.S. Dollar", unit: 1, buy: 147.28, sell: 147.88 }] });
});
