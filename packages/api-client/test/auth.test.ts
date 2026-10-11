import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { configureApiClient } from "../src/client";
import { AuthError, apiLogin, authFetch, configureAuth, type TokenStore } from "../src/auth";
import { ApiError } from "../src/http";
import type { TokenPair } from "../src/types";

const realFetch = globalThis.fetch;

function memoryTokens(access: string | null, refresh: string | null) {
  const state = { access, refresh, cleared: 0 };
  const store: TokenStore = {
    get access() {
      return state.access;
    },
    get refresh() {
      return state.refresh;
    },
    set(t: TokenPair) {
      state.access = t.access_token;
      state.refresh = t.refresh_token;
    },
    clear() {
      state.access = null;
      state.refresh = null;
      state.cleared++;
    },
  };
  return { state, store };
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  configureApiClient({
    baseUrl: "https://x/api",
    dataBaseUrl: "https://x/api/v1",
    get: async () => ({}) as never,
    appendLocation: (p) => p,
    locationKey: () => "",
  });
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

test("a 401 refreshes once, then retries with the new token", async () => {
  const { state, store } = memoryTokens("old", "r1");
  configureAuth({ tokens: store });
  const calls: string[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const auth = (init?.headers as Record<string, string>)?.Authorization ?? "";
    calls.push(`${init?.method ?? "GET"} ${url} ${auth}`);
    if (url.endsWith("/auth/refresh")) return json({ access_token: "new", refresh_token: "r2", token_type: "bearer" });
    return auth === "Bearer new" ? json([{ id: "p1" }]) : json({ detail: "expired" }, 401);
  }) as typeof fetch;
  assert.deepEqual(await authFetch("/profiles"), [{ id: "p1" }]);
  assert.deepEqual(calls, [
    "GET https://x/api/profiles Bearer old",
    "POST https://x/api/auth/refresh ",
    "GET https://x/api/profiles Bearer new",
  ]);
  assert.equal(state.refresh, "r2");
});

test("requests that 401 together share one refresh (tokens are single-use)", async () => {
  const { store } = memoryTokens("old", "r1");
  configureAuth({ tokens: store });
  let refreshes = 0;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const auth = (init?.headers as Record<string, string>)?.Authorization ?? "";
    if (url.endsWith("/auth/refresh")) {
      refreshes++;
      await new Promise((r) => setTimeout(r, 5));
      return json({ access_token: "new", refresh_token: "r2", token_type: "bearer" });
    }
    return auth === "Bearer new" ? json({ ok: true }) : json({}, 401);
  }) as typeof fetch;
  await Promise.all([authFetch("/a"), authFetch("/b"), authFetch("/c")]);
  assert.equal(refreshes, 1);
});

test("a server error during refresh keeps the session", async () => {
  const { state, store } = memoryTokens("old", "r1");
  configureAuth({ tokens: store });
  globalThis.fetch = (async (url: string) =>
    url.endsWith("/auth/refresh") ? json({}, 503) : json({ detail: "expired" }, 401)) as typeof fetch;
  const err = await authFetch("/profiles").catch((e) => e);
  assert.ok(err instanceof AuthError);
  assert.equal(err.status, 401);
  assert.equal(state.cleared, 0);
  assert.equal(state.refresh, "r1");
});

test("no connection during refresh keeps the session", async () => {
  const { state, store } = memoryTokens("old", "r1");
  configureAuth({ tokens: store });
  globalThis.fetch = (async (url: string) => {
    if (url.endsWith("/auth/refresh")) throw new TypeError("Network request failed");
    return json({}, 401);
  }) as typeof fetch;
  await authFetch("/profiles").catch(() => undefined);
  assert.equal(state.cleared, 0);
});

test("a rejected refresh token ends the session", async () => {
  const { state, store } = memoryTokens("old", "r1");
  configureAuth({ tokens: store });
  globalThis.fetch = (async () => json({ detail: "revoked" }, 401)) as typeof fetch;
  await authFetch("/profiles").catch(() => undefined);
  assert.equal(state.cleared, 1);
  assert.equal(state.access, null);
});

test("account errors carry the backend message for the form, and are ApiErrors", async () => {
  const { store } = memoryTokens(null, null);
  configureAuth({ tokens: store });
  globalThis.fetch = (async () => json({ detail: "Invalid email or password" }, 401)) as typeof fetch;
  const err = await apiLogin("a@b.np", "x").catch((e) => e);
  assert.ok(err instanceof AuthError);
  assert.ok(err instanceof ApiError);
  assert.equal(err.message, "Invalid email or password");
});
