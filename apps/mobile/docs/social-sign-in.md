# Social sign-in setup (Google + Facebook)

The app code is complete — sign-in turns on as soon as the client IDs below are
filled in. Nothing else needs changing.

Everything public lives in `app.json → expo.extra`. `app.config.js` derives the
iOS URL scheme from the Google iOS client ID automatically, so you never have to
edit the native project.

| Key | Where it comes from | Needed for |
| --- | --- | --- |
| `googleWebClientId` | Google Cloud → Credentials → **Web** OAuth client | web build + the API's ID-token check |
| `googleIosClientId` | Google Cloud → Credentials → **iOS** OAuth client | iOS builds |
| `googleAndroidClientId` | Google Cloud → Credentials → **Android** OAuth client | Android builds |
| `facebookAppId` | Meta app dashboard | both platforms |

`googleWebClientId` and `facebookAppId` are already set.

## Google

1. Google Cloud Console → **APIs & Services → Credentials → Create credentials →
   OAuth client ID**.
2. Create **two** clients (the web one already exists):
   - **iOS** — bundle ID `com.vedicpatro.mobile`
   - **Android** — package `com.vedicpatro.mobile` plus the signing SHA-1
     (`eas credentials` prints it, or `keytool -list -v -keystore ...`)
3. Paste the IDs into `app.json → expo.extra`:
   ```json
   "googleIosClientId": "…apps.googleusercontent.com",
   "googleAndroidClientId": "…apps.googleusercontent.com"
   ```
4. Rebuild the dev client (`npx expo run:ios` / `npx expo run:android`). The
   reversed-client URL scheme is added for you from the iOS client ID.

For the **web** build and for **dev builds that only have `googleWebClientId`**, the
same **Web** OAuth client must list mobile redirect URIs (the web site uses
`/auth/google/callback`; Expo uses `/oauthredirect` or a custom scheme):

```bash
node scripts/print-google-oauth-setup.cjs
```

Typical entries under *Authorized redirect URIs*:

- `http://localhost:8081/oauthredirect` (Expo web / Metro default)
- `http://localhost:19006/oauthredirect` (older Expo web port)
- `vedicpatro:/oauthredirect` (iOS/Android dev or production build)

Under *Authorized JavaScript origins* for web: `http://localhost:8081` (and your
production web origin if you ship Expo web).

The app logs `[Google OAuth] redirect URI:` in dev; the sign-in sheet lists the
same checklist if Google returns `redirect_uri_mismatch`.

**Google sign-in cannot work in Expo Go** — Expo Go runs under
`host.exp.Exponent`, so an OAuth client registered for `com.vedicpatro.mobile`
will always be rejected. Use a development build. The app detects Expo Go and
shows this explanation instead of a button that would fail.

## Facebook

1. Meta app dashboard → **Facebook Login → Settings**.
2. Add these to *Valid OAuth Redirect URIs*:
   - `fb1044570391345268://authorize` (native)
   - your web origin + `/` (web build only)
3. Under **Settings → Basic**, add the iOS bundle ID `com.vedicpatro.mobile` and
   the Android package `com.vedicpatro.mobile` with its key hash.
4. No code change — `fb<appId>` is already registered as a URL scheme in
   `app.json`, and the Meta *app secret* is only ever used server-side, never in
   the app bundle.

## Sign in with Apple (required on the App Store)

Apple Guideline 4.8: if Google or Facebook sign-in is offered on iOS, **Sign in
with Apple** must be offered with equal or greater prominence. The iOS button
is the official `AppleAuthenticationButton` and is listed first.

1. Apple Developer → Identifiers → `com.vedicpatro.mobile` → enable **Sign In
   with Apple**.
2. Rebuild (`eas build --profile production --platform ios` or a local
   `npx expo run:ios`). The `ios.usesAppleSignIn` entitlement is already in
   `app.json`.
3. The API verifies the identity token at `POST /auth/apple` (audience
   `com.vedicpatro.mobile`). Deploy that API before review.

Apple is iOS-only. Android keeps Google / Facebook / email.

## How it is wired

- `lib/auth/oauth-config.ts` reads the public IDs out of `expo.extra`; a button
  renders only when its config is present, matching the web app.
- `components/auth/SocialSignInButtons.tsx` runs the flows through
  `expo-auth-session` (`useIdTokenAuthRequest` for Google, `useAuthRequest` for
  Facebook) and hands the resulting token up.
- `lib/auth/AuthContext.tsx` exchanges that token with the API
  (`POST /auth/google`, `POST /auth/facebook`, `POST /auth/apple`), stores the token pair in
  `expo-secure-store` and loads `/auth/me`.

So the API contract is identical to the web app's; only the token *acquisition*
differs per platform.
