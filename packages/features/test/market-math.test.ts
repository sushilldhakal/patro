// The market page's converter (through rupees, NRB's units) and the gold calculator (tola, aana, gram).
import { test } from "node:test";
import assert from "node:assert/strict";
import { convertForex } from "../src/home/forex.ts";
import { lakhGrouped, metalCost, rupees } from "../src/home/metals.ts";

const rates = [
  { code: "USD", rate: { unit: 1, buy: 147.28, sell: 147.88 } },
  { code: "INR", rate: { unit: 100, buy: 160, sell: 160.15 } },
];

test("convertForex goes through rupees at the chosen side and unit", () => {
  assert.equal(convertForex(1000, "INR", "NPR", "buy", rates), 1600);
  assert.ok(Math.abs(convertForex(1, "USD", "NPR", "mid", rates)! - 147.58) < 1e-9);
  assert.ok(Math.abs(convertForex(147.88, "NPR", "USD", "sell", rates)! - 1) < 1e-9);
  assert.equal(convertForex(1, "XYZ", "NPR", "buy", rates), null);
});

test("metalCost: 16 aana a tola, grams by the 10 g rate; Nepal's grouping", () => {
  const price = { tola: 242800, tenGram: 208160 };
  assert.equal(metalCost(8, "aana", price), 121400);
  assert.equal(metalCost(10, "gram", price), 208160);
  assert.equal(metalCost(-1, "tola", price), null);
  assert.equal(lakhGrouped(242800), "2,42,800");
  assert.equal(rupees(2636.5), "2,636.5");
});
