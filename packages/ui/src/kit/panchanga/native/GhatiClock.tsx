import Svg, { Path } from "react-native-svg";
import { useGhatiClock } from "@vedic-patro/features/panchanga";
import { Box, Text } from "@vedic-patro/ui";
import { brand, withAlpha } from "@vedic-patro/design-tokens";
import { moonIcon, sunriseIcon } from "../icons";

export type GhatiClockProps = {
  sunrise?: string;
  sunset?: string;
  timezone?: string;
};

const INK_SOFT = withAlpha(brand.offWhite, 0.8);

function InkIcon({ node }: { node: typeof sunriseIcon }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={INK_SOFT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {node.map(([, attrs], i) => (
        <Path key={i} d={String(attrs.d ?? "")} stroke={INK_SOFT} />
      ))}
    </Svg>
  );
}

export function GhatiClock({ sunrise, sunset, timezone }: GhatiClockProps) {
  const { vedic, civil, copy } = useGhatiClock({ sunrise, timezone, tickMs: 1000 });
  return (
    <Box className="relative overflow-hidden rounded-xl bg-ill-wheel-sky2 px-4 pb-4 pt-5 shadow-lg">
      <Text className="text-center text-sm font-semibold tracking-eyebrow-wide text-ill-brand-off-white/55">{copy.title}</Text>
      <Text className="mt-3.5 text-center font-mono text-5xl font-bold leading-none tracking-tight text-ill-brand-off-white">
        {vedic.ghati}
        <Text className="text-ill-brand-off-white/40">:</Text>
        {vedic.pala}
        <Text className="text-ill-brand-off-white/40">:</Text>
        <Text className="text-sm text-ill-brand-off-white/65">{vedic.vipala}</Text>
      </Text>
      <Text className="mt-2 text-center text-sm font-semibold tracking-wide text-panchang">{copy.vedicUnits}</Text>
      <Box className="mx-5 my-3.5 h-px" nativeClassName="bg-white/12" />
      <Text className="text-center font-mono text-xl font-bold leading-none text-ill-brand-off-white">
        {civil.hour}:{civil.minute}
        <Text className="text-sm text-ill-brand-off-white/65">:{civil.second}</Text>
      </Text>
      <Text className="mt-2 text-center text-sm font-semibold tracking-wide text-ill-brand-off-white/50">{copy.civilUnits}</Text>
      <Box className="mt-3.5 flex-row flex-wrap items-center justify-center gap-4">
        {sunrise ? (
          <Box className="flex-row items-center gap-1.5">
            <InkIcon node={sunriseIcon} />
            <Text className="text-center font-mono text-sm text-ill-brand-off-white/80">{sunrise}</Text>
          </Box>
        ) : null}
        {sunset ? (
          <Box className="flex-row items-center gap-1.5">
            <InkIcon node={moonIcon} />
            <Text className="text-center font-mono text-sm text-ill-brand-off-white/80">{sunset}</Text>
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
