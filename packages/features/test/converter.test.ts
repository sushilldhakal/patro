import { test } from "node:test";
import assert from "node:assert/strict";

import { resultCards, todayInputs, weekdayLabel } from "../src/converter/model";

const r = {
  ad_date: "2026-04-14",
  bs_date: "2083-01-01",
  bs_year: 2083,
  bs_month: 1,
  bs_day: 1,
  bs_month_name: "Baisakh",
  bs_month_name_ne: "वैशाख",
  weekday: "Tuesday",
};

test("weekday names come from the shared list", () => {
  assert.equal(weekdayLabel("Tuesday", "ne"), "मंगलवार");
  assert.equal(weekdayLabel("Tuesday", "en"), "Tuesday");
  assert.equal(weekdayLabel("Someday", "ne"), "Someday");
});

test("the converted-to date leads, highlighted, with localized numbers", () => {
  const ad = resultCards("ad-to-bs", r as never, "ne");
  assert.equal(ad[0]!.labelKey, "converter.bs_date");
  assert.equal(ad[0]!.highlight, true);
  assert.equal(ad.find((c) => c.labelKey === "converter.bs_year")!.value, "२०८३");
  assert.equal(ad.find((c) => c.labelKey === "converter.bs_month")!.value, "वैशाख");
  const bs = resultCards("bs-to-ad", r as never, "en");
  assert.equal(bs[0]!.labelKey, "converter.ad_date");
  assert.equal(bs.find((c) => c.labelKey === "converter.bs_month")!.value, "Baisakh");
  assert.equal(bs.length, 6);
});

test("inputs start at today in both calendars", () => {
  const { ad, bs } = todayInputs(new Date());
  assert.match(ad, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(bs, /^20\d{2}-\d{2}-\d{2}$/);
});
