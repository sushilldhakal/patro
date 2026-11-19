import { test } from "node:test";
import assert from "node:assert/strict";
import { ahargana, sighraParts } from "../src/learn/surya-classical";
import { suryaFigure, suryaFiguresFor } from "../src/learn/surya-figures";

test("the śīghra correction equals the angle drawn around the sun", () => {
  // Earth's orbit and the planet's orbit in the ratio p : 360 (Venus) — the angle at the earth
  for (let k = 0; k < 360; k += 15) {
    const s = sighraParts(k, 262, 260);
    const r = s.p / 360;
    const x = 1 + r * Math.cos((k * Math.PI) / 180);
    const y = r * Math.sin((k * Math.PI) / 180);
    const geo = (Math.atan2(y, x) * 180) / Math.PI;
    assert.ok(Math.abs(geo - s.phala) < 0.5, `κ=${k}: table ${s.phala.toFixed(2)} vs geometry ${geo.toFixed(2)}`);
  }
});

test("the ahargaṇa of Mangsir 2083 lands near the modern Kali day count", () => {
  // 19 Nov 2026 is Kali day 1,872,898 (JD 2461363.5 − 588465.5), a Thursday
  const a = ahargana(5127, 7, 9);
  assert.ok(Math.abs(a.days - 1872898) < 3, `got ${a.days}`);
  assert.equal((1872898 + 5) % 7, 4);
});

test("every placed figure draws, in both languages, with its worked steps finite", () => {
  const all = Array.from({ length: 14 }, (_, i) => suryaFiguresFor(i + 1)).flat();
  assert.ok(all.length >= 70, `only ${all.length} figures`);
  for (const { key } of all) {
    for (const lang of ["ne", "en"] as const) {
      for (const t of [0, 0.13, 0.37, 0.5, 0.71, 0.99]) {
        const f = suryaFigure(key, t, lang);
        assert.ok(f.shapes.length > 0, key);
        assert.ok((f.steps?.length ?? 0) >= 3, `${key}: too few steps`);
        const text = JSON.stringify(f);
        assert.ok(!/NaN|Infinity|undefined/.test(text), `${key} ${lang} ${t}`);
      }
    }
  }
});

test("every reference table builds in both languages with even rows", async () => {
  const { SURYA_TABLE_PLACES, suryaTable, jupiterYear } = await import("../src/learn/surya-tables");
  for (const { key } of SURYA_TABLE_PLACES) {
    for (const lang of ["ne", "en"] as const) {
      const tb = suryaTable(key, lang);
      assert.ok(tb.rows.length > 0, key);
      for (const row of tb.rows) assert.equal(row.length, tb.columns.length, `${key}: ${row[0]}`);
      assert.ok(!/NaN|Infinity|undefined/.test(JSON.stringify(tb)), `${key} ${lang}`);
    }
  }
  // Burgess, for 1859: 418 revolutions and 2 signs since Kali → index 38 (Prajāpati, the 39th)
  const days1859 = Math.round(((418 + 2.5 / 12) * 1577917828) / 364220);
  assert.equal(jupiterYear(days1859).index, 38);
});
