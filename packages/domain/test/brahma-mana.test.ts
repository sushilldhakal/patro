import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BRAHMA_LIFESPAN_YEARS,
  BRAHMA_TREE,
  BRAHMA_YEAR_YEARS,
  KALPA_YEARS,
  MAHAYUGAS_PER_KALPA,
  MAHAYUGA_YEARS,
  MANVANTARA_YEARS,
  PARARDHA_YEARS,
  YUGAS,
  kaliYearsElapsed,
  kalpaYearsElapsed,
  type BrahmaNode,
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

test("every node's children fill it exactly", () => {
  const check = (node: BrahmaNode) => {
    if (!node.children) return;
    // The ahorātra holds a day and a night side by side; everything else is count × length.
    const filled = node.children.reduce((sum, c) => sum + c.count * c.years, 0);
    assert.equal(filled, node.years, node.id);
    node.children.forEach(check);
  };
  check(BRAHMA_TREE);
});

test("where we are now", () => {
  assert.equal(kaliYearsElapsed(2026), 5127);
  assert.equal(kalpaYearsElapsed(2026), 1_972_949_127);
});
