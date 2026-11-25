// Instants are Julian Days (UT). These print them as the server does: ISO with the zone's offset,
// the microseconds left off when zero, and the zone's clock (`HH:MM:SS`, `HH:MM`).
import { civilFromJdn, utcOffsetMinutes, utcOffsetText } from "../../astronomy/lunar-month";

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

interface Parts {
  jdn: number;
  micros: number;
}
function split(jd: number): Parts {
  const shifted = jd + 0.5;
  let jdn = Math.floor(shifted);
  let micros = Math.round((shifted - jdn) * 86_400_000_000);
  if (micros >= 86_400_000_000) {
    micros -= 86_400_000_000;
    jdn += 1;
  }
  return { jdn, micros };
}

export interface Wall {
  iso: string;
  hms: string;
  hm: string;
  /** The civil day (JDN) on this clock. */
  jdn: number;
  seconds: number;
}

/** The instant on a clock `offsetMinutes` east of UTC. */
export function wallAt(jd: number, offsetMinutes: number): Wall {
  // Whole seconds over 86400, as the server divides its offset: a local mean time offset (+05:41:16)
  // from fractional minutes rounds to a different double and lands microseconds off the second.
  const { jdn, micros } = split(jd + Math.round(offsetMinutes * 60) / 86400);
  const c = civilFromJdn(jdn);
  const totalSeconds = Math.floor(micros / 1_000_000);
  const frac = micros % 1_000_000;
  const hh = Math.floor(totalSeconds / 3600);
  const mm = Math.floor((totalSeconds % 3600) / 60);
  const ss = totalSeconds % 60;
  const hms = `${pad(hh)}:${pad(mm)}:${pad(ss)}`;
  return {
    iso: `${pad(c.year, 4)}-${pad(c.month)}-${pad(c.day)}T${hms}${frac ? `.${pad(frac, 6)}` : ""}${utcOffsetText(offsetMinutes)}`,
    hms,
    hm: `${pad(hh)}:${pad(mm)}`,
    jdn,
    seconds: totalSeconds,
  };
}

export const utcIso = (jd: number) => wallAt(jd, 0).iso;
export const wallIn = (jd: number, timeZone: string) => wallAt(jd, utcOffsetMinutes(timeZone, jd));
export const addSeconds = (jd: number, s: number) => jd + s / 86400;
export const secondsSince = (a: number, b: number) => (a - b) * 86400;
