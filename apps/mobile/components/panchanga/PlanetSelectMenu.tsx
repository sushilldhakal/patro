import { useCallback, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { Text } from "@/components/ui/Text";
import { GrahaPlanetIcon } from "@/components/graha/GrahaPlanetIcon";
import { GRAHA_DETAIL_ORDER, GRAHA_NAME } from "@vedic-patro/domain/graha-details";
import { GRAHA_META, type WheelGraha } from "@vedic-patro/domain/wheel-data";
import { useLocale } from "@/lib/i18n";
import { nepaliLineHeight } from "@/lib/nepali-text";

import { brand, midnight, nativeShadow, neutral, wheel, withAlpha } from "@vedic-patro/design-tokens";
const W_INK = midnight.foam;
const W_DOCK_BG = withAlpha(wheel.surface, 0.96);
const W_DOCK_BORDER = withAlpha(wheel.line, 0.32);
const W_ROW_HOT = withAlpha(brand.vermilion, 0.28);
const MENU_W = 228;

type PlanetSelectMenuProps = {
  grahas: WheelGraha[];
  selected: number;
  onSelect: (index: number) => void;
  /** Match the bottom dock icon buttons (32×32). */
  compact?: boolean;
};

export function PlanetSelectMenu({
  grahas,
  selected,
  onSelect,
  compact = false,
}: PlanetSelectMenuProps) {
  const { t, pick } = useLocale();
  const { width: sw, height: sh } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 0, y: 0, w: 36, h: 36 });
  const btnRef = useRef<View>(null);
  const selectedKey = GRAHA_DETAIL_ORDER[selected] ?? "moon";
  const selectedLabel = GRAHA_NAME[selectedKey];

  const openMenu = useCallback(() => {
    btnRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y, w, h });
      setOpen(true);
    });
  }, []);

  const choose = useCallback(
    (index: number) => {
      onSelect(index);
      setOpen(false);
    },
    [onSelect],
  );

  const menuH = Math.min(grahas.length * 44 + 12, sh - 24);
  const left = Math.min(Math.max(8, anchor.x + anchor.w - MENU_W), sw - MENU_W - 8);
  const below = anchor.y + anchor.h + 8;
  const top = below + menuH > sh - 8 ? Math.max(8, anchor.y - menuH - 8) : below;

  return (
    <>
      <Pressable
        ref={btnRef}
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel={t("kundali.select_a_planet")}
        accessibilityHint={pick(selectedLabel.ne, selectedLabel.en)}
        className="rounded-full"
        style={{
          width: compact ? 32 : 36,
          height: compact ? 32 : 36,
          borderWidth: 1,
          borderColor: W_DOCK_BORDER,
          backgroundColor: compact ? "transparent" : W_DOCK_BG,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <GrahaPlanetIcon graha={selectedKey} size={compact ? 18 : 22} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} />
          <View
            className="rounded-2xl py-1.5"
            style={{
              position: "absolute",
              left,
              top,
              width: MENU_W,
              maxHeight: menuH,
              borderWidth: 1,
              borderColor: W_DOCK_BORDER,
              backgroundColor: W_DOCK_BG,
              ...nativeShadow("lg"),
            }}
          >
            {grahas.map((g, i) => {
              const key = GRAHA_DETAIL_ORDER[i] ?? "sun";
              const name = GRAHA_NAME[key];
              const color = GRAHA_META[i]?.color ?? midnight.foam;
              const active = i === selected;
              return (
                <Pressable
                  key={key}
                  onPress={() => choose(i)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  className="px-3 py-2"
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    backgroundColor: active ? W_ROW_HOT : "transparent",
                  }}
                >
                  <GrahaPlanetIcon graha={key} size={22} />
                  <View
                    className="rounded-full"
                    style={{
                      width: 7,
                      height: 7,
                      backgroundColor: color,
                    }}
                  />
                  <Text
                    className="text-lg"
                    style={{
                      flex: 1,
                      color: W_INK,
                      fontWeight: active ? "700" : "500",
                      lineHeight: nepaliLineHeight(15),
                    }}
                  >
                    {pick(g.ne || name.ne, name.en)}
                  </Text>
                  {active ? <Ionicons name="checkmark" size={16} color={W_INK} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </>
  );
}
