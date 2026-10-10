/** Shapes the day-simulation scene and the learn chapters share. */

export type CameraTarget = "meanSun" | "planet" | "sun";

export type SimClock = {
  /** Position in the year, in sidereal rotations. */
  day: number;
  playing: boolean;
  /** Sidereal rotations of simulated time per real second. */
  daysPerSecond: number;
};

export type SimParams = {
  daysPerYear: number;
  eccentricity: number;
  /** Axial tilt in radians. */
  tilt: number;
};

export type SimToggles = {
  grid: boolean;
  planetOrbit: boolean;
  sunOrbit: boolean;
  trueSun: boolean;
  meanSun: boolean;
  eotWedge: boolean;
  siderealArc: boolean;
  solarArc: boolean;
  meanArc: boolean;
  /** काठमाडौँ's meridian, pole to pole — the line noon is reckoned against. */
  primeMeridian: boolean;
  /** The spin axis, run out through both poles, against the orbital plane. */
  axis: boolean;
  /** The twelve राशि, out beyond the orbit. */
  rashiBelt: boolean;
  /** The twenty-seven नक्षत्र, outside the rashi belt. */
  nakshatraBelt: boolean;
  /** बिक्रम months, which *are* the solar rashi — बैशाख opens at मेष. */
  monthRing: boolean;
  /** Planet → Sun → belt: the line that says which rashi the Sun is seen in. */
  sightline: boolean;
  /** The Moon and the path it takes round the planet. */
  moon: boolean;
  /** The Moon's swept path through space — its compound motion made visible. */
  moonTrail: boolean;
  /** One sidereal lap against the extra arc a synodic month still needs. */
  moonLap: boolean;
  /** Earth → Moon → नक्षत्र belt: the Moon's own nakshatra, read off the sky. */
  moonSightline: boolean;
  /* ── the three clock faces ─────────────────────────────────────────
     Each rides its own arc, so a face is only ever drawn when the arc it
     belongs to is. Separating them from the arcs is what the reference lab
     does, and it is the only way to show two arcs while reading one clock —
     the beat where the sidereal arc has closed but the solar one has not. */
  /** The sidereal (नाक्षत्र) clock face, on the stellar arc. */
  siderealClock: boolean;
  /** The true-Sun clock face, on the solar arc. */
  solarClock: boolean;
  /** The mean-time clock face, on the mean arc. */
  meanClock: boolean;
  /** The globe's rotation so far, in degrees, pinned above the planet. */
  degrees: boolean;
};

export type CameraState = { yaw: number; pitch: number; distance: number };

/** Worlds the adjust drawer can put in Earth's place. */
export type PlaygroundGlobe = "earth" | "mars" | "mercury" | "jupiter" | "venus" | "saturn";
