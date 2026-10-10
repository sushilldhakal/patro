/**
 * What zoom means in each of the sky's three views, and what a drag is worth
 * once it has been applied.
 *
 * Its own module because both halves of the sky need it and they are different
 * components: the scene places the lens with it, and the pointer handlers up in
 * the shell size their drags by it.
 */

/** Which of the three views the sky is showing. */
export type SkyMode = "space" | "horizon" | "globe";

/** अन्तरिक्ष's lens, which zoom never touches — it moves the camera instead. */
export const SPACE_FOV = 46;

/** The Earth globe's own radius, and the ring of zodiac that hugs it. */
export const GLOBE_R = 30;
export const GLOBE_BAND_R = GLOBE_R * 1.42;
/** How far back the globe camera is parked. It never moves; the lens narrows. */
export const GLOBE_CAM_R = 300;
/** The zoom value at which the globe view is framed at its widest. */
export const OUTSIDE_ZOOM_MAX = 120;

const DEG = Math.PI / 180;

/**
 * The क्षितिज zoom range, and so the two ends of its field of view: pinched
 * fully in it is {@link HORIZON_ZOOM_MIN} → 1°, opened fully out it is
 * {@link HORIZON_ZOOM_MAX} → {@link horizonFovMax}'s 235°.
 *
 * Exported because the pointer handlers have to clamp to exactly these — a
 * clamp of its own that stops a little short (or a little wide) of them is how
 * the widest and tightest zooms quietly become unreachable.
 */
export const HORIZON_ZOOM_MIN = 0.35;
export const HORIZON_ZOOM_MAX = 120;
/** Where the क्षितिज lens sits at 90° — the view's own opening framing. */
export const HORIZON_ZOOM_HOME = 26;

/**
 * The vertical field of view a zoom value lands on, in degrees.
 *
 * The camera branches are the only things that need this to *place* the lens —
 * but the drag handlers need it too, to know how much sky a pixel is worth. So
 * the one mapping lives here and both callers read it.
 */
/**
 * The widest the क्षितिज lens opens — vertical field, degrees.
 *
 * 235° is Stellarium's own limit on the same projection, and a half-field of
 * 117° is well past both poles: held level the frame reaches over the zenith
 * and under the nadir, so the whole dome is in one shot with the horizon a ring
 * around it and the ground opening out beyond that to the edges of the picture.
 *
 * Nothing about the shape of the canvas comes into it. Stereographic sends the
 * antipode to infinity, so the frame is full at any field on any frame — there
 * is no width at which the sky runs out.
 */
export function horizonFovMax(): number {
  return 235;
}

export function fovForZoom(mode: SkyMode, distance: number): number {
  /* Horizon zoom is the *vertical* field of the equidistant fisheye: 1° at the
     tight end, and at the wide end whatever fills the frame to its corners. */
  if (mode === "horizon") {
    const home = HORIZON_ZOOM_HOME;
    const minD = HORIZON_ZOOM_MIN;
    const maxD = HORIZON_ZOOM_MAX;
    if (distance <= home) {
      const t = Math.min(1, Math.max(0, (distance - minD) / (home - minD)));
      /* The tight end is 1° — two full Moons across the frame. The cage
         follows it down (10° → 5° → 1° → ½°) so the crop is still something
         you can measure on rather than an empty patch of sky. */
      return 1 + t * (90 - 1);
    }
    const t = Math.min(1, Math.max(0, (distance - home) / (maxD - home)));
    return 90 + t * (horizonFovMax() - 90);
  }
  if (mode === "globe") {
    const t = Math.min(1, Math.max(0, distance / OUTSIDE_ZOOM_MAX));
    const framed = 1.4 + Math.pow(t, 1.25) * (GLOBE_BAND_R * 2 - 1.4);
    return (2 * Math.atan(framed / GLOBE_CAM_R)) / DEG;
  }
  /* Space zooms by pulling the camera back, not by narrowing the lens, so its
     field never changes. */
  return SPACE_FOV;
}

/**
 * The क्षितिज zoom `distance` that lands on a given vertical field, degrees —
 * the inverse of {@link fovForZoom}'s tight-zoom branch (1°–90°, `distance`
 * 0.35–26). Search/aim uses this to land a deep-sky photograph already
 * framed instead of centred at whatever zoom the reader happened to be at,
 * which for most of the catalogue (under a degree across) is too wide to
 * show anything at all.
 */
export function distanceForHorizonFov(fovDeg: number): number {
  const home = HORIZON_ZOOM_HOME;
  const minD = HORIZON_ZOOM_MIN;
  const t = (Math.min(90, Math.max(1, fovDeg)) - 1) / (90 - 1);
  return minD + t * (home - minD);
}

/**
 * How far to wind back a drag at the zoom we are at, against the zoom the view
 * opened at. 1 is the opening feel; smaller is a gentler turn.
 *
 * Scaled by whatever the zoom control is actually doing in that view, which is
 * not the same thing in all three. The dome and the globe narrow the lens, so
 * the field of view is the measure, and the scaling keeps a drag worth a fixed
 * fraction of the *screen*: flick the same distance and the same amount of what
 * you can see goes past, whether that is a 240° sky or a 12° crop. Without
 * it, pushing in to the crop turns a nudge into twenty times as much sky, and
 * looking slightly left throws whatever you were inspecting out of frame.
 *
 * अन्तरिक्ष holds its lens still and moves the camera instead, so there the
 * measure is the distance: pushed in among the inner grahas, an orbit that was
 * a comfortable swing around the whole system throws you round the Sun.
 *
 * Floored well above zero so the tightest zoom still answers to a drag at all,
 * and capped at 1 so nothing ever turns faster than it did before.
 */
export function dragScaleForZoom(
  mode: SkyMode,
  distance: number,
  homeDistance: number,
): number {
  const ratio =
    mode === "space"
      ? distance / homeDistance
      : fovForZoom(mode, distance) / fovForZoom(mode, homeDistance);
  return Math.min(1, Math.max(0.12, ratio));
}
