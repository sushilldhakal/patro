// One way to ask for Drik positions, whatever the source is.
//
// Unlike the Surya Siddhanta loader, there is no server slice to fetch:
// the Drik kernel is a server-side file, and the server answers Drik from
// its computed API, not from slices. This module is the fallback for when
// that API is slow or unreachable — the bundled Drik CHEB file
// (CHEB0002, coefficients fitted to the kernel, shipped with the app).
// The same derivations run on it as on the server's positions. Kundali,
// dashas, muhurta, gochar and festivals stay server-side; this fallback
// covers the day panchanga only.
//
// The file is built where the kernel lives:
// `siddhanta-table drik-build <kernel.veph> <out.cheb> <first> <last>`
// (see apps/rust/crates/siddhanta-table/README.md). No Drik file is
// shipped yet — the loader and its test use a synthetic one.
import { chebPositionsAt, chebScalars, parseChebTable } from "./chebyshev";
import {
  wrap360,
  type PositionFrame,
  type PositionSource,
} from "./siddhanta-offline";

const J2000 = 2451545.0;

/**
 * The Drik frame, from the server's own functions
 * (`DrikSky::greenwich_sidereal_degrees`, `mean_obliquity` in
 * `crates/ephdata/src/frames.rs`): the IAU 2006 mean obliquity of date,
 * the rigorous Greenwich sidereal time (Earth Rotation Angle plus the
 * equation of the equinoxes), and the −0.833° upper-limb horizon. The
 * obliquity and sidereal time take TT; the client has no ΔT, so UT is
 * used instead — the error is under a thousandth of an arcsecond in the
 * sidereal time, far below what the lagna can show.
 */
export const drikFrame: PositionFrame = {
  obliquityAt(jdUt: number): number {
    const t = (jdUt - J2000) / 36525;
    // Horner over t, arcseconds, IAU 2006.
    const arcsec =
      84381.406 +
      t *
        (-46.836769 +
          t *
            (-0.0001831 +
              t * (0.0020034 + t * (-0.000000576 + t * -0.0000000434))));
    return arcsec / 3600;
  },
  localSiderealDegrees(jdUt: number, longitude: number): number {
    const du = jdUt - J2000;
    const frac = (x: number) => x - Math.floor(x);
    const era = 360 * frac(0.779057273264 + 1.0027378119113546 * du);
    const t = du / 36525;
    const arcsec =
      0.014506 +
      t *
        (4612.156534 +
          t *
            (1.3915817 +
              t * (-0.00000044 + t * (-0.000029956 + t * -0.0000000368))));
    return wrap360(era + arcsec / 3600 + longitude);
  },
  horizonDegrees: -0.833,
};

/**
 * A Drik CHEB file as a source. Throws when the bytes are not a
 * version-2 (Drik) file — a Surya file is the wrong data for Drik, and
 * using it would silently show Surya positions under a Drik label.
 */
export function drikSource(bytes: Uint8Array): PositionSource {
  const table = parseChebTable(bytes);
  if (!table.ayanamsha) {
    throw new Error("drik source needs a CHEB0002 file (fitted ayanamsha in the header)");
  }
  return {
    positionsAt: (jdUt) => chebPositionsAt(table, jdUt, chebScalars(table)),
    frame: drikFrame,
  };
}

/** The app's bundled Drik CHEB bytes, when it ships the fallback file. */
export async function loadDrikSource(
  bundledCheb: () => Promise<Uint8Array>,
): Promise<PositionSource> {
  return drikSource(await bundledCheb());
}
