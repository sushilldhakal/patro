import { View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { useColorScheme } from "nativewind";
import { brand, mix, mobileRoles, withAlpha } from "@vedic-patro/design-tokens";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { figureInfo, suryaFigure, SURYA_FIGURE_BOX, type Shape, type Tone } from "@vedic-patro/drawing/learn/surya-figures";
import { useLocale } from "@vedic-patro/i18n/react";
import { Text } from "@vedic-patro/ui";
import type { SuryaFigureProps } from "../contract";

function ShapeView({ s, tone }: { s: Shape; tone: Record<Tone, string> }) {
  if (s.k === "text") {
    return (
      <SvgText x={s.x} y={s.y} textAnchor={s.anchor ?? "middle"} fontSize={s.size ?? 11} fontWeight={s.bold ? "600" : "400"} fill={tone[s.tone]}>
        {s.text}
      </SvgText>
    );
  }
  const style = {
    fill: s.fill ? tone[s.fill] : "none",
    stroke: s.stroke ? tone[s.stroke] : "none",
    strokeWidth: s.w ?? 1,
    strokeDasharray: s.dash,
    opacity: s.opacity,
  };
  if (s.k === "circle") return <Circle cx={s.x} cy={s.y} r={Math.max(0, s.r)} {...style} />;
  if (s.k === "line") return <Line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} {...style} />;
  return <Path d={s.d} {...style} />;
}

/** The website's Surya Siddhanta diagram, drawn with react-native-svg. */
export function SuryaFigure({ figureKey, phase, controls }: SuryaFigureProps) {
  const { lang } = useLocale();
  const { colorScheme } = useColorScheme();
  const roles = mobileRoles(colorScheme === "dark" ? "dark" : "light");
  const language = lang === "en" ? "en" : "ne";
  const info = figureInfo(figureKey, language);
  const frame = suryaFigure(figureKey, phase, language);
  const tone: Record<Tone, string> = {
    ink: roles.foreground,
    muted: roles.mutedForeground,
    faint: withAlpha(roles.foreground, 0.22),
    sun: brand.gold,
    moon: brand.offWhite,
    earth: roles.primary,
    accent: brand.saffron,
    shadow: mix(roles.foreground, 70, roles.card),
    planet: brand.verified,
  };
  return (
    <View className={documentsClasses.figure}>
      <Text className={documentsClasses.figureTitle}>{info.title}</Text>
      <View style={{ width: "100%", aspectRatio: SURYA_FIGURE_BOX.width / SURYA_FIGURE_BOX.height }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${SURYA_FIGURE_BOX.width} ${SURYA_FIGURE_BOX.height}`} accessibilityRole="image" accessibilityLabel={info.caption}>
          {frame.shapes.map((s, i) => (
            <ShapeView key={i} s={s} tone={tone} />
          ))}
        </Svg>
      </View>
      <View className={documentsClasses.figureReadout}>
        {frame.readout.map((line, i) =>
          line ? (
            <Text key={i} className="text-sm text-foreground">
              {line}
            </Text>
          ) : null,
        )}
      </View>
      <View className={documentsClasses.figureControls}>{controls}</View>
      <Text className={documentsClasses.figureCaption}>{info.caption}</Text>
    </View>
  );
}
