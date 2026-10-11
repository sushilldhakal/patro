import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  ApiError,
  NetworkError,
  TimeoutError,
  apiErrorFrom,
  fetchWithTimeout,
  isNetworkError,
  queryParams,
  requestJson,
  withQuery,
} from "../src/http";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

test("requestJson parses JSON and passes the URL through", async () => {
  let seen = "";
  globalThis.fetch = (async (url: string) => {
    seen = url;
    return json({ ok: 1 });
  }) as typeof fetch;
  assert.deepEqual(await requestJson("https://x/api/v1", "/panchanga/today"), { ok: 1 });
  assert.equal(seen, "https://x/api/v1/panchanga/today");
});

test("a non-OK response becomes ApiError with the backend detail", async () => {
  globalThis.fetch = (async () => json({ detail: "Date out of range" }, 400)) as typeof fetch;
  const err = await requestJson("https://x", "/p").catch((e) => e);
  assert.ok(err instanceof ApiError);
  assert.equal(err.status, 400);
  assert.equal(err.detail, "Date out of range");
  assert.equal(err.path, "/p");
  assert.equal(err.message, "API 400: Date out of range");
});

test("FastAPI validation errors give their first message", async () => {
  const err = await apiErrorFrom(json({ detail: [{ msg: "field required", loc: ["query", "x"] }] }, 422), "/p");
  assert.equal(err.detail, "field required");
});

test("a non-JSON error body still gives a useful message", async () => {
  const err = await apiErrorFrom(new Response("<html>bad gateway</html>", { status: 502 }), "/p");
  assert.equal(err.detail, undefined);
  assert.equal(err.message, "API 502: /p");
});

test("could not connect → NetworkError, which is still a TypeError", async () => {
  globalThis.fetch = (async () => {
    throw new TypeError("Network request failed");
  }) as typeof fetch;
  const err = await requestJson("https://x", "/p").catch((e) => e);
  assert.ok(err instanceof NetworkError);
  assert.ok(err instanceof TypeError);
  assert.ok(isNetworkError(err));
});

test("a hung request times out with TimeoutError", async () => {
  globalThis.fetch = ((_url: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })) as typeof fetch;
  const err = await fetchWithTimeout("https://x/p", "/p", { timeoutMs: 20 }).catch((e) => e);
  assert.ok(err instanceof TimeoutError);
  assert.ok(err instanceof NetworkError);
  assert.equal(err.timeoutMs, 20);
});

test("a caller's abort stays an AbortError, not a failure", async () => {
  globalThis.fetch = ((_url: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
    })) as typeof fetch;
  const controller = new AbortController();
  const pending = fetchWithTimeout("https://x/p", "/p", { signal: controller.signal, timeoutMs: 10_000 });
  controller.abort();
  const err = await pending.catch((e) => e);
  assert.equal(err.name, "AbortError");
  assert.ok(!(err instanceof NetworkError));
});

test("queryParams leaves out unset optional fields and serialises the rest", () => {
  const qs = queryParams({
    date: "2026-10-10",
    lat: 27.7,
    force: true,
    skip: undefined,
    none: null,
    at: new Date("2026-10-10T00:15:00Z"),
    tag: ["a", null, "b"],
  }).toString();
  assert.equal(qs, "date=2026-10-10&lat=27.7&force=true&at=2026-10-10T00%3A15%3A00.000Z&tag=a&tag=b");
});

test("withQuery appends to a path with or without a query already", () => {
  assert.equal(withQuery("/p", { a: 1 }), "/p?a=1");
  assert.equal(withQuery("/p?x=1", { a: 1 }), "/p?x=1&a=1");
  assert.equal(withQuery("/p", { a: undefined }), "/p");
});
