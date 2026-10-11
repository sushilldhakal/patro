# @vedic-patro/api-client

The typed client for the Vedic Patro API, shared by the website (`apps/web`)
and the mobile app (`apps/mobile`). App code keeps importing from `@/lib/api`,
`@/lib/auth/client` and its documents module, which configure this package and
re-export it.

| File | What |
| --- | --- |
| `src/types.ts` | every request/response type, one definition each (also `@vedic-patro/api-client/contracts`) |
| `src/http.ts` | `ApiError`, `NetworkError`/`TimeoutError`, `fetchWithTimeout`, `requestJson`, query serialisation |
| `src/client.ts` | data requests, query keys, cache versions, base URLs (`apiBases`) and the transport |
| `src/auth.ts` | accounts and profiles: bearer tokens, refresh-on-401, sky favourites |
| `src/documents.ts` | scripture documents and the Veda mantra of the day |
| `contracts/openapi.json` | the API's own OpenAPI document (generated, see below) |

## How a request is sent

The package builds paths; each app supplies the transport once, in its
`lib/api.ts`:

```ts
const { baseUrl, dataBaseUrl } = apiBases(configuredBase, version);
configureApiClient({
  baseUrl,          // unversioned API base (…/api) — accounts, meta
  dataBaseUrl,      // versioned data base (…/api/v1)
  get,              // website: requestJson · app: the same, answered from its offline download when offline
  appendLocation,   // how this app writes a location into the query
  locationKey,      // how this app keys a location in caches
});
```

and its token storage once, in `lib/auth/client.ts`:

```ts
configureAuth({ tokens });  // website: localStorage · app: memory + SecureStore
```

Errors: a non-OK response is an `ApiError` (status, the backend's `detail`,
path); account requests throw `AuthError` (an `ApiError` whose message is the
backend's, shown in forms). No connection or no answer within 120 s (the API
proxy's own `proxy_read_timeout`) is a `NetworkError`/`TimeoutError` — both are
`TypeError`s, as `fetch` itself throws, so offline fallbacks keep working. A
caller's `AbortSignal` still produces a plain `AbortError`.

Query parameters: `queryParams`/`withQuery` leave out `null`/`undefined`
(optional fields not set are not sent), send dates as ISO strings and booleans
as `true`/`false`.

## Request URLs are a contract

The CDN caches by URL, and the app's offline download stores each response
under the exact URL its screens later ask for. `npm test -w
@vedic-patro/api-client` runs every request function of both apps (data,
documents, accounts with method and body, sky favourites) against a fake fetch
and compares with `test/golden/*.json`; CI runs it. If a change is intended,
run `node test/url-golden.mjs --update` and say why in the commit.

## Requests match the API

`test/openapi-contract.mjs` checks every recorded request against
`contracts/openapi.json`: the route exists, accepts that method, and receives
every query parameter it requires. After changing a route in `apps/api`:

```sh
cd apps/api && python scripts/export_openapi.py   # --check in CI
```

FastAPI declares a response schema for only 21 of its 112 operations, so the
response types are written by hand in `src/types.ts` rather than generated;
the OpenAPI check covers paths, methods and required parameters.

## Still in the apps, and why

- **Base URL source and the transport** — the website reads `VITE_API_BASE_URL`
  (same-origin `/api` behind nginx); the app reads `expo.extra.apiBaseUrl`
  (production host) and the offline store.
- **Token storage** — localStorage on the website, the Keychain/Keystore in the
  app. The flow itself is shared.
- **`appendLocation` / `locationKey`** — the app always sends its Kathmandu
  default and keys its offline year cache by its own format; changing either
  would orphan data users already downloaded.
- **How a day is addressed** — the website by era-aware day state
  (`PatroDayFetchState`), the app by an AD date; each keeps a one-line wrapper
  around the shared `fetchRashifalForDay` / `fetchPersonalRashifalForDay`.
- **Month rows** — `fetchMonthCalendarRaw` is shared; each app maps rows to its
  own `CalendarDay` (`normalizeMonthDay`).
- **App-only endpoints** — reminders, devices and daily guidance
  (`apps/mobile/lib/notifications/api.ts`) go through the shared `authFetch`.
