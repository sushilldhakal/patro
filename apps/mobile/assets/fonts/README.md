# Noto Sans Devanagari, semi-condensed

`NotoSansDevanagari-SemiCondensed-{400,500,600,700}.ttf` are static instances of the Noto Sans Devanagari variable font (google/fonts, `ofl/notosansdevanagari`) at width 87.5%, the width the website loads (`index.html`: `wdth@87.5`). The `@expo-google-fonts` files are normal width (about 9% wider), which made every app line wrap differently from the website.

Licence: SIL Open Font License 1.1, Copyright 2022 The Noto Project Authors (https://github.com/notofonts/devanagari).

Made with:
`fonttools varLib.instancer NotoSansDevanagari[wdth,wght].ttf wdth=87.5 wght=<400|500|600|700> -o NotoSansDevanagari-SemiCondensed-<w>.ttf`

Each file then gets its own name table (family `Noto Sans Devanagari SemiCondensed`, PostScript `NotoSansDevanagariSemiCondensed-{Regular,Medium,SemiBold,Bold}`). The instancer leaves every instance named `NotoSansDevanagari-Regular`, and iOS registers fonts by PostScript name, so it kept one face and every bold, semibold and medium in the app drew at regular weight. Rename them again whenever they are regenerated.

They are loaded in `app/_layout.tsx` under the same family names as before (`NotoSansDevanagari_400Regular` ... `_700Bold`), so nothing else changes.
