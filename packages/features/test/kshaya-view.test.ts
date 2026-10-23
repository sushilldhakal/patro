import assert from "node:assert/strict";
import { test } from "node:test";
import { kshayaViewOf } from "../src/adhik-maas/kshaya-view.ts";

const digits = (v: string | number) => String(v);
const strings: Record<string, string> = {
  "adhik_page.kshaya_name": "{{months}} Kshaya",
  "adhik_page.adhik_name": "Adhik {{month}}",
};
const t = (key: string, values: Record<string, unknown> = {}) =>
  (strings[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, k) => String(values[k]));
const ctx = { lang: "en", digits, t };

test("no kshaya", () => {
  assert.equal(kshayaViewOf({ is_kshaya: false }, ctx), null);
  assert.equal(kshayaViewOf(undefined, ctx), null);
});

test("poush–magha kshaya with its flanking adhik months", () => {
  const v = kshayaViewOf(
    {
      is_kshaya: true,
      month_name: "Poush",
      dropped_month_name: "Magh",
      start_date: "1983-01-15",
      end_date: "1983-02-12",
      adhik_months: [
        { month_name: "Ashwin", start_date: "1982-09-17", end_date: "1982-10-16" },
        { month_name: "Falgun", start_date: "1983-02-13", end_date: "1983-03-14" },
      ],
    },
    ctx,
  );
  assert.ok(v);
  assert.equal(v.name, "Poush–Magh Kshaya");
  assert.equal(v.adhik, "Adhik Ashwin, Adhik Falgun");
});
