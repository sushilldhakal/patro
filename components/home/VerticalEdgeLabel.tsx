import { Platform, View, type TextStyle } from "react-native";
import { Text } from "@/components/ui/Text";

/** Web `w-[1.375rem]` — sun/festival edge column. */
export const CALENDAR_EDGE_STRIP_WIDTH = 22;

type Props = {
  text: string;
  side: "left" | "right";
  color?: string;
  className?: string;
};

function edgeFontSize(label: string): number {
  if (label.length > 20) return 8;
  if (label.length > 16) return 9;
  if (label.length > 12) return 10;
  return 11;
}

/** Patro-style upright label along a cell edge — mirrors web {@link VerticalEdgeLabel}. */
export function VerticalEdgeLabel({ text, side, color, className }: Props) {
  if (!text || text === "—") return null;

  const label = text.replace(/\s+/g, "\u2009");
  const fontSize = edgeFontSize(label);

  const verticalWebStyle: TextStyle =
    Platform.OS === "web"
      ? ({
          writingMode: "vertical-rl",
          textOrientation: "mixed",
          fontSize,
          color,
          fontWeight: "600",
          letterSpacing: 0.4,
          whiteSpace: "nowrap",
        } as TextStyle)
      : {};

  const stripStyle = {
    position: "absolute" as const,
    top: 4,
    bottom: 4,
    width: CALENDAR_EDGE_STRIP_WIDTH,
    left: side === "left" ? 2 : undefined,
    right: side === "right" ? 2 : undefined,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    pointerEvents: "none" as const,
    zIndex: 3,
    overflow: "visible" as const,
  };

  if (Platform.OS === "web") {
    return (
      <View style={stripStyle}>
        <View
          style={
            side === "left"
              ? {
                  flex: 1,
                  width: "100%",
                  transform: [{ rotate: "180deg" }],
                  justifyContent: "center",
                  alignItems: "center",
                }
              : { flex: 1, width: "100%", justifyContent: "center", alignItems: "center" }
          }
        >
          <Text className={`font-num font-semibold ${className ?? ""}`} style={verticalWebStyle}>
            {label}
          </Text>
        </View>
      </View>
    );
  }

  // iOS / Android: rotated horizontal run (same visual as vertical-rl for HH:MM).
  const textRunWidth = Math.ceil(label.length * fontSize * 0.58) + 4;

  return (
    <View style={stripStyle}>
      <View
        style={{
          width: textRunWidth,
          height: fontSize + 6,
          justifyContent: "center",
          alignItems: "center",
          overflow: "visible",
        }}
      >
        <Text
          className={`font-num ${className ?? "font-semibold"}`}
          style={{
            color,
            fontSize,
            width: textRunWidth,
            textAlign: "center",
            letterSpacing: 0.4,
            transform: [{ rotate: side === "left" ? "-90deg" : "90deg" }],
          }}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}
