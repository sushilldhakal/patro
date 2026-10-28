import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BRAHMA_LIFESPAN_YEARS,
  DIVYA,
  TIME_ROOT,
  BRAHMA_YEAR_YEARS,
  KALPA_YEARS,
  MAHAYUGAS_PER_KALPA,
  MAHAYUGA_YEARS,
  MANVANTARA_YEARS,
  PARARDHA_YEARS,
  YUGAS,
  kaliYearsElapsed,
  kalpaYearsElapsed,
  nowPathKeys,
  timeAncestry,
  timeChildren,
  type TimeNode,
} from "../src/calendar/brahma-mana";

test("the Surya Siddhanta's figures", () => {
  assert.deepEqual(
    YUGAS.map((y) => y.years),
    [1_728_000, 1_296_000, 864_000, 432_000],
  );
  assert.equal(MAHAYUGA_YEARS, 4_320_000);
  assert.equal(MANVANTARA_YEARS, 306_720_000);
  assert.equal(KALPA_YEARS, 4_320_000_000);
  assert.equal(MAHAYUGAS_PER_KALPA, 1000);
  assert.equal(BRAHMA_YEAR_YEARS, 3_110_400_000_000);
  assert.equal(PARARDHA_YEARS, 155_520_000_000_000);
  assert.equal(BRAHMA_LIFESPAN_YEARS, 311_040_000_000_000);
  assert.ok(Number.isSafeInteger(BRAHMA_LIFESPAN_YEARS));
});

test("each yuga is dawn + core + dusk, a twelfth each side", () => {
  for (const y of YUGAS) {
    assert.equal(y.sandhya * 2 + y.core, y.years);
    assert.equal(y.sandhya, y.years / 12);
  }
  assert.equal(YUGAS.reduce((sum, y) => sum + y.years, 0), MAHAYUGA_YEARS);
});

test("the reference's divya varṣa figures", () => {
  assert.equal(DIVYA.lifespan, 864_000_000_000);
  assert.equal(DIVYA.parardha, 432_000_000_000);
  assert.equal(DIVYA.varsha, 8_640_000_000);
  assert.equal(DIVYA.masa, 720_000_000);
  assert.equal(DIVYA.kalpa, 12_000_000);
  assert.equal(DIVYA.manvantaraFull, 856_800);
  assert.equal(DIVYA.manvantara, 852_000);
  assert.equal(DIVYA.jalaplava, 4_800);
  assert.equal(DIVYA.mahayuga, 12_000);
});

test("along the path to now, every node's children fill it exactly", () => {
  // Walk the current path and one step beside it, so every kind of node is checked.
  const check = (n: TimeNode, depth: number) => {
    const kids = timeChildren(n);
    if (!n.hasChildren) return assert.equal(kids.length, 0, n.key);
    assert.equal(kids.reduce((sum, c) => sum + c.divya, 0), n.divya, n.key);
    for (const c of kids) if (c.current || (depth < 12 && c.kind === "yuga")) check(c, depth + 1);
  };
  check(TIME_ROOT, 0);
});

test("the page opens on the path to now", () => {
  assert.deepEqual(nowPathKeys(), ["L", "L/p2", "L/p2/v1", "L/p2/v1/m1", "L/p2/v1/m1/k1", "L/p2/v1/m1/k1/n7", "L/p2/v1/m1/k1/n7/m", "L/p2/v1/m1/k1/n7/m/y28", "L/p2/v1/m1/k1/n7/m/y28/kali", "L/p2/v1/m1/k1/n7/m/y28/kali/core"]);
});

test("a key's ancestry rebuilds just its branch", () => {
  const keys = nowPathKeys();
  const deepest = keys[keys.length - 1]!;
  assert.deepEqual(timeAncestry(deepest).map((n) => n.key), keys);
  assert.ok(timeAncestry(deepest).every((n) => n.current));
  assert.deepEqual(timeAncestry("L/p1/v3/zz").map((n) => n.key), ["L", "L/p1", "L/p1/v3"]);
});

test("where we are now", () => {
  assert.equal(kaliYearsElapsed(2026), 5127);
  assert.equal(kalpaYearsElapsed(2026), 1_972_949_127);
});
