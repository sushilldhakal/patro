# Vedic Patro Mobile

React Native (Expo) app for **Vedic Patro** — calendar, panchanga, holidays, and AD↔BS converter. Uses the same API as the web app (`https://vedicpatro.com/api`).

## Features

- Bikram Sambat calendar grid with tithi + festival markers
- Daily panchanga (tithi, nakshatra, yoga, karana, muhurta, timeline, wheel)
- **Full sitemap parity** with [vedicpatro.com](https://www.vedicpatro.com): panchanga sub-pages, gochar, graha pages, eclipses, panchak, suryakranti, abhijit, ritu, sait/muhurta, learn articles, kundali & milan
- Nepal holidays list by BS year
- AD ↔ BS date converter
- Nepali / English toggle with Devanagari digits
- **Responsive layout**: phone bottom tabs, tablet/iPad sidebar
- **Fonts**: Mukta (UI) + Fira Code (dates), matching the web app
- Learn articles are **native React Native screens** (bilingual prose, in-app links). **Do not** embed vedicpatro.com or other site pages in a WebView for in-app content.

## Offline mode

Chosen at onboarding or any time from **Account → Offline Data**. The user picks
a BS year range (at most a 90-year span, e.g. 2000–2090; the cap comes from the
server's `GET /meta/capabilities` → `offline_max_span_years`), ticks what to include, and
**sees the size before anything downloads** — `estimatePackSize` downloads one real
sample year and scales it up, so the number is what this server actually sends.
Only after the user agrees does `runPackDownload` fetch the rest.

How it works (`lib/offline/`):

- Every public read goes through `get()` → `offlineAwareGet`. Online it behaves as
  before; with no connection (or a 5xx) the saved response for the *same request*
  is returned, so every screen whose data was downloaded works with no per-screen code.
- A download calls the app's own `fetch*` functions inside a capture
  (`beginCapture`), so what is saved is exactly what screens ask for. Cache-busting
  params (`cv`, `sv`, `gv`, `v`) are ignored in the key (`offline-key.ts`).
- Groups: calendar & festivals & sait (required), planets/eclipses/timings, daily
  detail (large, opt-in), scripture texts (no audio). Sign-in data (kundali,
  personal rashifal, profiles) is never downloaded.
- Interrupted downloads resume (finished work is skipped), pausing when offline or
  off Wi-Fi if "Wi-Fi only" is on.
- On-device fallbacks for things that cannot be pre-downloaded: the AD↔BS converter
  (`offline/convert-fallback.ts`, uses the bundled month table) and the Vastu planner
  (`vastu-offline.ts`, kept identical to the server's `POST /vastu/sketch`).
- Not covered offline: arbitrary-instant lookups (`/panchanga/at-time`), city search,
  Vastu/learn media, and anything outside the downloaded years/location.

## Breakpoints

| Name | Width | Layout |
|------|-------|--------|
| phone | < 400px | compact cells, bottom tabs |
| largePhone | 400–767px | slightly larger cells |
| tablet | 768–1023px | sidebar + 2-column content |
| desktop | ≥ 1024px | wider sidebar, split panes |

## App Store / Play Store

Production config, listing copy, privacy answers, and the submit checklist live in [`store/README.md`](store/README.md).

```bash
npx eas-cli build --profile production --platform all
npx eas-cli submit --profile production --platform all
```

Privacy policy (required by both stores): https://www.vedicpatro.com/privacy

## Run locally

```bash
cd dhakal-patro-mobile
npm install
npm start
```

`npm start` uses **`expo start --go`** so the QR code opens in **Expo Go** on your phone. Do **not** use the `exp+vedic-patro-mobile://…` link in Expo Go — that URL is only for a custom dev build.

Then press:

- `i` — iOS Simulator (iPhone / iPad)
- `a` — Android emulator
- `w` — web preview

On a **physical phone**: install **Expo Go** (SDK 54), same Wi‑Fi as your Mac, scan the QR from the terminal. The link should look like `exp://192.168.x.x:8081`, not `exp+vedic-patro-mobile://`.

If you previously ran the app on SDK 52, stop the old dev server, reinstall, and clear Metro cache:

```bash
npm install
npx expo start --clear
```

### Can’t open on phone / “exp+vedic-patro-mobile://…”

That URL is for a **development build** (custom “Vedic Patro” app with `expo-dev-client`). **Expo Go ignores it** — the project looks like it “does nothing” when you tap Open.

| Goal | Command |
|------|---------|
| **Phone + Expo Go** (usual) | `npm start` → scan QR; URL must be `exp://…` |
| **Custom dev client** | `npm run start:dev-client` → install app via `npx expo run:ios` or EAS, then scan |

Also check: phone and Mac on the **same Wi‑Fi**, and Metro finished bundling (no red errors in the terminal).

### Google sign-in (`redirect_uri_mismatch`)

Google compares the redirect URI your app sends with what is registered on the **Web**
OAuth client (`googleWebClientId` in `app.json`). The website uses
`/auth/google/callback`; Expo uses `/oauthredirect` or `vedicpatro:/oauthredirect`.

1. Run `node scripts/print-google-oauth-setup.cjs` and copy the listed URIs.
2. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → your **Web**
   OAuth client → add those under **Authorized redirect URIs** (and JS origins for web).
3. **Expo Go does not support Google sign-in** — use a dev build: `npx expo run:ios` or
   `npx expo run:android` (see `docs/social-sign-in.md`).

After changing Google Console, wait a minute and try again. In dev, Metro logs
`[Google OAuth] redirect URI:` — that exact string must appear in the console list.

### Local API (optional)

To point at your local FastAPI server instead of production, edit `app.json`:

```json
"extra": {
  "apiBaseUrl": "http://YOUR_LAN_IP:8080",
  "apiVersion": "v1"
}
```

Use your machine's LAN IP (not `localhost`) when testing on a physical phone.

## Project structure

```
app/                 Expo Router screens
components/          UI + calendar grid
lib/                 API, BS calendar, i18n, responsive hooks
assets/              App icons
```

## Tech stack

- Expo SDK 54 + Expo Router 6 (compatible with current Expo Go)
- NativeWind (Tailwind for RN)
- TanStack React Query
- Same BS calendar tables as `dhakal-patro` web app
