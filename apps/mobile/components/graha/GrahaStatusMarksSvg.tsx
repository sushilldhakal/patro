import { G, Path } from "react-native-svg";
import { showAsta, showVakri } from "@/lib/graha-status";
import { FLAME_PATH, ROTATE_CCW_PATHS } from "@/lib/graha-status-marks-paths";

type Props = {
  planetKey?: string;
  isRetrograde?: boolean;
  isCombust?: boolean;
  x: number;
  y: number;
  size?: number;
  vakriColor: string;
  astaColor: string;
};

/** वक्री / अस्त icon marks beside planet abbreviations in D1 / gochar SVG charts. */
export function GrahaStatusMarksSvg({
  planetKey,
  isRetrograde,
  isCombust,
  x,
  y,
  size = 9,
  vakriColor,
  astaColor,
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
        <G transform={`translate(${x + offset}, ${y}) scale(${s})`}>
          {ROTATE_CCW_PATHS.map((d, i) => (
            <Path
              key={i}
              d={d}
              stroke={vakriColor}
              fill="none"
              strokeWidth={2.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </G>
      ) : null}
      {asta ? (
        <G transform={`translate(${x + (vakri ? offset + gap : offset)}, ${y}) scale(${s})`}>
          <Path
            d={FLAME_PATH}
            stroke={astaColor}
            fill="none"
            strokeWidth={2.75}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </G>
      ) : null}
    </>
  );
}
