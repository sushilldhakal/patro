/**
 * The shared vocabulary every guided chapter is written in.
 *
 * One 3D scene serves the whole Learn library (see {@link ./playground-config}),
 * and a *chapter* is a timed script that drives it: a state the scene opens on
 * and a list of keyframes that move it. This file holds the state's shape and
 * the small helpers a script is written with — nothing about any particular
 * subject, so a new track (the year, the belts, the pole star) is a new data
 * file and no change here.
 *
 * The camera helpers deserve a word. The original Minute Labs lab is
 * orthographic, so its `zoom` magnifies rather than dollies; this scene is a
 * perspective one, so a chapter ported from it names the same `(x, y, z, zoom)`
 * and {@link cam} converts. Keeping the original numbers is what lets a beat be
 * checked against the reference rather than re-eyeballed.
 */

import type {
  CameraState,
  CameraTarget,
  PlaygroundGlobe,
  SimToggles,
} from "@/components/learn/DaySimScene";
import { interval, type Keyframe } from "./chapter-player";

/**
 * Everything a chapter can move.
 *
 * The layer flags come straight from {@link SimToggles}, so a chapter can turn
 * on anything the scene can draw — राशि, नक्षत्र, महिना, Moon, the three clock
 * faces — without this type ever needing to grow. What is listed explicitly is
 * only what the *scene* does not own: the orbit position the tour is driving,
 * the camera, and the chrome around it.
 */
export type ChapterSimState = {
  /**
   * The chapter has given the instruments back.
   *
   * Until this flips the keyframes own the clock and the camera; after it the
   * reader does, and the tour stops writing over them. Every ported chapter
   * ends on one of these.
   */
  handsOff: boolean;
  /** Orbits completed, as a fraction — `1` is one full lap. */
  orbitalPosition: number;
  solarDaysPerYear: number;
  tiltDeg: number;
  eccentricity: number;
  cameraTarget: CameraTarget;
  cameraFollow: boolean;
  /** The equation-of-time plot, over the scene. */
  graphOpen: boolean;
  /**
   * A registered Learn diagram raised over the scene, by id, or `""`.
   *
   * The sim can show where a thing *is*; some points are about a quantity over
   * a year or a cycle, and the library already holds a diagram for most of
   * them. A chapter naming one here gets it as a panel over the canvas rather
   * than needing a bespoke layer in the scene — which is how the week's hora
   * cycle and the pole star's 26,000-year cone are told.
   *
   * @see {@link ./learn-diagrams}
   */
  overlay: string;
  planet: PlaygroundGlobe;
  cameraYaw: number;
  cameraPitch: number;
  cameraDistance: number;
  /** Outline a named mesh — same beats as the original lab (`stellar-day-arc`, `earth`). */
  highlight: string;
  /** Pulse a control on the instrument panel (`settings`, `auto-orbit`, `graph`, …). */
  highlightControl: string;
  /**
   * The corner readout — which राशि the Sun is in, and today's equation of time.
   *
   * Off through the ported day tour, because the original lab has no such
   * thing and the chapters there are about geometry, not about a date. The
   * chapters that *are* about the calendar turn it on: the whole point of
   * watching the Sun cross a boundary is reading which month just began.
   */
  hud: boolean;
  /** The three-column clock readings under the canvas — counts, gaps, day lengths. */
  readings: boolean;
  /**
   * A still picture beside the scene, or `""`.
   *
   * The reference lab has a little television its narrator holds up photographs
   * on — an equation-of-time plot, a stacked analemma — because some of what a
   * chapter says is best answered by a picture of the real sky rather than by
   * the model. This is that slot.
   *
   * The value is a path under `public/`, without a leading slash
   * (`illustrations/ursa-major.png`); it is resolved against the app's base URL
   * at render. A file that is not there draws nothing, so a chapter can name a
   * picture before it has been drawn.
   */
  still: string;
  /** i18n key for the still's caption. Nothing is captioned without one. */
  stillKey: string;
  /**
   * A one-line hint over the scene — i18n key, or `""`.
   *
   * The original raises a snackbar a minute into the welcome chapter to say the
   * view can be zoomed. The same slot serves any "you can try this yourself"
   * beat, which is most of what a guided tour needs to say about its own
   * controls.
   */
  tip: string;
} & SimToggles;

export type Chapter = {
  /** Unique within its track. Also the voiceover's filename — see {@link chapterAudioSources}. */
  id: string;
  /** i18n key under `learn.chapters.<id>` */
  titleKey: string;
  /**
   * i18n key for the part this chapter belongs to — दिन, वार, महिना, …
   *
   * A track that teaches the whole calendar runs to a dozen-odd chapters, and
   * a flat list of those in one dropdown reads as a pile. Consecutive chapters
   * sharing a part are drawn under one heading, which is what turns the list
   * back into a syllabus.
   */
  partKey?: string;
  /**
   * Voiceover override — an absolute URL, used instead of the convention.
   *
   * Normally left off: the player looks for the recording by track and chapter
   * id, in the reader's own language, so adding narration is dropping a file
   * in and nothing else. Set this only for audio that lives somewhere the
   * convention cannot name.
   */
  audio?: string;
  /**
   * Extra basenames to look for, after the chapter's own id.
   *
   * The ported chapters carry the names the original Minute Labs lab publishes
   * its tracks under — `stellar-days`, `eccentric-orbit` — so a recording taken
   * from there, or re-recorded against it and saved under the same name, is
   * found without being renamed first.
   */
  audioAliases?: string[];
  /** Free explore — no keyframe takeover, no snap-back. Every track ends on one. */
  free?: boolean;
  defaults: ChapterSimState;
  frames: Keyframe<ChapterSimState>[];
};

/** Back-compat alias: the day track was the only one for a while. */
export type DayChapter = Chapter;

export const PI2 = Math.PI * 2;
export const DEG = Math.PI / 180;

/**
 * The original lab is orthographic: `zoom` magnifies, it does not dolly.
 * Welcome was ported at zoom 30 → distance 30; every other zoom inverts from
 * that so a close-up (80) is actually closer, not further away.
 */
export function zoomToDistance(zoom: number) {
  return (30 * 30) / zoom;
}

/** A camera position in the original lab's `(x, y, z, zoom)`, as this scene's orbit. */
export function cam(x: number, y: number, z: number, zoom: number) {
  const horiz = Math.hypot(x, z) || 1e-6;
  return {
    cameraYaw: Math.atan2(x, z),
    cameraPitch: Math.atan2(y, horiz),
    cameraDistance: zoomToDistance(zoom),
  };
}

export function kf(
  state: Partial<ChapterSimState>,
  meta: Keyframe<ChapterSimState>["meta"],
): Keyframe<ChapterSimState> {
  return { state, meta };
}

/**
 * The belts, the Moon and the axis, all off.
 *
 * The scene carries far more than the ported day tour ever shows, and a
 * chapter that says nothing about a layer should not inherit it from
 * whichever chapter happens to be written above it. Spreading this into a
 * default is how a track stays readable: what a chapter lists is what it is
 * about.
 */
export const OFF_BELTS = {
  rashiBelt: false,
  nakshatraBelt: false,
  monthRing: false,
  sightline: false,
  moon: false,
  moonTrail: false,
  moonLap: false,
  moonSightline: false,
  axis: false,
} satisfies Partial<SimToggles>;

/** A chapter's opening state: the quiet defaults, with its own on top. */
export function chapterState(partial: Partial<ChapterSimState> = {}): ChapterSimState {
  return {
    handsOff: false,
    orbitalPosition: 0,
    solarDaysPerYear: 8,
    tiltDeg: 0,
    eccentricity: 0,
    cameraTarget: "planet",
    cameraFollow: false,
    graphOpen: false,
    overlay: "",
    planet: "earth",
    highlight: "",
    highlightControl: "",
    hud: false,
    readings: false,
    still: "",
    stillKey: "",
    tip: "",
    ...cam(-5, 20, 30, 40),
    grid: false,
    planetOrbit: true,
    sunOrbit: false,
    trueSun: true,
    meanSun: false,
    eotWedge: false,
    siderealArc: false,
    solarArc: false,
    meanArc: false,
    primeMeridian: true,
    /* The faces ride their arcs, so mean and solar need no separate beat —
       they appear when their arc does. The sidereal one is the exception:
       the original lab draws the stellar arc first and only names the clock
       on it a few seconds later, which is a beat of the script. */
    siderealClock: false,
    solarClock: true,
    meanClock: true,
    degrees: false,
    ...OFF_BELTS,
    ...partial,
  };
}

/**
 * When a chapter first actually starts driving the sim.
 *
 * `handsOff: true` opens most chapters — the quiet, undriven default — and
 * also *closes* many of them, once a keyframe hands the instruments back.
 * Same flag, two different moments; a UI that treats every `true` as "the
 * reader has control" shows the transport bar (and lets the clock free-run)
 * before the chapter has even started. This is the timestamp of the first
 * keyframe that sets `handsOff: false`, or `null` if the chapter never does
 * (always driven, or never driven at all) — a `handsOff: true` sampled before
 * this point is the opening quiet, not a hand-back.
 */
export function firstActiveAt(chapter: Chapter): number | null {
  let best: number | null = null;
  for (const frame of chapter.frames) {
    if (frame.state.handsOff !== false) continue;
    const { from } = interval(frame.meta);
    if (best === null || from < best) best = from;
  }
  return best;
}

export function cameraFromChapter(s: ChapterSimState): CameraState {
  return { yaw: s.cameraYaw, pitch: s.cameraPitch, distance: s.cameraDistance };
}

export function togglesFromChapter(s: ChapterSimState): SimToggles {
  return {
    grid: s.grid,
    planetOrbit: s.planetOrbit,
    sunOrbit: s.sunOrbit,
    trueSun: s.trueSun,
    meanSun: s.meanSun,
    eotWedge: s.eotWedge,
    siderealArc: s.siderealArc,
    solarArc: s.solarArc,
    meanArc: s.meanArc,
    primeMeridian: s.primeMeridian,
    axis: s.axis,
    rashiBelt: s.rashiBelt,
    nakshatraBelt: s.nakshatraBelt,
    monthRing: s.monthRing,
    sightline: s.sightline,
    moon: s.moon,
    moonTrail: s.moonTrail,
    moonLap: s.moonLap,
    moonSightline: s.moonSightline,
    siderealClock: s.siderealClock,
    solarClock: s.solarClock,
    meanClock: s.meanClock,
    degrees: s.degrees,
  };
}

/**
 * Where a chapter's narration is looked for, in order.
 *
 * The app is bilingual and narration is a voice, so the language belongs in the
 * path rather than in one shared file:
 * `public/learn/audio/ne/calendar/stellar.mp3` is the Nepali recording of the
 * calendar track's stellar chapter. A track recorded only once can sit at
 * `public/learn/audio/calendar/stellar.mp3` and serve both languages. `.ogg`
 * follows each, the way the reference lab ships its own tracks, and `.m4a`
 * after that — the format a phone or Voice Memos recording actually comes in,
 * so a voiceover does not need re-encoding before it can be dropped in.
 *
 * Everything is resolved against Vite's `BASE_URL` rather than written as a
 * root-absolute `/learn/...`, so the paths survive the app being served from a
 * sub-path.
 *
 * The player probes these in order and takes the first that exists, so a
 * chapter with no recording runs silently on its own clock — which is what
 * every chapter does until a file lands next to it.
 *
 * @see `public/learn/audio/README.md` for the full list of filenames.
 */
export function chapterAudioSources(track: string, chapter: Chapter, lang: string): string[] {
  if (chapter.audio) return [chapter.audio];
  const root = `${import.meta.env.BASE_URL}learn/audio`;
  const names = [chapter.id, ...(chapter.audioAliases ?? [])];
  /* Language first, then the shared folder: a topic recorded in both wins over
     one recorded once, and an alias only ever answers when the chapter's own
     name has nothing at that level. */
  const paths = names.flatMap((name) => [`${root}/${lang}/${track}/${name}`, `${root}/${track}/${name}`]);
  return paths.flatMap((n) => [`${n}.mp3`, `${n}.ogg`, `${n}.m4a`]);
}
