import { test } from "node:test";
import assert from "node:assert/strict";

import { ASTA_ORDER, astaPeriodView, eraDayLabel, groupByGraha, vakriEventView } from "../src/graha/model";

const t = (key: string, v?: Record<string, unknown>) => (v?.count !== undefined ? `${key}:${v.count}` : key);

test("every graha gets a column, in order, unknown grahas after", () => {
  const groups = groupByGraha(ASTA_ORDER, [
    { graha: "venus", n: 1 },
    { graha: "pluto", n: 2 },
    { graha: "venus", n: 3 },
  ]);
  assert.deepEqual([...groups.keys()], [...ASTA_ORDER, "pluto"]);
  assert.equal(groups.get("venus")!.length, 2);
  assert.equal(groups.get("moon")!.length, 0);
});

test("era day keys read as month and day", () => {
  assert.equal(eraDayLabel("2083-04-12", "ne"), "साउन १२");
  assert.equal(eraDayLabel("2083-04-12", "en"), "Shrawan 12");
});

test("an asta period shows both stamps, or says the stamp is outside the year", () => {
  const view = astaPeriodView(
    { graha: "venus", hemisphere: "west", duration_days: 12, start: { date: "2083-01-05", time_short: "05:10" }, end: null } as never,
    "ne",
    t,
  );
  assert.equal(view.stamps[0]!.date, "वैशाख ५");
  assert.equal(view.stamps[0]!.time, "०५:१०");
  assert.equal(view.stamps[1]!.outside, "graha_pages.asta.outside_year");
  assert.equal(view.hemisphere, "graha_pages.asta.west_evening");
  assert.equal(view.duration, "graha_pages.asta.duration_days:१२");
});

test("a vakri station is retrograde or direct", () => {
  const v = vakriEventView({ graha: "mars", motion: "Vakri", entry_jd_date: "साउन ३", entry_time_local_short: "10:00" } as never, "en", t);
  assert.equal(v.retrograde, true);
  assert.equal(v.label, "graha_pages.vakri.retrograde");
  assert.equal(v.time, "10:00");
});
