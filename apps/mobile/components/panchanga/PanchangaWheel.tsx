import { memo, useMemo, useState, type ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { brand, neutral, withAlpha } from "@vedic-patro/design-tokens";
import Ketu from "@/assets/graha/ketu.svg";
import Rahu from "@/assets/graha/rahu.svg";
import { SkyTimeSheet } from "@/components/sky3d/SkyTimeSheet";
import { WheelPanel } from "@/components/panchanga/WheelPanel";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { useSvgChartFonts } from "@/lib/svg-chart-font";
import { IS_LOW_MEMORY_DEVICE } from "@/lib/device-memory";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { fetchPanchangaAtTime, panchangaKeys } from "@/lib/api";
import { PanchangaWheel as KitWheel, type WheelAtTimeClient, type WheelChartAssets } from "@vedic-patro/ui/kit/panchanga";

const chartAssetsBase: Omit<WheelChartAssets, "fontFamily"> = {
  skyTop: {
    sun: require("@/assets/sky3d/top/sun.png"),
    moon: require("@/assets/sky3d/top/moon.png"),
    mars: require("@/assets/sky3d/top/mars.png"),
    mercury: require("@/assets/sky3d/top/mercury.png"),
    jupiter: require("@/assets/sky3d/top/jupiter.png"),
    venus: require("@/assets/sky3d/top/venus.png"),
    saturn: require("@/assets/sky3d/top/saturn.png"),
  },
  earthTop: require("@/assets/sky3d/top/earth.png"),
  nodeIcons: [Rahu, Ketu],
};

const atTime: WheelAtTimeClient = {
  queryKey: (query) => panchangaKeys.atTime(query.datetime ?? "", query.locationParams),
  queryFn: (query) => fetchPanchangaAtTime(query.datetime ?? "", query.locationParams),
};

type Props = Omit<
  ComponentProps<typeof KitWheel>,
  "chartAssets" | "atTime" | "renderSkySheet" | "renderRashiPanel" | "renderScrubber" | "safeTop" | "safeBottom" | "loadingMark"
>;

/** Once someone on a low-memory phone opens the wheel, it stays open for the rest of the session. */
let wheelOpenedThisSession = false;

/**
 * On low-memory phones the wheel waits for a tap. react-native-svg draws its ~900 shapes and
 * labels in software on the main thread, and on phones like the TECNO Spark 6 Go that draw
 * alone blocked the app past Android's 5 s ANR limit (Sentry PATRO-B). Other phones get the
 * wheel straight away, as before.
 */
function PanchangaWheelImpl(props: Props) {
  const [open, setOpen] = useState(!IS_LOW_MEMORY_DEVICE || wheelOpenedThisSession);
  if (!open) {
    return (
      <WheelGate
        onOpen={() => {
          wheelOpenedThisSession = true;
          setOpen(true);
        }}
      />
    );
  }
  return <WheelBody {...props} />;
}

function WheelGate({ onOpen }: { onOpen: () => void }) {
  const { t } = useLocale();
  const colors = useThemeColors();
  return (
    <View className="items-center gap-3 rounded-2xl border border-border bg-card px-5 py-8">
      <Ionicons name="sunny-outline" size={28} color={colors.mutedForeground} />
      <Text className="text-base font-semibold text-foreground">{t("panchanga.wheel_gate.title")}</Text>
      <Text className="text-center text-sm text-muted-foreground">{t("panchanga.wheel_gate.body")}</Text>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        className="mt-1 rounded-full bg-primary px-5 py-2.5 active:opacity-80"
      >
        <Text className="text-sm font-semibold text-primary-foreground">{t("panchanga.wheel_gate.show")}</Text>
      </Pressable>
    </View>
  );
}

function WheelBody(props: Props) {
  const insets = useSafeAreaInsets();
  const fonts = useSvgChartFonts();
  const chartAssets = useMemo<WheelChartAssets>(() => ({ ...chartAssetsBase, fontFamily: fonts.chart }), [fonts]);
  return (
    <KitWheel
      {...props}
      chartAssets={chartAssets}
      atTime={atTime}
      // The screen's status line already says what is loading.
      loadingMark={<VedicPatroLoader label={null} size={88} />}
      safeTop={insets.top}
      safeBottom={insets.bottom}
      safeRight={insets.right}
      renderScrubber={({ value, onChange, trackWidth }) => (
        <Slider
          style={{ width: trackWidth, height: 32 }}
          minimumValue={0}
          maximumValue={60}
          step={0.25}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor={brand.vermilion}
          maximumTrackTintColor={withAlpha(neutral.white, 0.14)}
          thumbTintColor={brand.vermilion}
          accessibilityLabel="Time scrubber"
        />
      )}
      renderSkySheet={(slot) => (
        <SkyTimeSheet
          timeMs={slot.timeMs}
          zoneOffsetMs={slot.zoneOffsetMs}
          transport={slot.transport}
          onApplyMs={slot.onApplyMs}
          onClose={slot.onClose}
        />
      )}
      renderRashiPanel={(panel) => (
        <WheelPanel sel={panel.sel} open={panel.open} num={panel.num} onClose={panel.onClose} />
      )}
    />
  );
}

/** Fetch, sky sheet, rashi panel, and photographs stay in the app. The wheel drawing lives in the kit. */
export const PanchangaWheel = memo(PanchangaWheelImpl);
export type { WheelCalendarPick, YearWheelScrub } from "@vedic-patro/ui/kit/panchanga";
