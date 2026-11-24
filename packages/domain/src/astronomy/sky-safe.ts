// The only way a screen should ask the sky for a day: it never throws and never blocks the screen.
//
// `loadSky` is the app's own loader (a dynamic import of its `lib/sky`, so a missing native module
// or an unreadable file becomes "no answer" and not a crash at launch). Any failure, a switch set to
// off, or a day the stored data cannot answer, returns null, and the screen then asks the server
// exactly as it did before this existed. Turning `enabled` off in an update is the kill switch.
import { Sky } from "./sky";
import { julianDayNumber, skyDay, type SkyDay, type SkyDayInput } from "./sky-day";

export interface SafeSkyOptions {
  /** False turns the local sky off (a remote or build-time switch). */
  enabled: boolean;
  /** Called with whatever went wrong, for a breadcrumb; never rethrown. */
  onError?: (error: unknown) => void;
}

/** A day's panchanga from the app's own sky, or null when it cannot (or should not) answer. */
export async function safeSkyDay(
  loadSky: () => Promise<Sky>,
  input: SkyDayInput,
  options: SafeSkyOptions,
): Promise<SkyDay | null> {
  if (!options.enabled) return null;
  try {
    const sky = await loadSky();
    // Outside the bundled years this fetches a batch (or finds one cached); a failure only means
    // the built-in fallback answers.
    const jd = julianDayNumber(input.year, input.month, input.day);
    await sky.ensure(jd - 2, jd + 3);
    return skyDay(sky, input);
  } catch (error) {
    options.onError?.(error);
    return null;
  }
}
