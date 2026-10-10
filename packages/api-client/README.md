# @vedic-patro/api-client

Typed requests to the Vedic Patro API, shared by the website (`apps/web`) and
the mobile app (`apps/mobile`). App code keeps importing from `@/lib/api`,
which re-exports everything here.

- `src/types.ts` — every API response type, one definition each.
- `src/client.ts` — request functions, query keys, cache versions, `ApiError`.

## How a request is sent

The package builds paths; each app supplies the transport once, in its
`lib/api.ts`:

```ts
configureApiClient({
  baseUrl,          // unversioned API base (…/api)
  dataBaseUrl,      // versioned data base (…/api/v1)
  get,              // website: fetch · app: fetch that also answers from its offline download
  appendLocation,   // how this app writes a location into the query
  locationKey,      // how this app keys a location in caches
});
```

`appendLocation` and `locationKey` stay per app on purpose: the app always
sends its Kathmandu default and keys its offline year cache by its own format,
so changing either would orphan data users already downloaded.

## Request URLs are a contract

The CDN caches by URL, and the app's offline download stores each response
under the exact URL its screens later ask for. `npm test -w
@vedic-patro/api-client` runs every request function of both apps against a
fake fetch and compares the URLs with `test/golden/*.json`; CI runs it. If a
change is intended, run it with `-- --update` and say why in the commit.

## Still in the apps, and why

- **Base URLs and the transport** (above) — configuration.
- **How a day is addressed.** The website names a day by era-aware day state
  (`PatroDayFetchState`, BS/BBS/AD/BC); the app by an AD date. The shared
  `fetchRashifalForDay` / `fetchPersonalRashifalForDay` take the day as query
  params, and each app keeps a one-line wrapper. The website's day-pipeline
  requests (`fetchPanchangaDay`, `fetchPanchangaAtTimeForDay`, …) and its
  `panchangaKeys` depend on that state and stay in the website.
- **Month rows.** `fetchMonthCalendarRaw` is shared; each app maps rows to its
  own `CalendarDay` (`normalizeMonthDay`) — for AD months the website shows the
  BS day number and the app the AD one.
