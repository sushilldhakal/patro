import { useId } from "react";
import type { GrahaKey } from "@vedic-patro/domain/jyotish/graha-details";
import { cn } from "@vedic-patro/design-tokens/cn";
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

/** The Moon's unlit face and its rim — dark, but never lost against a dark card. */
const MOON_UNLIT_FILL = "#1d2433";
const MOON_RIM = "rgba(160,170,190,0.45)";

/** Spherical graha artwork. Colours come from `grahaArt`. */
export function GrahaPlanetIcon({ graha, size = 32, className, elongation }: GrahaPlanetIconProps) {
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
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      className={cn("inline-block shrink-0 select-none", className)}
    >
      <defs>
        <radialGradient id={grad} cx={spec.cx} cy={spec.cy} r={spec.gradR}>
          {spec.stops.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor={stop.color} />
          ))}
        </radialGradient>
        {spec.spots || graha === "jupiter" ? (
          <clipPath id={clip}>
            <circle cx="24" cy="24" r={spec.r} />
          </clipPath>
        ) : null}
        {litPath ? (
          <clipPath id={phaseClip}>
            <path d={litPath} transform="translate(24 24)" />
          </clipPath>
        ) : null}
      </defs>
      {spec.rays ? (
        <g stroke={spec.rays.stroke} strokeWidth={2.4} strokeLinecap="round">
          {spec.rays.lines.map((line) => (
            <line key={line.join(",")} x1={line[0]} y1={line[1]} x2={line[2]} y2={line[3]} />
          ))}
        </g>
      ) : null}
      {spec.ring ? (
        <g transform="rotate(-20 24 24)">
          <ellipse
            cx="24"
            cy="24"
            rx="24"
            ry="7.2"
            fill="none"
            stroke={spec.ring.stroke}
            strokeWidth={2.4}
            opacity={0.9}
          />
        </g>
      ) : null}
      {phased && !phaseFull ? (
        <>
          <circle cx="24" cy="24" r={spec.r} fill={MOON_UNLIT_FILL} />
          <circle cx="24" cy="24" r={spec.r} fill={`url(#${grad})`} opacity={0.12} />
          {litPath ? <circle cx="24" cy="24" r={spec.r} fill={`url(#${grad})`} clipPath={`url(#${phaseClip})`} /> : null}
          <circle cx="24" cy="24" r={spec.r} fill="none" stroke={MOON_RIM} strokeWidth={0.8} />
        </>
      ) : (
        <circle cx="24" cy="24" r={spec.r} fill={`url(#${grad})`} />
      )}
      {spec.ring ? (
        <g transform="rotate(-20 24 24)">
          <path d="M0 24a 24 7.2 0 0 0 48 0" fill="none" stroke={spec.ring.bright} strokeWidth={2.4} />
        </g>
      ) : null}
      {graha === "jupiter" ? (
        <g clipPath={`url(#${clip})`} opacity={0.55}>
          {jupiterBands.map((band) => (
            <rect key={band.y} x="0" y={band.y} width="48" height={band.h} fill={band.fill} />
          ))}
          <ellipse cx={jupiterSpot.cx} cy={jupiterSpot.cy} rx={jupiterSpot.rx} ry={jupiterSpot.ry} fill={jupiterSpot.fill} />
        </g>
      ) : null}
      {spec.spots && spec.spots.items.length > 0 && !phaseNew && (!phased || phaseFull || litPath) ? (
        <g clipPath={`url(#${litPath ? phaseClip : clip})`} opacity={spec.spots.opacity} fill={spec.spots.fill}>
          {spec.spots.items.map((spot) =>
            spot.rx != null ? (
              <ellipse
                key={`${spot.cx}-${spot.cy}`}
                cx={spot.cx}
                cy={spot.cy}
                rx={spot.rx}
                ry={spot.ry}
                transform={spot.rotate != null ? `rotate(${spot.rotate} ${spot.cx} ${spot.cy})` : undefined}
              />
            ) : (
              <circle key={`${spot.cx}-${spot.cy}`} cx={spot.cx} cy={spot.cy} r={spot.r} />
            ),
          )}
        </g>
      ) : null}
    </svg>
  );
}
