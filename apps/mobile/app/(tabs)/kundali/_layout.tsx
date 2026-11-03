import { Stack } from "expo-router";
import { useRailPageAnimation } from "@/components/panchanga/PanchangaSplitShell";
import { useThemeColors } from "@/lib/theme-context";
import { crossTabBackListeners } from "@/lib/cross-tab-back";
import { withDuoRailInset } from "@/components/navigation/DuoSceneInset";
import { useCalculationSystem, useLocale } from "@/lib/i18n";
import { usePageViewMenu } from "@/lib/page-view-menu";

function KundaliLayout() {
  const colors = useThemeColors();
  const fade = useRailPageAnimation();
  const { t } = useLocale();
  const { system, setSystem } = useCalculationSystem();
  // Every kundali page: the calculation system (Drik | Surya Siddhanta) in the header's view menu.
  usePageViewMenu([
    {
      key: "system",
      options: [
        { key: "drik", label: t("calculation_system.drik"), active: system === "drik", onPress: () => setSystem("drik") },
        {
          key: "surya_siddhanta",
          label: t("calculation_system.surya_siddhanta"),
          active: system === "surya_siddhanta",
          onPress: () => setSystem("surya_siddhanta"),
        },
      ],
    },
  ]);
  return (
    <Stack
      screenListeners={crossTabBackListeners("/kundali")}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        ...(fade ?? {}),
      }}
    />
  );
}

export default withDuoRailInset(KundaliLayout);
