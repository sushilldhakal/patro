import { Box, Text } from "@vedic-patro/ui";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useEphemerisModeBanner, useMuhurtaNow } from "@vedic-patro/features/panchanga";
import { panchangaPageClasses as cls } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import type { MuhurtaNowPanelProps } from "../contract";

const aside = cls.aside;

export function MuhurtaNowPanel({ p, clock }: MuhurtaNowPanelProps) {
  const card = useMuhurtaNow({ p, clock });
  if (!card) return null;

  return (
    <Box className={aside.card}>
      <Text className={aside.muhurtaEyebrow}>{card.title}</Text>
      {card.instant ? <Text className={aside.muhurtaInstant}>{card.instant}</Text> : null}
      <Box className={aside.muhurtaList} nativeClassName="flex-col">
        {card.rows.map((row) => (
          <Box
            key={row.key}
            className={cn(aside.muhurtaRow, row.active ? aside.muhurtaRowActive : aside.muhurtaRowIdle)}
            nativeClassName="flex-row"
          >
            <Text className={aside.muhurtaLabel}>{row.label}</Text>
            <Text className={aside.muhurtaValue}>
              <Text className={row.active ? aside.muhurtaActive : aside.muhurtaRange}>{row.value}</Text>
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function EphemerisModeBanner({ p, clock, viewedDateAd }: MuhurtaNowPanelProps) {
  const banner = useEphemerisModeBanner({ p, clock, viewedDateAd });
  return (
    <Box className={aside.banner}>
      <Text className={aside.bannerTitle}>{banner.title}</Text>
      <Text className={aside.bannerBody}>
        {banner.body.map((run, index) => (
          <Text key={index} className={run.mono ? "font-mono tabular-nums" : undefined}>
            {run.text}
          </Text>
        ))}
      </Text>
    </Box>
  );
}
