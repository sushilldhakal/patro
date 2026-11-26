// A request the app's own calendar cannot answer is reported by method name, then asked of the server.
import { test } from "node:test";
import assert from "node:assert/strict";
import { configureApiClient, fetchSpecialMonths } from "../src/index.ts";

test("a null or throwing local answer reports its method and falls back to the server", async () => {
  const misses: { method: string; error?: unknown }[] = [];
  const asked: string[] = [];
  let fail = false;
  configureApiClient({
    baseUrl: "https://example.test/api/v1",
    dataBaseUrl: "https://example.test/api/v1",
    get: async (path: string) => (asked.push(path), { from: "server" }),
    appendLocation: (p: string) => p,
    locationKey: () => "",
    local: {
      specialMonths: async () => {
        if (fail) throw new Error("boom");
        return null;
      },
    } as never,
    onLocalMiss: (miss) => misses.push(miss),
  } as never);
  assert.deepEqual(await fetchSpecialMonths(2083), { from: "server" });
  fail = true;
  await fetchSpecialMonths(2083);
  assert.equal(asked.length, 2);
  assert.deepEqual(misses.map((m) => [m.method, (m.error as Error | undefined)?.message]), [["specialMonths", undefined], ["specialMonths", "boom"]]);
});
