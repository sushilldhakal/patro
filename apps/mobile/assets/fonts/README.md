# Noto Sans Devanagari, semi-condensed

`NotoSansDevanagariSemiCondensed-{Regular,Medium,SemiBold,Bold}.ttf` are static instances of the Noto Sans Devanagari variable font (google/fonts, `ofl/notosansdevanagari`) at width 87.5%, the width the website loads (`index.html`: `wdth@87.5`). The `@expo-google-fonts` files are normal width (about 9% wider), which made every app line wrap differently from the website.

Licence: SIL Open Font License 1.1, Copyright 2022 The Noto Project Authors (https://github.com/notofonts/devanagari).

Made with:
`fonttools varLib.instancer NotoSansDevanagari[wdth,wght].ttf wdth=87.5 wght=<400|500|600|700> -o NotoSansDevanagari-SemiCondensed-<w>.ttf`

Each file then gets its own name table (family `Noto Sans Devanagari SemiCondensed`, PostScript `NotoSansDevanagariSemiCondensed-{Regular,Medium,SemiBold,Bold}`). The instancer leaves every instance named `NotoSansDevanagari-Regular`, and iOS registers fonts by PostScript name, so it kept one face and every bold, semibold and medium in the app drew at regular weight. Rename them again whenever they are regenerated.

Each file is named after its PostScript name, and that name is the font family the app uses (`lib/fonts.ts`, `fontFamily.native` in the design tokens). The expo-font plugin in `app.json` builds them into the iOS and Android apps, which register them at launch; the web build loads them in `app/_layout.tsx`. Changing these files needs a new native build (and a version bump, so older builds don't take an update that names fonts they lack).
