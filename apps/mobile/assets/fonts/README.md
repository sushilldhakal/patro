# Noto Sans Devanagari, semi-condensed

`NotoSansDevanagariSemiCondensed-{Regular,Medium,SemiBold,Bold}.ttf` are static instances of the Noto Sans Devanagari variable font (google/fonts, `ofl/notosansdevanagari`) at width 87.5%, the width the website loads (`index.html`: `wdth@87.5`). The `@expo-google-fonts` files are normal width (about 9% wider), which made every app line wrap differently from the website.

Licence: SIL Open Font License 1.1, Copyright 2022 The Noto Project Authors (https://github.com/notofonts/devanagari).

Made with:
`fonttools varLib.instancer NotoSansDevanagari[wdth,wght].ttf wdth=87.5 wght=<400|500|600|700> -o NotoSansDevanagari-SemiCondensed-<w>.ttf`

Each file then gets its own name table (family `Noto Sans Devanagari SemiCondensed`, PostScript `NotoSansDevanagariSemiCondensed-{Regular,Medium,SemiBold,Bold}`). The instancer leaves every instance named `NotoSansDevanagari-Regular`, and iOS registers fonts by PostScript name, so it kept one face and every bold, semibold and medium in the app drew at regular weight. Rename them again whenever they are regenerated.

Each file is named after its PostScript name, and that name is the font family the app uses (`lib/fonts.ts`, `fontFamily.native` in the design tokens). The expo-font plugin in `app.json` builds them into the iOS and Android apps, which register them at launch; the web build loads them in `app/_layout.tsx`. Changing these files needs a new native build (and a version bump, so older builds don't take an update that names fonts they lack).

## Adishila Vedic (mantra text only)

`AdishilaVedic-Regular.ttf` is Adishila Vedic (https://adishila.com/fonts, the 2022 "Adishila Vedic" release), cut down with `fonttools subset` to Devanagari, Devanagari Extended, Vedic Extensions and Latin (with all layout features). Noto lacks several Vedic signs (ꣳ, ᳖ and others) that drew as "?" boxes on iOS. The `font-vedic` class (on `documentsClasses.verseText`) selects it; the app loads it at runtime in `app/_layout.tsx`, the website through `@font-face` in `apps/web/src/index.css` (`apps/web/public/fonts/adishila-vedic-Regular.woff`).

Terms (adishila.com/fonts): free to use in products, apps and websites, commercial or not; no selling or renting, and the page says not to host or distribute the font files themselves. Embedding it in the app and site is the grey area; ask the publisher through their Contact page if that matters to you.
