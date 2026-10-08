# Ship Vedic Patro to the App Store and Google Play

The native project is configured for store builds. Remaining work is **accounts, certificates, screenshots, and the first EAS production build** — those cannot be finished from the repo alone.

## Already in the repo

- Bundle / package ID `com.vedicpatro.mobile`
- Version `1.0.0` with EAS remote build numbers (`eas.json` `appVersionSource: remote`)
- Production profile builds an **Android App Bundle** and a store iOS IPA
- Privacy manifest, encryption export (`ITSAppUsesNonExemptEncryption = false`)
- Camera / location / motion usage strings (Nepali + English)
- Blocked Android permissions that stores flag (storage, overlay, mic, background location)
- Sign in with Apple (iOS) next to Google and Facebook — App Store rule 4.8
- In-app **Privacy Policy**, **Terms**, and **Delete account**
- Live URLs after you deploy the website:
  - https://www.vedicpatro.com/privacy
  - https://www.vedicpatro.com/terms
- Store copy, age ratings, Apple nutrition labels, Play Data safety: files in this folder
- Icons + Play feature graphic: `npm run icons`

## 1. Deploy the legal pages (do this first)

Stores fetch the privacy URL. Ship the web app so `/privacy` and `/terms` return 200.

Also deploy `public/.well-known/apple-app-site-association` and `assetlinks.json`. The Apple file now uses team `H6AS5X74R2`; the live site still serves the old `APPLE_TEAM_ID` placeholder until that deploy. Play’s `assetlinks.json` still needs `REPLACE_WITH_PLAY_APP_SIGNING_SHA256` (`eas credentials`). Reload nginx so `/.well-known/` is not redirected to `index.html` (see `nepali-holiday-api/deploy/nginx-vedicpatro.conf`).

Redeploy the API so `POST /auth/apple` and `DELETE /auth/me` exist before you submit.

Optional env on the API:

```
GOOGLE_IOS_CLIENT_ID=…
GOOGLE_ANDROID_CLIENT_ID=…
APPLE_BUNDLE_ID=com.vedicpatro.mobile
```

## 2. Apple Developer + App Store Connect

1. [developer.apple.com](https://developer.apple.com) — enroll ($99/year) if needed.
2. Identifiers → `com.vedicpatro.mobile` with **Sign In with Apple** and Associated Domains.
3. App Store Connect → New App:
   - Name: Vedic Patro  
   - Bundle ID: `com.vedicpatro.mobile`  
   - SKU: `vedicpatro`  
   - Primary language: English (U.S.)
4. Copy the numeric **Apple ID** (App Store Connect → App Information). After the first `eas submit`, you can put it in `eas.json` as `submit.production.ios.ascAppId`.
5. Fill listing from `listing.md`, privacy from `app-privacy.md`, age from `age-ratings.md`.
6. Support URL: https://www.vedicpatro.com — Privacy: https://www.vedicpatro.com/privacy  
7. Enable **Sign in with Apple** for the App ID. In the Apple Developer identifier, use the same bundle ID.
8. Export compliance: the app sets `ITSAppUsesNonExemptEncryption` to false (HTTPS only). Confirm that in Connect if asked.

## 3. Google Play Console

1. Create the app **Vedic Patro** / package `com.vedicpatro.mobile`.
2. Store listing from `listing.md`. Feature graphic: `store/assets/feature-graphic.png`.
3. Data safety from `play-data-safety.md`. Privacy policy URL required.
4. Content rating from `age-ratings.md`.
5. Target audience: 18+ is unnecessary; Everyone is correct. News app / COVID declarations: no.
6. Create a Google Cloud **service account** with Play Android Developer API access, download JSON to `store/secrets/play-service-account.json` (gitignored).
7. Play App Signing: accept Google’s signing key on first upload. Then put the **App signing** SHA-256 into `assetlinks.json` and the Android OAuth client.

## 4. EAS login and credentials

```bash
cd dhakal-patro-mobile
npx eas-cli login
npx eas-cli credentials   # create iOS dist cert + provisioning; Android keystore
```

Confirm the Android SHA-1 / SHA-256 match the Google OAuth Android client (`docs/social-sign-in.md`).

## 5. Build

```bash
npm run build:ios        # eas build --platform ios --profile production
npm run build:android    # AAB for Play
```

Or both: `npx eas-cli build --profile production --platform all`

First iOS build will ask for the Apple team. Do **not** use the `development` profile for stores (that one is a dev client).

## 6. Submit

```bash
npm run submit:ios
npm run submit:android
```

Android is set to **internal track, draft** (`changesNotSentForReview: true`) so you can check the Play listing before production. Promote Internal → Closed → Production when ready.

iOS lands in App Store Connect as a build; attach it to a version, add screenshots, then Submit for Review.

## 7. Review notes (paste into both consoles)

Use the full text in [`permissions-review.md`](permissions-review.md) (location, camera, motion). Short version:

```
Location is When In Use only — panchanga for your city, and true-north compass in Aakash Gochar. Search a city if denied. Never background, never ads.

Camera is Aakash Gochar live overlay only. No photos, recording, or upload. Sky map works without it.

Motion stays on the device to aim the sky. Drag by hand if denied.

Privacy: https://www.vedicpatro.com/privacy
Delete account: Account → Delete account
Jyotish is educational, not medical or financial advice.
```

Demo account: create one on production and put email/password in the notes.

## Checklist before you tap Submit

- [ ] https://www.vedicpatro.com/privacy and /terms load on a phone browser  
- [ ] `DELETE /auth/me` works while signed in  
- [ ] iOS Sign in with Apple works on a device build  
- [ ] Google/Facebook still work on a store build (not Expo Go)  
- [ ] Screenshots captured (see `screenshots/README.md`)  
- [ ] Feature graphic uploaded on Play  
- [ ] No `expo-dev-client` / debug menu in the production binary (production profile)  
- [ ] Support email `support@vedicpatro.com` receives mail  
- [ ] Website redeployed so `/.well-known/apple-app-site-association` shows `H6AS5X74R2` (source file is already updated)  
- [ ] Play signing SHA-256 substituted in assetlinks.json  
