# Chapter voiceovers

Drop an audio file here and the guided tour narrates itself. Nothing else to
change — no code, no config, no rebuild of the chapter data. The player probes
for the file on load; if it is there the recording owns the clock (the keyframes
are sampled off `audio.currentTime`), and if it is not the chapter runs the same
animation on its own timer.

## Where a file goes

```
public/learn/audio/<lang>/<track>/<chapter>.mp3     ← preferred
public/learn/audio/<track>/<chapter>.mp3            ← one recording, both languages
```

`<lang>` is `ne` or `en`. `.ogg` works too, and is tried after `.mp3`; `.m4a`
after that, so a phone or Voice Memos recording can be dropped in as-is.

The language folder wins when both exist, so you can record Nepali first and
leave the shared folder holding an English track until the rest is done.

Paths are resolved against the app's base URL, so this keeps working if the site
is ever served from a sub-path.

## The tracks and their chapters

`calendar` — the full syllabus. Not wired to a page yet; kept ready for one
that wants it:

| # | file | chapter |
|---|------|---------|
| 1 | `welcome.mp3` | Welcome |
| 2 | `stellar.mp3` | Stellar Days |
| 3 | `solar.mp3` | Solar Days |
| 4 | `elliptic-orbit.mp3` | Earth's Elliptic Orbit |
| 5 | `axial-tilt.mp3` | Earth's Axial Tilt |
| 6 | `reality.mp3` | A Realistic Picture |
| 7 | `week.mp3` | The Seven-Day Week |
| 8 | `solar-month.mp3` | Sankranti to Sankranti |
| 9 | `lunar-month.mp3` | The Moon's Two Months |
| 10 | `year.mp3` | 365 Days, 366 Turns |
| 11 | `rashi-belt.mp3` | How the Rashi Belt Forms |
| 12 | `nakshatra-belt.mp3` | The Nakshatra Belt |
| 13 | `pole-star.mp3` | The Pole Star Changes |
| 14 | `tithi.mp3` | Tithi — Twelve Degrees at a Time |
| 15 | `paksha.mp3` | The Two Fortnights |
| 16 | `adhik-maas.mp3` | Why There Is a Leap Month |
| 17 | `five-limbs.mp3` | The Five Limbs Together |
| 18 | — | Playground (free explore, no narration) |

So the Nepali welcome track is:

```
public/learn/audio/ne/calendar/welcome.mp3
```

`day` — the faithful port of the Minute Labs lab on its own, ending at its
`/playground`. Same first six filenames, under `day/` instead of `calendar/`.
This is what `/learn/earth-rotation-day` and `/learn/what-is-a-day` both run.

## Names from the original lab

Chapters 2, 3 and 4 also answer to the filenames the Minute Labs lab publishes
its own tracks under, so a recording taken or re-cut from there needs no
renaming:

| chapter | also found as |
|---------|---------------|
| `stellar` | `stellar-days` |
| `solar` | `solar-days` |
| `elliptic-orbit` | `eccentric-orbit` |

The chapter's own name is checked first at each level; the alias only answers
when nothing is there under it.

## Timing

Chapters 1–6 are timed beat-for-beat to the original lab, so a recording made
against it locks straight on. Chapters 7–17 are timed to placeholder beats at
round seconds — record freely, then open the matching file in
`src/lib/learn/calendar-chapters.ts` and move the `at:` times to match what you
said. The `at` / `from` / `duration` values are `mm:ss` or `"12s"`, the same
notation the original uses.

## Pictures a chapter holds up

A chapter can also raise a still image beside the scene (`still:` in the chapter
data, captioned from the string catalogue). Paths are relative to `public/`,
so `illustrations/ursa-major.png` resolves to that file. A path that does not
resolve draws nothing, the same way a missing recording plays nothing — so a
chapter can name a plate before it has been drawn.

The belt and pole-star chapters already use the constellation plates in
`public/illustrations/`.
