# 3D sky (three.js) — feasibility spike

**Verdict: yes, it works on this stack.** Verified by building it, not by reading
version tables — the scene type-checks, and both the web bundle and the iOS
Hermes bundle build with three.js in the graph.

## What was proven

| Check | Result |
| --- | --- |
| Peer deps against Expo 54 / RN 0.81 / React 19.1 | clean, no overrides |
| `tsc --noEmit` | passes |
| `expo export --platform web` | builds |
| `expo export --platform ios` | builds (9.15 MB Hermes bytecode) |
| Works in Expo Go | yes — `expo-gl` ships inside Expo Go |

Versions installed (SDK-54 pinned where it matters):

```
expo-gl            16.0.10   ← pinned by SDK 54, not the "latest" 57
three              0.185.1
@react-three/fiber 9.7.0     ← v9 is the React 19 line
```

`@react-three/fiber` must be imported from **`@react-three/fiber/native`** on
mobile; that entry renders into an `expo-gl` `GLView` instead of a DOM canvas.

## Cost

Adding three.js grew the web JS bundle from **5.98 MB → 7.04 MB** (about
**+1.06 MB**). That is the one real trade-off. Mitigation, if it matters: lazy
`React.lazy` the 3D screens so three.js only loads when a user opens one, which
keeps the calendar-first startup path unchanged.

## What is in the spike

- `lib/sky3d/geocentric-model.ts` — pure math. Ecliptic (longitude, latitude) →
  cartesian, belt divisions, rashi/nakshatra/pada lookups, schematic shell radii
  and the graha palette.
- `components/sky3d/GeocentricSky.tsx` — the scene: Earth at the origin with its
  23.44° tilted axis, a shell per graha, the **12 × 30° rashi belt**, the
  **27 × 13°20′ nakshatra belt** with 108 pada ticks, the ecliptic circle, and a
  sight line projecting each graha onto the belt. Drag to orbit, pinch to zoom,
  tap a graha for its rashi / nakshatra / retrograde readout.
- `app/sky3d-demo.tsx` — a spike screen wired to the live gochar longitudes.
  Deliberately not in the tab bar.

## Why the data side is already solved

The API returns **sidereal ecliptic longitude** per graha (`gochar[key].longitude`,
and the same field on kundali varga points and graha-sthiti rows). That is
exactly the input a geocentric model needs, so:

- no ephemeris math runs on device — same as the 2D wheel;
- the 3D view and the 2D wheel read the **same source of truth**, so they can
  never disagree;
- `shara_deg` from graha-sthiti gives true ecliptic latitude, which is what lets
  a graha sit *off* the ecliptic plane — the thing a 2D wheel structurally
  cannot show.

## Honest caveats

- **The radii are schematic, not to scale.** A true-distance geocentric model
  puts Saturn ~40× further out than the Moon and renders as a dot next to empty
  space. The shells encode the classical Moon → Saturn ordering instead, which
  is what the chart actually teaches. Worth a caption on screen so it never
  reads as a distance claim.
- **Text labels in the belts** (rashi/nakshatra names) are not in the spike.
  `troika-three-text` or pre-rendered texture atlases both work; the atlas route
  is better here because the labels are Devanagari and a fixed set of 39.
- Performance was not measured on a real device — that needs a dev build on
  hardware. A scene this small (a few hundred triangles plus lines) should be
  trivially 60fps, but "should" is not "measured".

## Where it fits the learn section

The learn articles currently lean on 2D SVG diagrams. These are the ones where
3D earns its place rather than just looking nicer:

1. **Why a graha "moves backwards"** — retrograde is a projection artefact.
   Orbiting the camera while the sight line sweeps back over the belt shows the
   cause; a 2D wheel can only show the symptom.
2. **Ecliptic vs the Moon's 5° tilt** — draw the Moon's inclined path against the
   ecliptic and the nodes (Rahu/Ketu) fall out as the two crossings, which makes
   eclipse seasons self-evident.
3. **Rashi vs nakshatra division** — the same circle cut 12 ways and 27 ways,
   stacked as concentric belts, makes the 108-pada structure legible at a glance.
4. **Ayanamsha / precession** — animate the sidereal frame drifting against the
   tropical one.

Reusing one `GeocentricSky` with different props (hide belts, show one graha's
path, animate a date range) covers all four, so it is one component rather than
four diagrams.

## Suggested next step

Keep this branch's spike, run it on a physical device, and confirm frame rate
and battery on a mid-range Android. If that looks good, the first production use
should be a single learn article (retrograde is the highest-value one) rather
than replacing the existing 2D wheel — the wheel is dense and precise, and the
3D view is explanatory. They complement rather than compete.
