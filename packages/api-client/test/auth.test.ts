/**
 * The shared session flow, against a fake server that behaves like
 * apps/api/app/routers/auth.py: access tokens expire, refresh tokens are
 * single-use (rotated on every /auth/refresh, 401 once revoked), /auth/logout
 * revokes the token it is given.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { configureApiClient } from "../src/client";
import {
  AuthError,
  apiDeleteAccount,
  apiLogin,
  apiLogout,
  authFetch,
  configureAuth,
  hasStoredSession,
  type TokenStore,
} from "../src/auth";
import { ApiError, NetworkError } from "../src/http";
import type { TokenPair } from "../src/types";

const realFetch = globalThis.fetch;
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const tick = (ms = 5) => new Promise((r) => setTimeout(r, ms));

// ─── A fake API ───────────────────────────────────────────────────────────────

class FakeServer {
  validAccess = new Set<string>();
  validRefresh = new Set<string>();
  revoked = new Set<string>();
  refreshes = 0;
  calls: string[] = [];
  /** Override /auth/refresh: return a Response, or throw to simulate no connection. */
  refreshFails: (() => Response) | null = null;
  refreshDelayMs = 0;
  /** Delay the refresh *response* after the server has already rotated the token. */
  refreshResponseDelayMs = 0;
  private n = 0;

  issue(): TokenPair {
    this.n++;
    const pair = { access_token: `a${this.n}`, refresh_token: `r${this.n}`, token_type: "bearer" } as TokenPair;
    this.validAccess.add(pair.access_token);
    this.validRefresh.add(pair.refresh_token);
    return pair;
  }

  fetch = (async (url: string, init?: RequestInit) => {
    const path = url.replace("https://x/api", "");
    const method = init?.method ?? "GET";
    const auth = ((init?.headers as Record<string, string>) ?? {}).Authorization?.replace("Bearer ", "");
    this.calls.push(`${method} ${path}${auth ? ` [${auth}]` : ""}`);
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    if (path === "/auth/refresh") {
      this.refreshes++;
      if (this.refreshDelayMs) await tick(this.refreshDelayMs);
      if (this.refreshFails) return this.refreshFails();
      if (!this.validRefresh.has(body.refresh_token)) return json({ detail: "Invalid or expired refresh token" }, 401);
      this.validRefresh.delete(body.refresh_token);
      this.revoked.add(body.refresh_token);
      const pair = this.issue();
      if (this.refreshResponseDelayMs) await tick(this.refreshResponseDelayMs);
      return json(pair);
    }
    if (path === "/auth/logout") {
      this.validRefresh.delete(body.refresh_token);
      this.revoked.add(body.refresh_token);
      return json({ message: "Logged out" });
    }
    if (path === "/auth/login") return body.password === "right" ? json(this.issue()) : json({ detail: "Invalid email or password" }, 401);
    if (!auth || !this.validAccess.has(auth)) return json({ detail: "Not authenticated" }, 401);
    if (path === "/auth/me" && method === "DELETE") return new Response(null, { status: 204 });
    return json({ ok: true, path });
  }) as unknown as typeof fetch;

  /** The access token expires (a JWT past its exp). */
  expire(access: string) {
    this.validAccess.delete(access);
  }
}

/** Token storage like the website's: plain getters over a shared map (one per "tab" share the map). */
function sharedStorage() {
  return new Map<string, string>();
}
function storeOver(storage: Map<string, string>, lock?: <T>(run: () => Promise<T>) => Promise<T>): TokenStore & { clears: number } {
  const s = {
    clears: 0,
    get access() {
      return storage.get("access") ?? null;
    },
    get refresh() {
      return storage.get("refresh") ?? null;
    },
    set(t: TokenPair) {
      storage.set("access", t.access_token);
      storage.set("refresh", t.refresh_token);
    },
    clear() {
      s.clears++;
      storage.delete("access");
      storage.delete("refresh");
    },
    ...(lock ? { withRefreshLock: lock } : {}),
  };
  return s;
}

/** A cross-"tab" mutex, like navigator.locks.request. */
function mutex() {
  let chain: Promise<unknown> = Promise.resolve();
  return <T,>(run: () => Promise<T>): Promise<T> => {
    const next = chain.then(run, run);
    chain = next.catch(() => undefined);
    return next;
  };
}

let server: FakeServer;
beforeEach(() => {
  server = new FakeServer();
  globalThis.fetch = server.fetch;
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

function signedIn() {
  const storage = sharedStorage();
  const store = storeOver(storage);
  store.set(server.issue());
  configureAuth({ tokens: store });
  return { storage, store };
}

// ─── Expired access token ─────────────────────────────────────────────────────

test("an expired access token is refreshed once and the request retried", async () => {
  const { store } = signedIn();
  server.expire("a1");
  assert.deepEqual(await authFetch("/profiles"), { ok: true, path: "/profiles" });
  assert.deepEqual(server.calls, ["GET /profiles [a1]", "POST /auth/refresh", "GET /profiles [a2]"]);
  assert.equal(store.access, "a2");
  assert.equal(store.refresh, "r2");
  assert.ok(server.revoked.has("r1"), "the used refresh token is spent");
});

test("a valid access token is sent as is, with no refresh", async () => {
  signedIn();
  await authFetch("/profiles");
  assert.equal(server.refreshes, 0);
});

test("a 401 that survives a successful refresh is reported, not retried again", async () => {
  const { store } = signedIn();
  server.expire("a1");
  // The route rejects every token (e.g. an account disabled between calls).
  const inner = server.fetch;
  server.fetch = (async (url: string, init?: RequestInit) =>
    url.endsWith("/profiles") ? json({ detail: "Not authenticated" }, 401) : inner(url, init)) as typeof fetch;
  globalThis.fetch = server.fetch;
  const err = await authFetch("/profiles").catch((e) => e);
  assert.ok(err instanceof AuthError);
  assert.equal(err.status, 401);
  assert.equal(server.refreshes, 1);
  assert.equal(store.refresh, "r2", "the session from the refresh is kept");
});

// ─── Concurrent refreshes ─────────────────────────────────────────────────────

test("requests that 401 together share one refresh", async () => {
  const { store } = signedIn();
  server.expire("a1");
  server.refreshDelayMs = 10;
  const results = await Promise.all([authFetch("/a"), authFetch("/b"), authFetch("/c"), authFetch("/d")]);
  assert.equal(results.length, 4);
  assert.equal(server.refreshes, 1);
  assert.equal(store.refresh, "r2");
  assert.equal(store.clears, 0);
});

test("a request that 401s after another already refreshed retries without refreshing again", async () => {
  signedIn();
  server.expire("a1");
  // /slow was sent with a1 and answers only after /fast has refreshed.
  const inner = server.fetch;
  server.fetch = (async (url: string, init?: RequestInit) => {
    if (url.endsWith("/slow") && (init?.headers as Record<string, string>)?.Authorization === "Bearer a1") await tick(30);
    return inner(url, init);
  }) as typeof fetch;
  globalThis.fetch = server.fetch;
  const slow = authFetch("/slow");
  await authFetch("/fast");
  await slow;
  assert.equal(server.refreshes, 1, "r2 is not rotated again");
});

test("two tabs: refreshes take turns and the second tab uses the first tab's tokens", async () => {
  const storage = sharedStorage();
  const lock = mutex();
  const tabA = storeOver(storage, lock);
  const tabB = storeOver(storage, lock);
  tabA.set(server.issue());
  server.expire("a1");
  server.refreshDelayMs = 10;
  // Each tab is its own JS realm: model that by running one tab's request, then
  // switching the configured store, without waiting in between.
  configureAuth({ tokens: tabA });
  const a = authFetch("/a");
  configureAuth({ tokens: tabB });
  const b = authFetch("/b");
  await Promise.all([a, b]);
  assert.equal(server.refreshes, 1);
  assert.equal(storage.get("refresh"), "r2");
  assert.equal(tabA.clears + tabB.clears, 0, "nobody is signed out");
});

test("two tabs without a lock: the tab whose refresh is rejected adopts the other tab's rotation", async () => {
  const storage = sharedStorage();
  const tab = storeOver(storage);
  tab.set(server.issue());
  configureAuth({ tokens: tab });
  server.expire("a1");
  // Another tab rotates r1 → r2 while this tab's refresh (also with r1) is in the air.
  const inner = server.fetch;
  server.fetch = (async (url: string, init?: RequestInit) => {
    if (url.endsWith("/auth/refresh")) {
      const other = await inner(url, init); // the other tab wins with r1
      const pair = (await other.json()) as TokenPair;
      storage.set("access", pair.access_token);
      storage.set("refresh", pair.refresh_token);
      return inner(url, init); // ours presents r1 again → 401
    }
    return inner(url, init);
  }) as typeof fetch;
  globalThis.fetch = server.fetch;
  assert.deepEqual(await authFetch("/profiles"), { ok: true, path: "/profiles" });
  assert.equal(tab.clears, 0);
  assert.equal(storage.get("refresh"), "r2");
});

// ─── Rejected, offline, server errors ─────────────────────────────────────────

test("a revoked refresh token ends the session", async () => {
  const { store } = signedIn();
  server.expire("a1");
  server.validRefresh.delete("r1"); // revoked elsewhere (password reset, logout on another device)
  const err = await authFetch("/profiles").catch((e) => e);
  assert.ok(err instanceof AuthError);
  assert.equal(err.status, 401);
  assert.equal(store.clears, 1);
  assert.equal(store.access, null);
  assert.equal(hasStoredSession(), false);
});

test("a 403 from refresh (account disabled) ends the session", async () => {
  const { store } = signedIn();
  server.expire("a1");
  server.refreshFails = () => json({ detail: "Account disabled" }, 403);
  await authFetch("/profiles").catch(() => undefined);
  assert.equal(store.clears, 1);
});

test("no connection during refresh keeps the session and reports a NetworkError", async () => {
  const { store } = signedIn();
  server.expire("a1");
  server.refreshFails = () => {
    throw new TypeError("Network request failed");
  };
  const err = await authFetch("/profiles").catch((e) => e);
  assert.ok(err instanceof NetworkError, "the caller sees offline, not unauthorised");
  assert.equal(store.clears, 0);
  assert.equal(store.refresh, "r1");
  // Back online: the same refresh token still works.
  server.refreshFails = null;
  assert.deepEqual(await authFetch("/profiles"), { ok: true, path: "/profiles" });
});

test("a server error during refresh keeps the session and reports the server error", async () => {
  const { store } = signedIn();
  server.expire("a1");
  server.refreshFails = () => json({ detail: "Database unavailable" }, 503);
  const err = await authFetch("/profiles").catch((e) => e);
  assert.ok(err instanceof AuthError);
  assert.equal(err.status, 503);
  assert.equal(store.clears, 0);
  assert.equal(store.refresh, "r1");
});

test("with no refresh token a 401 is reported without calling /auth/refresh", async () => {
  const storage = sharedStorage();
  const store = storeOver(storage);
  storage.set("access", "stale");
  configureAuth({ tokens: store });
  const err = await authFetch("/profiles").catch((e) => e);
  assert.equal(err.status, 401);
  assert.equal(server.refreshes, 0);
});

// ─── Sign-out ─────────────────────────────────────────────────────────────────

test("sign-out clears locally first and revokes the refresh token on the server", async () => {
  const { store } = signedIn();
  await apiLogout();
  assert.equal(store.access, null);
  assert.equal(store.refresh, null);
  assert.ok(server.revoked.has("r1"));
  assert.deepEqual(server.calls, ["POST /auth/logout"]);
});

test("sign-out still signs out locally when the server cannot be reached", async () => {
  const { store } = signedIn();
  globalThis.fetch = (async () => {
    throw new TypeError("offline");
  }) as typeof fetch;
  await apiLogout();
  assert.equal(store.refresh, null);
});

test("signing out while a refresh is in flight does not bring the session back", async () => {
  const { store } = signedIn();
  server.expire("a1");
  // The server rotates r1 → r2 at once, but the response is still on its way when the user signs out.
  server.refreshResponseDelayMs = 20;
  const pending = authFetch("/profiles").catch((e) => e);
  await tick(5); // the refresh (with r1) is now in the air
  await apiLogout();
  const err = await pending;
  assert.ok(err instanceof AuthError);
  assert.equal(err.status, 401);
  assert.equal(store.access, null, "still signed out");
  assert.equal(store.refresh, null);
  await tick(5);
  assert.equal(server.validRefresh.size, 0, "the token issued by the late refresh is revoked too");
});

test("signing into another account during a refresh keeps the new account", async () => {
  const { store } = signedIn();
  server.expire("a1");
  server.refreshResponseDelayMs = 20;
  const pending = authFetch("/profiles").catch((e) => e);
  await tick(5);
  store.set(await apiLogin("other@b.np", "right"));
  const newRefresh = store.refresh;
  await pending;
  assert.equal(store.refresh, newRefresh);
  assert.equal(store.clears, 0);
});

test("deleting the account signs out only once the server confirms", async () => {
  const { store } = signedIn();
  await apiDeleteAccount();
  assert.equal(store.refresh, null);

  const second = signedIn();
  globalThis.fetch = (async () => json({ detail: "boom" }, 500)) as typeof fetch;
  await apiDeleteAccount().catch(() => undefined);
  assert.equal(second.store.refresh, "r2", "a failed deletion leaves the user signed in");
});

// ─── Errors shown to the user ─────────────────────────────────────────────────

test("account errors carry the backend message and are ApiErrors", async () => {
  const storage = sharedStorage();
  configureAuth({ tokens: storeOver(storage) });
  const err = await apiLogin("a@b.np", "wrong").catch((e) => e);
  assert.ok(err instanceof AuthError);
  assert.ok(err instanceof ApiError);
  assert.equal(err.message, "Invalid email or password");
});
