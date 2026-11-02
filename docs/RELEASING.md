# Releasing the mobile app (iOS + Android)

One command builds both apps and submits them. The defaults are deliberately safe:
**nothing reaches the public stores by itself.**

## Where the builds run (and why it costs no EAS build credits)

The apps are built on **GitHub Actions runners** with `eas build --local`, not on EAS's build
servers, so they **do not count against the EAS plan's monthly build limit**. Because this
repository is public, GitHub-hosted runner minutes (Linux and macOS) are free and not capped.
Only the upload to the stores (`eas submit`) goes through EAS.

| Workflow | Runs on | Builds |
|---|---|---|
| `.github/workflows/mobile-release.yml` | macOS + Ubuntu runners | store builds (iOS `.ipa` → TestFlight, Android `.aab` → Play), or `preview` APK/IPA as downloadable artifacts |
| `.github/workflows/testflight.yml` | macOS runner | the `testflight` profile on native changes to main |
| `.github/workflows/eas-update.yml` | Ubuntu runner | JS-only OTA updates (no native build at all) |

Signing keys and store credentials stay in EAS credentials; the runner downloads them with the
`EXPO_TOKEN` secret. Runner builds are not listed under *Builds* on expo.dev; the binary is in the
workflow run's *Artifacts* (kept 14 days), and the submission shows under *Submissions* as before.

Caveats: if this repository becomes **private**, GitHub's free minutes become limited (and macOS
minutes count 10×), so this would no longer be free. `npm run release:cloud` still builds on EAS's
servers if a runner build ever fails for a reason you can't fix quickly.

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
4. pushes the commit and tag, then starts **Mobile release (built on GitHub)** on that tag with the
   `gh` CLI (install it and `gh auth login` once). That workflow builds **iOS and Android** on GitHub's
   runners and submits them (iOS → TestFlight, Android → internal track, draft). Without `gh`, the
   script prints what to pick in *Actions → Mobile release → Run workflow*.

`npm run release:cloud` (`--cloud`) is the old route: it builds on EAS's servers with `--auto-submit`
and uses the monthly EAS build credits.

**Version vs build number.** The *version* (1.2.0) is what users see; you choose the bump. The *build number* (iOS `buildNumber`,
Android `versionCode`) is raised by EAS automatically on every build and never goes backwards — it is not stored in the repo.
Use `none` to rebuild the same version (e.g. after a failed submit); the build number still goes up.

One platform: `npm run release:ios` / `npm run release:android` (same prompts). Builds take ~20–40 min; follow them
with `gh run watch` or in the repository's *Actions* tab.

To build on your own machine instead (also free): `npm run build:android:local` or, on a Mac with Xcode,
`npm run build:ios:local`; the file lands in `apps/mobile/build/`, then
`npx eas submit -p android --path build/vedic-patro.aab` (or `-p ios --path build/vedic-patro.ipa`).

**Before pressing release:** commit your work (the runner builds what is pushed; the preflight refuses to continue with
uncommitted changes), and make sure the production API is the version the app expects
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
  download the `.aab`/`.ipa` from the workflow run's *Artifacts* and run
  `npx eas submit -p android --profile production --path <file>` (or `-p ios`).
- **Runner build failed:** the log is in the workflow run. Rerun it from the Actions tab once fixed;
  `npm run release:cloud -- none` builds the same version on EAS's servers as a fallback.
- **Android versionCode already used:** raise it once — `npx eas build:version:set -p android -e production`.
- **Build failed after the version commit:** the commit stays; the script prints the exact undo command (`git reset --hard HEAD~1 && git tag -d mobile-vX.Y.Z`), or just fix the cause and rerun with `none`.
- **Rolling back:** stores never auto-update users to a draft/TestFlight build, so an unwanted build is simply not promoted.
