import { useCallback, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import type { WheelGraha } from "@vedic-patro/domain/wheel-data";
import { usePlanetSelectMenu } from "@vedic-patro/features/panchanga";
import { brand, nativeShadow, wheel, withAlpha } from "@vedic-patro/design-tokens";
import { Text } from "@vedic-patro/ui";
import { GrahaPlanetIcon } from "./GrahaPlanetIcon";

export type PlanetSelectMenuProps = {
  grahas: WheelGraha[];
  selected: number;
  onSelect: (index: number) => void;
  className?: string;
  iconSize?: number;
  compact?: boolean;
};

const MENU_W = 228;

export function PlanetSelectMenu({ grahas, selected, onSelect, compact = false, iconSize }: PlanetSelectMenuProps) {
  const menu = usePlanetSelectMenu({ grahas, selected, onSelect });
  const { open, setOpen } = menu;
  const { width: sw, height: sh } = useWindowDimensions();
  const [anchor, setAnchor] = useState({ x: 0, y: 0, w: 36, h: 36 });
  const btnRef = useRef<View>(null);
  const size = compact ? 32 : 36;

  const openMenu = useCallback(() => {
    btnRef.current?.measureInWindow((x, y, w, h) => {
      setAnchor({ x, y, w, h });
      setOpen(true);
    });
  }, [setOpen]);

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
        accessibilityLabel={menu.label}
        accessibilityHint={menu.selectedName}
        className="items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          borderWidth: 1,
          borderColor: withAlpha(wheel.line, 0.32),
          backgroundColor: compact ? "transparent" : withAlpha(wheel.surface, 0.96),
        }}
      >
        <GrahaPlanetIcon graha={menu.selectedKey} size={iconSize ?? (compact ? 18 : 22)} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={menu.close}>
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={menu.close} accessibilityLabel={menu.closeLabel} />
          <View
            className="rounded-2xl py-1.5"
            style={{
              position: "absolute",
              left,
              top,
              width: MENU_W,
              maxHeight: menuH,
              borderWidth: 1,
              borderColor: withAlpha(wheel.line, 0.32),
              backgroundColor: withAlpha(wheel.surface, 0.96),
              ...nativeShadow("lg"),
            }}
          >
            {menu.options.map((o) => (
              <Pressable
                key={o.key}
                onPress={o.choose}
                accessibilityRole="button"
                accessibilityState={{ selected: o.active }}
                className="flex-row items-center gap-2.5 px-3 py-2"
                style={{ backgroundColor: o.active ? withAlpha(brand.vermilion, 0.28) : "transparent" }}
              >
                <GrahaPlanetIcon graha={o.key} size={22} />
                <View className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: o.color }} />
                <Text className="flex-1 text-base text-ill-midnight-foam" nativeClassName={o.active ? "font-bold" : "font-medium"}>
                  {o.name}
                </Text>
                {o.active ? <Text className="text-base text-ill-midnight-foam">{String.fromCharCode(0x2713)}</Text> : null}
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
}
