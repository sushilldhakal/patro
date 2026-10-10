# Aakash Gochar: what the mobile 3D sky is missing

The web's sky is 4,647 lines across four files; this app's is 2,794 across three.
That gap was being read as "mobile is 1,850 lines behind", which turned out to be
the wrong shape of the problem. This is the audit.

Measured against `dhakal-patro` at `2119f3d`.

| | Web | Mobile |
| --- | --- | --- |
| `AakashGocharScene.tsx` | 2,374 | 1,718 |
| `AakashGocharSky.tsx` | 1,947 | 1,074 |
| `SkyDateTimePicker.tsx` | 291 | — (uses `components/patro-date/`) |
| `AakashGocharEntryCard.tsx` | 35 | — |

## The headline

**Most of what looks missing is built and unreachable.** The mobile *scene*
already implements the horizon view, the alt-az grid, the pole-star field and
the axial-tilt marks — all of it, correctly, with the same code paths the web
has. The mobile *shell* just never exposes them. Three of those layers even
default to `true`, so they are on screen right now with no way to turn them off.

That reframes the work: the expensive half (the geometry) is done, and what is
absent is chips.

> **Status:** everything below has since been closed. Kept as the record of what
> the gap actually was, since the line-count reading of it was wrong.

## Genuinely absent

### 1. Eclipses — *done*

The one substantial feature gap. Was web-only, in both files:

- `eclipseOf` / `circSep` — the angular test for whether Sun, Moon, Earth and a
  node share a line, and how nearly.
- `makeUmbra` / `placeUmbra` / `MoonEclipseFx` — the shadow drawn on the Moon
  and the Sun's disc covered.
- `EclipseState` on `SkySample`, and the banner that names a
  **सूर्यग्रहण** / **चन्द्रग्रहण** when one happens.

The related phase flashes — **औंसी** and **पूर्णिमा** as the Moon passes syzygy
— are also web-only.

Note the sim in the Learn playground already does this test (`ECLIPSE_LAT_LIMIT_DEG`
and the syzygy window in `DaySimScene`), so the astronomy is in this repo twice
over. It is the sky's own drawing of it that is not.

### 2. The focus picker — *done*

Web has a "के पछ्याउने?" menu: point the camera at Earth, at your own place on
the globe, or at any one graha. Mobile has only `lockCenter`, which follows
whichever graha you last tapped — so Earth and "your location" are not
selectable targets. `FocusKey` is exported by the mobile scene and never used by
the mobile shell.

### 3. काठमाडौँ रेखा — *done*

`makePrimeMeridian` and the `primeMeridian` toggle are web-only in both layers —
the meridian noon is reckoned against, the same line the Learn playground draws
on its globe. Not in the mobile scene at all.

### 4. Belt granularity — *done*

Web splits the belt three ways — **राशि**, **नक्षत्र**, **महिना** — each its own
chip. Mobile has one **राशि/नक्षत्र** toggle and no बिक्रम month ring at all.
Mobile does have a separate **तारापुञ्ज** toggle for the asterisms, which the
web folds into its nakshatra layer; that one is mobile's own and better.

### 5. The sankranti HUD — *done*

Web keeps a "सूर्य राशि · महिना" readout and flashes **सङ्क्रान्ति** when the
Sun crosses a boundary. Mobile has neither.

## Built but unreachable

Present and correct in `components/sky3d/AakashGocharScene.tsx`, with no control
in `AakashGocharSky.tsx`:

| Feature | Where it lives | State |
| --- | --- | --- |
| ~~Horizon view~~ | — | **Audit error.** Neither app offers a horizon chip; both only switch space ↔ globe. The code is dead on the web too, so this is not a parity gap. |
| **Alt-az grid** | `toggles.grid`, lines 1144–1178 | Defaults on, no chip to turn it off. |
| **ध्रुव तारा field** | `toggles.poleStars`, lines 1101–1315 | Same. |
| **अक्ष झुकाव marks** | `toggles.tilt`, lines 1080–1317 | Same. |

Three chips landed all of the live ones. **Done** — see the Layers sheet.

## Not missing — deliberately different

- **राहु and केतु.** Web billboards the app's graha SVG through a canvas
  element; mobile draws them as torus rings, because there is no canvas element
  to rasterise into. Same call the Learn playground made, and for the same
  reason. Six lines of geometry replace ~70 of web (`NodeSprite`, `useSvgTexture`).
- **The date picker.** Web has a bespoke 291-line `SkyDateTimePicker`; mobile
  reuses `components/patro-date/`, which is the app's single source for this and
  what `AGENTS.md` requires.
- **Tropic lines** (कर्कट/मकर रेखा) — present on both, contrary to a first read
  of the string diff.
- **Speed ladder** — the same seven rungs, minus web's bottom `१ सेकेन्ड/से`.
  Trivial.

## Where the 1,850 lines actually go

Roughly, and not to be over-read:

- eclipse machinery and its banners — the largest single block
- the focus menu, the missing chips, the sankranti HUD
- `SkyDateTimePicker`, which mobile satisfies from `patro-date/` instead
- `NodeSprite` + `useSvgTexture`, which mobile replaces with six lines
- web-only concerns with no mobile counterpart: SEO metadata, prerendering
  hooks, the entry card, related-page links

So the line gap overstates the feature gap by a good margin, and the feature gap
is smaller again once the unreachable layers are wired up.

## What is left

Nothing on this list. The remaining differences are the deliberate ones above —
torus nodes instead of rasterised SVG, `patro-date/` instead of a bespoke
picker — plus web-only concerns (SEO, prerendering) that have no mobile meaning.

Two things worth knowing rather than doing:

- **The horizon view is dead code on both platforms.** Neither shell can enter
  it. That is a shared question, not a parity gap, and it is worth deciding
  once: wire it up in both, or delete it from both.
- **Frame rate is still unmeasured**, and the sky is heavier than the Learn
  scenes. The playground's meter (`docs/learn-playground.md`) is the tool; the
  sky has no equivalent yet.
