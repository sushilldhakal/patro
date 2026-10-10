import { showAsta, showVakri } from "@/lib/graha-status";
import { FLAME_PATH, ROTATE_CCW_PATHS } from "@/lib/graha-status-marks-paths";

type Props = {
  planetKey?: string;
  isRetrograde?: boolean;
  isCombust?: boolean;
  x: number;
  y: number;
  size?: number;
  /**
   * Unused here — this variant colors its marks with `stroke-secondary` /
   * `stroke-destructive` classes, not props. Accepted anyway so the two
   * variants share one call shape: `moduleSuffixes` in tsconfig makes bare
   * `tsc` (no platform context) resolve every import of this module to
   * whichever variant sorts first, including from callers meant for the
   * other one.
   */
  vakriColor?: string;
  astaColor?: string;
};

/** Web DOM SVG variant for D1Chart.web.tsx */
export function GrahaStatusMarksSvg({
  planetKey,
  isRetrograde,
  isCombust,
  x,
  y,
  size = 9,
}: Props) {
  const vakri = showVakri(planetKey, isRetrograde);
  const asta = showAsta(planetKey, isCombust);
  if (!vakri && !asta) return null;

  const s = size / 24;
  const gap = size + 0.75;
  let offset = 0;

  return (
    <>
      {vakri ? (
        <g transform={`translate(${x + offset}, ${y}) scale(${s})`} className="stroke-secondary" fill="none" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
          {ROTATE_CCW_PATHS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      ) : null}
      {asta ? (
        <g
          transform={`translate(${x + (vakri ? offset + gap : offset)}, ${y}) scale(${s})`}
          className="stroke-destructive"
          fill="none"
          strokeWidth={2.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={FLAME_PATH} />
        </g>
      ) : null}
    </>
  );
}
