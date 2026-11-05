/**
 * Signed out, events are kept on the device; on sign-in they move to the account once, and a
 * failed upload leaves the rest for the next try.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { configureApiClient } from "../src/client";
import { configureAuth, type TokenStore } from "../src/auth";
import {
  configureGuestEvents,
  createEvent,
  deleteEvent,
  isGuestEvent,
  listEvents,
  updateEvent,
  uploadGuestEvents,
  type CalendarEvent,
  type CalendarEventInput,
} from "../src/events";
import type { TokenPair } from "../src/types";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const tokens = {
  access: null as string | null,
  refresh: null as string | null,
  set(pair: TokenPair) {
    this.access = pair.access_token;
    this.refresh = pair.refresh_token;
  },
  clear() {
    this.access = null;
    this.refresh = null;
  },
} satisfies TokenStore;

const realFetch = globalThis.fetch;
let saved: CalendarEvent[] | null = null;
let posted: Record<string, unknown>[] = [];
let failTitle: string | null = null;

const EVENT: CalendarEventInput = {
  title: "पूजा",
  location: null,
  notes: null,
  all_day: false,
  starts_at: "2026-11-20T04:30:00.000Z",
  ends_at: "2026-11-20T05:30:00.000Z",
  timezone: "Asia/Kathmandu",
  repeat: "never",
  alerts: [10, 0, 10],
  source_kind: null,
  source_key: null,
  invitees: ["a@example.com"],
  profile_id: "p1",
};

beforeEach(() => {
  tokens.clear();
  saved = null;
  posted = [];
  failTitle = null;
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    if (body.title === failTitle) return json({ detail: "nope" }, 500);
    posted.push(body);
    return json({ ...body, id: `srv${posted.length}` }, 201);
  }) as typeof fetch;
  configureApiClient({
    baseUrl: "https://x/api",
    dataBaseUrl: "https://x/api/v1",
    get: async () => ({}) as never,
    appendLocation: (p) => p,
    locationKey: () => "",
  });
  configureAuth({ tokens });
  configureGuestEvents({ get: () => saved, set: (events) => void (saved = events) });
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

test("a guest's events are kept on the device, without invitees", async () => {
  const made = await createEvent(EVENT);
  assert.ok(isGuestEvent(made));
  assert.deepEqual(made.invitees, []);
  assert.deepEqual(made.alerts, [0, 10]);
  assert.equal(posted.length, 0);
  assert.deepEqual((await listEvents()).map((e) => e.id), [made.id]);

  await updateEvent(made.id, { ...EVENT, title: "बदलियो" });
  assert.equal((await listEvents())[0]!.title, "बदलियो");
  await deleteEvent(made.id);
  assert.deepEqual(await listEvents(), []);
});

test("since keeps repeating events and drops finished ones", async () => {
  await createEvent({ ...EVENT, title: "old", ends_at: "2020-01-01T00:00:00.000Z", starts_at: "2020-01-01T00:00:00.000Z" });
  await createEvent({ ...EVENT, title: "yearly", repeat: "yearly", ends_at: "2020-01-01T00:00:00.000Z", starts_at: "2020-01-01T00:00:00.000Z" });
  await createEvent(EVENT);
  assert.deepEqual((await listEvents("2026-01-01T00:00:00.000Z")).map((e) => e.title), ["yearly", "पूजा"]);
});

test("on sign-in they move to the account once; a failed one stays for the next try", async () => {
  await createEvent(EVENT);
  await createEvent({ ...EVENT, title: "fails" });
  tokens.set({ access_token: "a", refresh_token: "r", token_type: "bearer" } as TokenPair);
  failTitle = "fails";
  assert.equal(await uploadGuestEvents(), 1);
  assert.equal(posted[0]!.profile_id, null);
  assert.equal(posted[0]!.id, undefined);
  assert.deepEqual(saved!.map((e) => e.title), ["fails"]);

  failTitle = null;
  assert.equal(await uploadGuestEvents(), 1);
  assert.deepEqual(saved, []);
  assert.equal(await uploadGuestEvents(), 0);
  assert.equal(posted.length, 2);
});
