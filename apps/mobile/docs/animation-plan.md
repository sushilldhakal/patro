# Motion plan — phone, iPad, Android tablet

Motion only. No colour, spacing, type, radius, layout or copy changes: every
screen looks exactly as it does today when it is standing still.

Sources: the `mobile-app-ui-design` skill (peak-end, feedback loops, motion as
a trust signal) and the `expo-animation` skill (frequency gate, threads,
springs, reduced motion). Where they disagree, the frequency gate wins — a
calendar is opened many times a day, so most motion has to be small.

## Status (2026-10-22)

Built, phases 0–3. Shared values and curves: `@vedic-patro/ui/motion`
(`packages/ui/src/native/motion.ts`). Month-grid motion and today's ring:
`packages/ui/src/kit/shell/native/month-motion.tsx`. Swipe-to-change-month is
on (`MONTH_SWIPE_ENABLED` in `apps/mobile/components/home/calendar-grid-layout.ts`).
Haptics and 120 fps need a store build made after `b919a92a`; older builds get
the motion over the air without vibration.

## Stack

| Need | Use | Status |
| --- | --- | --- |
| Press, toggles, state changes | Reanimated 4 CSS transitions | installed (4.5.1), unused |
| Mount / unmount / reflow | Reanimated layout animations | installed |
| Drag, swipe, scrub | Gesture Handler + shared values | installed (2.32) |
| Screen changes | Expo Router native stack `animation` | in use |
| Haptics | `expo-haptics` | **new — needs a native build** |
| Illustration / celebration | Lottie | not now |
| Wheel / sky effects | Skia | not now; only if the wheel needs it |

No Moti, no second motion library. Core `Animated` (AppHeader drawer,
BottomSheetModal, SkeletonPulse, WheelChart zoom) moves to Reanimated as each
piece is touched.

## Foundation (phase 0)

1. **Motion tokens** — extend `motion` in `packages/design-tokens/src/scale.ts`
   with the native values, so no file hand-types a curve:
   - `easeOut` `bezier(0.23, 1, 0.32, 1)` — entering / exiting
   - `easeInOut` `bezier(0.77, 0, 0.175, 1)` — moving on screen
   - `easeSheet` `bezier(0.32, 0.72, 0, 1)`
   - springs: `settle {400, 1}`, `snap {400, 0.8}`, `sheet {300, 0.8}`
   - durations stay `fast 120 / standard 200 / slow 320`
2. **`lib/motion.ts`** — `useMotion()` returning the reduced-motion flag
   (`useReducedMotion`) and helpers; every animation passes
   `reduceMotion: ReduceMotion.System`. Reduced = keep fades and colour, drop
   translate / scale / overshoot.
3. **`lib/haptics.ts`** — `tick()` (selection), `snap()` (light impact),
   `success()` / `error()`; no-ops on web and when haptics are unavailable.
4. **120 fps** — add `CADisableMinimumFrameDurationOnPhone: true` to the iOS
   `infoPlist` (not set today). ProMotion iPads and iPhones are capped at
   60 fps without it.

Items 3 and 4 are native: they ship in a TestFlight / Play build, not an EAS
update. Everything after phase 0 is JS and can go out over the air.

## Phase 1 — feedback (tens of times a day: ≤150 ms or nothing)

| Where | Motion | Spec |
| --- | --- | --- |
| `Pressable` in `packages/ui` (buttons, chips, icon buttons, quick-link tiles, calendar day cells, sidebar items) | scale on press-in | `0.97`, 120 ms ease-out, CSS transition. Full-width list rows highlight their background instead of scaling |
| Floating nav items | same press scale; **no slide between tabs** | tabs are peers |
| Segmented controls (अहोरात्र/दिन-रात, BS/AD era, theme, language chips) | active fill crossfades | 150 ms; `tick()` on change |
| Date stepper ‹ › and the year/month pickers | `tick()` per step | haptic only, the values already change |
| Switches | platform default | nothing added |
| iPad with trackpad / pencil hover | background highlight on hover | `onHoverIn/Out`, 120 ms — iPadOS has a pointer, phones do not |

## Phase 2 — spatial and state (occasional: standard motion)

**Navigation**
- Tabs: `animation: 'none'` (stays as it is).
- Pages opened from the iPad **sidebar rail**: `animation: 'fade'`, 200 ms. The
  rail stays put and its pages are siblings, so a push slide implies depth
  that is not there. Phones keep the current `fade_from_bottom`.
- Rail selection: the active highlight moves to the tapped item
  (absolute, childless pill, `translateY`, 200 ms ease-in-out) instead of
  jumping. Section expand / collapse: chevron rotates 180 ms, items use
  `LinearTransition` (the rail is not virtualised).

**Changing the date** (the core action of the app)
- Home month grid, prev / next month: old month fades out, new one fades in
  with an 8 px shift in the direction of travel, 200 ms ease-out. Interruptible:
  tapping again mid-flight starts the next month from where it is.
- Optional, behind a flag: horizontal swipe on the grid to change month
  (`Gesture.Pan`, commit on velocity **or** 30 % distance, spring `snap` with
  the finger's velocity, `snap()` haptic when it commits).
- Panchanga day step: tithi / nakshatra / yoga values and the
  अशुभ/शुभ/ग्रह cards crossfade 150 ms instead of popping. The दिन-चक्र chart
  itself redraws without motion — it is data, not decoration.

**Sheets and menus**
- `BottomSheetModal` and the kit `Sheet`: Reanimated spring `sheet` in, scrim
  fades 200 ms, drag-to-dismiss with rubber-banding and velocity handoff.
- Account menu popover: from the avatar's corner, `scale 0.95 → 1` + opacity,
  180 ms ease-out; out 120 ms.
- Header drawer (`AppHeader`): same timing it has today, moved to Reanimated so
  it can follow a finger.

**Loading**
- Skeleton → content: content fades in 200 ms over the skeleton instead of
  replacing it in one frame. `SkeletonPulse` moves to a Reanimated CSS
  keyframe loop so the pulse runs on the UI thread.
- Pull to refresh stays `RefreshControl`.

**Orientation (iPad)**
- Rotation is animated by the OS. The card grids reflow without extra motion;
  animating dozens of cards on rotate costs frames for nothing.

## Phase 3 — delight (rare: the peak and the end)

The peak of this app is "what is today like?"; the end is setting a reminder.

| Moment | Motion |
| --- | --- |
| First open of the day: today's cell | one soft ring pulse (opacity + `scale 0.95→1`), once per day |
| Panchanga wheel, first draw in a session | settles into place from −10°, 600 ms ease-out, once |
| Reminder saved (alarm icon on a शुभ/अशुभ card) | icon `scale 0.9 → 1` with `settle` spring + `success()` |
| Festival / public-holiday day opened | the highlight card fades up 8 px, 240 ms |
| Kundali generated | chart fades in 240 ms, `success()` |

Nothing loops, nothing plays twice in a session, nothing celebrates an
action the user did not take.

## Never

- Sliding tab switches, parallax on scroll, numbers that count up.
- Entrance staggers on every month change or every page visit.
- `height` / `width` / `margin` / `top` animation (except a childless
  absolute pill).
- `setState` or `scheduleOnRN` per frame; `PanResponder`; `Easing.in`.
- A haptic without a visual, or on scroll.

## Rollout

1. Phase 0 + phase 1 press feedback — one native build.
2. Phase 2 navigation, sheets, date change — OTA.
3. Phase 2 loading + iPad rail — OTA.
4. Phase 3 — OTA.

Each step: judge on a release build on the slowest device (an older Android
tablet and a non-ProMotion iPad), with Reduce Motion on and off. Flick the
sheets, interrupt the month change mid-flight, rotate the iPad mid-animation.
