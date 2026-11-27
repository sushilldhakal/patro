import { test } from "node:test";
import assert from "node:assert/strict";
import type { NepseLive, NepseQuote } from "@vedic-patro/api-client";
import { nepseLiveTrusted } from "../src/home/nepse";

const quote = { symbol: "NABIL", name: null, ltp: 510, change: 5, percent: 1, open: 505, high: 512, low: 500, prev_close: 505, volume: 20, turnover: 1000 } as NepseQuote;
const read = 1_800_000_000;
const live = (partial: Partial<NepseLive>): NepseLive => ({
  as_of: null, date: null, fetched_at: read, market_open: true, turnover: 0, volume: 0, transactions: 0, scrips: 1, stocks: [quote], ...partial,
});
const at = (secondsAfterRead: number) => (read + secondsAfterRead) * 1000;

test("fresh prices are shown", () => {
  assert.equal(nepseLiveTrusted(live({}), at(60)), true);
});

test("the server's stale flag hides every price", () => {
  assert.equal(nepseLiveTrusted(live({ stale: true }), at(10)), false);
});

test("no scrips means nothing to show", () => {
  assert.equal(nepseLiveTrusted(live({ stocks: [] }), at(10)), false);
});

test("a read four minutes old is hidden while trading", () => {
  assert.equal(nepseLiveTrusted(live({}), at(240)), false);
});

test("outside trading half an hour is fine, an hour is not", () => {
  assert.equal(nepseLiveTrusted(live({ market_open: false }), at(30 * 60)), true);
  assert.equal(nepseLiveTrusted(live({ market_open: false }), at(60 * 60)), false);
});
