# Releasing the mobile app (iOS + Android)

One command builds both apps on EAS and submits them. The defaults are deliberately safe:
**nothing reaches the public stores by itself.**

| Platform | What `npm run release` does | Goes public when… |
|---|---|---|
| iOS | builds, uploads to **TestFlight** (App Store Connect) | you press *Submit for Review* in App Store Connect |
| Android | builds, uploads to the Play **internal** track as a **draft** | you promote it in Play Console |

Build numbers (iOS `buildNumber`, Android `versionCode`) are raised automatically by EAS
(`appVersionSource: remote`, `autoIncrement: true`). You only change `version` in
`apps/mobile/app.json` when you want users to see a new version number.

## One-time setup

**Google Play** (needed for Android submit)
1. Play Console → *Setup → API access* → create/link a Google Cloud **service account**, grant it
   release permission for this app.
2. Create a JSON key for that service account.
3. Expo dashboard (or `npx eas credentials -p android`) → *Credentials → Android →
   Google Service Account Key for EAS Submit* → upload the JSON. The key lives in EAS, **not in the repo**
   (`store/secrets/*.json` is git-ignored anyway).

**Apple** (needed for iOS submit)
- The first `release:ios` asks for your Apple ID, or an App Store Connect API key — let EAS store it.
  Optionally put the app's numeric id in `eas.json` → `submit.production.ios.ascAppId` to skip a prompt.

## Every release

```bash
cd apps/mobile
npm run release                # asks: patch / minor / major / none, shows the plan, asks to confirm
npm run release -- minor       # or name the bump: patch, minor, major, none, or an exact 1.4.0
npm run release -- patch --dry-run   # show the plan, change nothing
```

`release` does the whole thing in order:
1. runs the **preflight** (`npm run release:check`: git clean, API up, types, EAS login) and stops on a ✗;
2. shows the plan and asks you to confirm, e.g.
   `version 1.1.0 → 1.2.0 · iOS build 3 → 4 · Android code 13 → 14`;
3. writes the new **version** into `app.json` (and `apps/mobile/package.json` + the lockfile entry, so they never drift),
   commits it as `release: mobile v1.2.0` and tags `mobile-v1.2.0`;
4. builds **iOS and Android** on EAS and submits them (iOS → TestFlight, Android → internal track, draft);
5. pushes the commit and tag so git matches what shipped (`--no-push` to skip).

**Version vs build number.** The *version* (1.2.0) is what users see; you choose the bump. The *build number* (iOS `buildNumber`,
Android `versionCode`) is raised by EAS automatically on every build and never goes backwards — it is not stored in the repo.
Use `none` to rebuild the same version (e.g. after a failed submit); the build number still goes up.

One platform: `npm run release:ios` / `npm run release:android` (same prompts). Builds queue on EAS and take ~10–20 min:
<https://expo.dev>.

**Before pressing release:** commit your work (EAS packs your local files, so uncommitted changes would ship — the preflight
refuses to continue), and make sure the production API is the version the app expects
(`https://www.vedicpatro.com/api/v1`).

## After the builds finish

- **iOS:** the build appears in TestFlight after Apple's processing (~10–30 min). Test it on a real iPhone, then in
  App Store Connect select the build for the version and *Submit for Review*. Paste the reviewer notes and a
  verified **demo account** from `apps/mobile/store/app-review-reply.md` (fill its TODOs first — missing demo
  credentials is the usual reason for "Guideline 2.1 – Information Needed").
- **Android:** Play Console → Testing → Internal testing → review the draft release and roll it out.
  To go public, promote that release to Production in the console.

### Skip the internal step (Android straight to the production track)
```bash
npm run release:android:production-track
```
(It asks for the version bump like any release.) This still creates a **draft** on the Production track (profile `production-track` in `eas.json`); it only goes live after you
send it for review/roll it out in Play Console. To make it fully automatic, set `releaseStatus` to `"completed"`
in that profile — only do that deliberately.

## If something fails
- **Build passed, submit failed** (usually credentials): fix them, then resubmit the finished build without rebuilding:
  `npx eas submit -p android --latest --profile production` (or `-p ios`).
- **Android versionCode already used:** raise it once — `npx eas build:version:set -p android -e production`.
- **Build failed after the version commit:** the commit stays; the script prints the exact undo command (`git reset --hard HEAD~1 && git tag -d mobile-vX.Y.Z`), or just fix the cause and rerun with `none`.
- **Rolling back:** stores never auto-update users to a draft/TestFlight build, so an unwanted build is simply not promoted.
