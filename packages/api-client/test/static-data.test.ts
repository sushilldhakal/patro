import { test } from "node:test";
import assert from "node:assert/strict";
import { haversineKm, nearestInRows, staticFileFor } from "../src/static-data";

test("API paths map to their static files, and only static ones do", () => {
  assert.equal(staticFileFor("/nepal/cities/popular"), "cities/popular.json");
  assert.equal(staticFileFor("/documents?v=7"), "documents/index.json");
  assert.equal(staticFileFor("/documents/rigveda"), "documents/rigveda.json");
  assert.equal(staticFileFor("/documents/rigveda/chapters/3?siddhanta=drik&ayanamsha=lahiri"), "documents/rigveda/3.json");
  assert.equal(staticFileFor("/veda/details/rishi/values?slug=rigveda&v=7"), "veda/details/rishi/values-rigveda.json");
  assert.equal(staticFileFor("/veda/details/rishi/values?v=7"), "veda/details/rishi/values.json");
  // paged chapters, searches and anything with its own parameters stay on the API
  assert.equal(staticFileFor("/documents/rigveda/chapters/3?limit=40&v=7"), null);
  assert.equal(staticFileFor("/documents/rigveda?slug=x"), null);
  assert.equal(staticFileFor("/nepal/cities/search?q=kath"), null);
  assert.equal(staticFileFor("/documents/..%2Fx"), null);
  assert.equal(staticFileFor("/veda/details/rishi?value=x"), null);
});

const row = (id: number, lat: number, lon: number, country = "NP", population = 1) =>
  [id, `c${id}`, `c${id}`, lat, lon, country, population, "Asia/Kathmandu", null, null] as const;

test("nearest city follows the server's box, population and tie rules", () => {
  const rows = [row(3, 27.71, 85.32), row(1, 27.7, 85.3), row(2, 27.7, 85.3, "NP", 0), row(9, 30, 85.3)];
  assert.equal(nearestInRows(rows as never, 27.7, 85.3)?.id, 1);
  // equal distance: the later candidate in (lat, id) order wins
  const tie = [row(5, 27.7, 85.31), row(4, 27.7, 85.31)];
  assert.equal(nearestInRows(tie as never, 27.7, 85.3)?.id, 5);
  // nothing within 60 km → null (the API widens the search)
  assert.equal(nearestInRows([row(9, 30, 85.3)] as never, 27.7, 85.3), null);
  assert.equal(nearestInRows(rows as never, 27.7, 85.3, "IN"), null);
  assert.ok(Math.abs(haversineKm(27.7, 85.3, 28.2, 83.98) - 141.5) < 1);
});
