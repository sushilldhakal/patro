# Shared code (website + mobile app)

Everything in this folder is used by **both** the website (this repo) and the
mobile app (`vedic-patro-mobile`). This folder is the one place to edit it.

- Import it as `@/shared/<file>` — the same path works in both apps.
- The mobile app keeps a generated copy in its own `shared/` folder. After
  changing anything here, run `npm run shared:sync` in `vedic-patro-mobile`
  (it copies these files over) and commit both repos.
- Files here must be plain TypeScript: no React, React Native or browser APIs,
  and imports only from other files in this folder (`./x`). `npm run
  shared:check` enforces this and runs as part of `npm run build`.
