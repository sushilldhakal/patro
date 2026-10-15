import { test } from "node:test";
import assert from "node:assert/strict";

import {
  filterHolidayRows,
  HOLIDAY_COLUMNS,
  nextHolidaySort,
  sortHolidayRows,
  toHolidayRow,
} from "../src/holidays/model";

const dashain = {
  id: "dashain",
  name_ne: "दशैं",
  name_en: "Dashain",
  start_date: "2025-10-02",
  end_date: "2025-10-06",
  bs_start_date: "2082-06-16",
  duration_days: 5,
  type: "national",
  is_public_holiday: true,
};
const tihar = { id: "tihar", name_en: "Tihar", start_date: "2025-10-20", end_date: "2025-10-23", duration_days: 4 };

test("rows carry localized text and raw sort values", () => {
  const ne = toHolidayRow(dashain, "ne", 0);
  assert.equal(ne.name, "दशैं");
  assert.equal(ne.days, "५");
  assert.equal(ne.adDate, "2025-10-02");
  assert.equal(ne.isPublic, true);
  assert.equal(ne.sortValues.days, 5);
  const en = toHolidayRow(dashain, "en", 0);
  assert.equal(en.name, "Dashain");
  assert.equal(en.days, "5");
  // A record with only an English name still shows it in Nepali, and a missing type is a dash.
  const t = toHolidayRow(tihar, "ne", 1);
  assert.equal(t.name, "Tihar");
  assert.equal(t.type, "—");
});

test("search matches any visible column, case-insensitively", () => {
  const rows = [toHolidayRow(dashain, "en", 0), toHolidayRow(tihar, "en", 1)];
  assert.deepEqual(filterHolidayRows(rows, "  tih ").map((r) => r.name), ["Tihar"]);
  assert.deepEqual(filterHolidayRows(rows, "national").map((r) => r.name), ["Dashain"]);
  assert.equal(filterHolidayRows(rows, "").length, 2);
});

test("API order until a column is chosen; asc → desc → off", () => {
  const rows = [toHolidayRow(tihar, "en", 0), toHolidayRow(dashain, "en", 1)];
  assert.deepEqual(sortHolidayRows(rows, null).map((r) => r.name), ["Tihar", "Dashain"]);
  let sort = nextHolidaySort(null, "days");
  assert.deepEqual(sort, { key: "days", dir: "asc" });
  assert.deepEqual(sortHolidayRows(rows, sort).map((r) => r.name), ["Tihar", "Dashain"]);
  sort = nextHolidaySort(sort, "days");
  assert.deepEqual(sortHolidayRows(rows, sort).map((r) => r.name), ["Dashain", "Tihar"]);
  assert.equal(nextHolidaySort(sort, "days"), null);
  assert.deepEqual(nextHolidaySort(sort, "name"), { key: "name", dir: "asc" });
});

test("each tab has its own columns, all with catalogue labels", () => {
  assert.deepEqual(HOLIDAY_COLUMNS.holidays.map((c) => c.key), ["name", "bsDate", "adDate", "days", "type"]);
  assert.deepEqual(HOLIDAY_COLUMNS.festivals.map((c) => c.key), ["name", "bsDate", "adDate", "type", "isPublic"]);
  for (const c of [...HOLIDAY_COLUMNS.holidays, ...HOLIDAY_COLUMNS.festivals]) assert.match(c.labelKey, /^holidays\.col_/);
});
