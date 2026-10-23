import { grahaArt } from "@vedic-patro/design-tokens";
import { useId, type ComponentType, type ReactNode } from "react";
import { Circle, ClipPath, Defs, Ellipse, G, Line, Path, RadialGradient, Rect, Stop, Svg } from "react-native-svg";
import type { GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import { isFullMoonElongation, isNewMoonElongation, moonPhaseLitPath } from "@vedic-patro/domain/astronomy/moon-phase-svg";
import { grahaPlanetArt, jupiterBands, jupiterSpot } from "../graha-planet-art";

export type GrahaPlanetIconProps = {
  graha: GrahaKey;
  size?: number;
  className?: string;
  /**
   * Moon only: Moon-minus-Sun longitude in degrees (0 औंसी, 180 पूर्णिमा). Given, the
   * disc shows the real phase — waxing lit on the right, waning on the left.
   */
  elongation?: number;
};

/** Web typings of `Defs` omit `children` when the app resolves `.web` first. */
const SvgDefs = Defs as ComponentType<{ children?: ReactNode }>;


/** Spherical graha artwork. Colours come from `grahaArt`. */
export function GrahaPlanetIcon({ graha, size = 32, elongation }: GrahaPlanetIconProps) {
  const id = useId().replace(/:/g, "");
  const spec = grahaPlanetArt[graha];
  const grad = `${id}-g`;
  const clip = `${id}-c`;
  const phaseClip = `${id}-p`;
  const phaseE = graha === "moon" && elongation != null && Number.isFinite(elongation) ? elongation : null;
  const phased = phaseE != null;
  const phaseNew = phaseE != null && isNewMoonElongation(phaseE);
  const phaseFull = phaseE != null && isFullMoonElongation(phaseE);
  /* A partial phase: a dark disc with the lit shape cut out of the moon art. */
  const litPath = phaseE != null && !phaseNew && !phaseFull ? moonPhaseLitPath(phaseE, spec.r) : null;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <SvgDefs>
        <RadialGradient id={grad} cx={spec.cx} cy={spec.cy} r={spec.gradR}>
          {spec.stops.map((stop) => (
            <Stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </RadialGradient>
        {spec.spots || graha === "jupiter" ? (
          <ClipPath id={clip}>
            <Circle cx="24" cy="24" r={spec.r} />
          </ClipPath>
        ) : null}
        {litPath ? (
          <ClipPath id={phaseClip}>
            <Path d={litPath} transform="translate(24 24)" />
          </ClipPath>
        ) : null}
      </SvgDefs>
      {spec.rays ? (
        <G stroke={spec.rays.stroke} strokeWidth={2.4} strokeLinecap="round">
          {spec.rays.lines.map((line) => (
            <Line key={line.join(",")} x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]} />
          ))}
        </G>
      ) : null}
      {spec.ring ? (
        <G transform="rotate(-20 24 24)">
          <Ellipse cx="24" cy="24" rx="24" ry="7.2" fill="none" stroke={spec.ring.stroke} strokeWidth={2.4} opacity={0.9} />
        </G>
      ) : null}
      {phased && !phaseFull ? (
        <>
          <Circle cx="24" cy="24" r={spec.r} fill={grahaArt.moonUnlit} />
          <Circle cx="24" cy="24" r={spec.r} fill={`url(#${grad})`} opacity={0.12} />
          {litPath ? <Circle cx="24" cy="24" r={spec.r} fill={`url(#${grad})`} clipPath={`url(#${phaseClip})`} /> : null}
          <Circle cx="24" cy="24" r={spec.r} fill="none" stroke={grahaArt.moonRim} strokeWidth={0.8} />
        </>
      ) : (
        <Circle cx="24" cy="24" r={spec.r} fill={`url(#${grad})`} />
      )}
      {spec.ring ? (
        <G transform="rotate(-20 24 24)">
          <Path d="M0 24a 24 7.2 0 0 0 48 0" fill="none" stroke={spec.ring.bright} strokeWidth={2.4} />
        </G>
      ) : null}
      {graha === "jupiter" ? (
        <G clipPath={`url(#${clip})`} opacity={0.55}>
          {jupiterBands.map((band) => (
            <Rect key={band.y} x="0" y={band.y} width="48" height={band.h} fill={band.fill} />
          ))}
          <Ellipse cx={jupiterSpot.cx} cy={jupiterSpot.cy} rx={jupiterSpot.rx} ry={jupiterSpot.ry} fill={jupiterSpot.fill} />
        </G>
      ) : null}
      {spec.spots && spec.spots.items.length > 0 && !phaseNew && (!phased || phaseFull || litPath) ? (
        <G clipPath={`url(#${litPath ? phaseClip : clip})`} opacity={spec.spots.opacity} fill={spec.spots.fill}>
          {spec.spots.items.map((spot) =>
            spot.rx != null ? (
              <Ellipse
                key={`${spot.cx}-${spot.cy}`}
                cx={spot.cx}
                cy={spot.cy}
                rx={spot.rx}
                ry={spot.ry}
                transform={spot.rotate != null ? `rotate(${spot.rotate} ${spot.cx} ${spot.cy})` : undefined}
              />
            ) : (
              <Circle key={`${spot.cx}-${spot.cy}`} cx={spot.cx} cy={spot.cy} r={spot.r} />
            ),
          )}
        </G>
      ) : null}
    </Svg>
  );
}
