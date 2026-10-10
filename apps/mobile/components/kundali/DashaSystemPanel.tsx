import { useState } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { DashaTree } from "@/components/kundali/DashaTree";
import type { DashaSystem, DashaTreeResponse } from "@/lib/api";
import {
  DASHA_LORD_EN,
  DASHA_LORD_NE,
  dashaMahadashaGrahaKey,
  type DashaLord,
} from "@vedic-patro/domain/dasha";
import { useLocale } from "@/lib/i18n";
import { kundaliLabel } from "@/lib/kundali/kundali-i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";

type DashaTab = {
  id: DashaSystem;
  labelNe: string;
  labelEn: string;
  data: DashaTreeResponse | null | undefined;
  maxLevel: number;
};

type Props = {
  vimshottari: DashaTreeResponse | null | undefined;
  tribhagi: DashaTreeResponse | null | undefined;
  yogini: DashaTreeResponse | null | undefined;
  timeZone?: string;
  /** Controlled tab — used when the kundali section nav names a dasha system. */
  active?: DashaSystem;
  onActiveChange?: (id: DashaSystem) => void;
};

export function DashaSystemPanel({
  vimshottari,
  tribhagi,
  yogini,
  timeZone,
  active: activeProp,
  onActiveChange,
}: Props) {
  const { lang, pick, digits } = useLocale();
  const colors = useThemeColors();
  const { isTablet } = useBreakpoint();
  const tabs: DashaTab[] = [
    { id: "vimshottari", labelNe: "विंशोत्तरी", labelEn: "Vimshottari", data: vimshottari, maxLevel: 4 },
    { id: "tribhagi", labelNe: "त्रिभागि", labelEn: "Tribhagi", data: tribhagi, maxLevel: 4 },
    { id: "yogini", labelNe: "योगिनी", labelEn: "Yogini", data: yogini, maxLevel: 1 },
  ];
  const [uncontrolled, setUncontrolled] = useState<DashaSystem>("vimshottari");
  const active = activeProp ?? uncontrolled;
  const setActive = (id: DashaSystem) => {
    onActiveChange?.(id);
    if (activeProp == null) setUncontrolled(id);
  };
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0]!;
  const dasha = current.data;

  if (!vimshottari && !tribhagi && !yogini) return null;

  return (
    <View className="gap-4">
      <View className="flex-row flex-wrap gap-1 rounded-xl border border-border/70 bg-muted/20 p-1">
        {tabs.map((tab) => {
          const selected = active === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActive(tab.id)}
              style={[
                {
                  backgroundColor: selected ? colors.card : "transparent",
                  borderColor: selected ? colors.border : "transparent",
                  borderWidth: selected ? 1 : 0,
                },
                selected
                  ? {
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.06,
                      shadowRadius: 2,
                      elevation: 1,
                    }
                  : null,
              ]}
              className="rounded-lg px-3 py-1.5 active:opacity-80"
            >
              <Text
                className={
                  selected ? "text-body font-semibold text-foreground" : "text-body text-muted-foreground"
                }
                style={nepaliTextStyle(13)}
              >
                {pick(tab.labelNe, tab.labelEn)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {dasha ? (
        <View className={isTablet ? "flex-row flex-wrap gap-3" : "gap-3"}>
          <View
            className="min-w-0 rounded-xl border border-border/80 bg-card px-3.5 py-3"
            style={
              isTablet
                ? { flex: 1, flexBasis: "48%", maxWidth: "100%" }
                : { width: "100%" }
            }
          >
            <Text
              className="text-caption mb-1 font-semibold uppercase tracking-wider text-muted-foreground"
              style={nepaliTextStyle(11)}
              numberOfLines={1}
            >
              {kundaliLabel("mahadasha_at_birth", lang)}
            </Text>
            {(() => {
              const grahaKey = dashaMahadashaGrahaKey(current.id, dasha.mahadasha_lord);
              const lordLabel =
                current.id === "yogini"
                  ? lang === "en"
                    ? dasha.mahadasha_lord
                    : dasha.mahadasha_lord_ne
                  : lang === "en"
                    ? DASHA_LORD_EN[dasha.mahadasha_lord as DashaLord] ?? dasha.mahadasha_lord
                    : DASHA_LORD_NE[dasha.mahadasha_lord as DashaLord] ?? dasha.mahadasha_lord_ne;
              return (
                <View className="flex-row flex-wrap items-center gap-2">
                  {grahaKey ? <GrahaPlanetIcon graha={grahaKey} size={28} /> : null}
                  <Text className="text-body font-bold text-foreground" style={nepaliTextStyle(16)}>
                    {lordLabel}
                  </Text>
                </View>
              );
            })()}
            <Text className="text-caption mt-0.5 text-muted-foreground" style={nepaliTextStyle(12)}>
              {pick(
                `${kundaliLabel("dasha_balance", lang)}: ${digits(dasha.balance_label)}`,
                `${kundaliLabel("dasha_balance", lang)}: ${dasha.balance_label}`,
              )}
            </Text>
          </View>
        </View>
      ) : null}

      {dasha?.tree?.length ? (
        <DashaTree
          tree={dasha.tree}
          timeZone={timeZone}
          system={current.id}
          maxLevel={current.maxLevel}
          cycleYears={current.id === "yogini" ? yogini?.cycle_years : undefined}
        />
      ) : (
        <Text className="text-body text-muted-foreground" style={nepaliTextStyle(14)}>
          {kundaliLabel("dasha_unavailable", lang)}
        </Text>
      )}
    </View>
  );
}
