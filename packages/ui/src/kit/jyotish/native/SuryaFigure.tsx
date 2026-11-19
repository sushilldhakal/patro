import { View } from "react-native";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import { useColorScheme } from "nativewind";
import { brand, midnight, mix, mobileRoles, withAlpha } from "@vedic-patro/design-tokens";
import { documentsClasses } from "@vedic-patro/design-tokens/classes/documents-classes";
import { figureInfo, figureView, suryaFigure, type KeyItem, type MathPart, type Shape, type Step, type Tone } from "@vedic-patro/drawing/learn/surya-figures";
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

/** What each mark and initial in the drawing stands for. */
function FigureKeyList({ items, tone }: { items: KeyItem[]; tone: Record<Tone, string> }) {
  return (
    <View className={documentsClasses.figureKey}>
      {items.map((item, i) => (
        <View key={i} className={documentsClasses.figureKeyItem}>
          <Svg width={18} height={12} viewBox="0 0 18 12">
            {item.as === "line" ? (
              <Line x1={1} y1={6} x2={17} y2={6} stroke={tone[item.tone]} strokeWidth={3} strokeLinecap="round" />
            ) : item.as === "ring" ? (
              <Circle cx={9} cy={6} r={4.5} fill="none" stroke={tone[item.tone]} strokeWidth={1.6} />
            ) : (
              <Circle cx={9} cy={6} r={5} fill={tone[item.tone]} stroke={tone.muted} strokeWidth={1.2} />
            )}
          </Svg>
          {item.mark ? (
            <Text className={`${documentsClasses.figureKeyMark} text-foreground`}>{item.mark}</Text>
          ) : null}
          <Text className={documentsClasses.figureKeyText}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
}

function Part({ part }: { part: MathPart }) {
  if (typeof part === "string") return <Text className="text-base text-foreground">{part}</Text>;
  return (
    <View className={documentsClasses.figureFrac}>
      <Text className={documentsClasses.figureFracNum}>{part.n}</Text>
      <Text className={documentsClasses.figureFracDen}>{part.d}</Text>
    </View>
  );
}

/** The worked arithmetic under the drawing, the same steps as the website. */
export function MathSteps({ steps, title }: { steps: Step[]; title: string }) {
  return (
    <View className={documentsClasses.figureMath}>
      <Text className={documentsClasses.figureMathTitle}>{title}</Text>
      {steps.map((step, i) => (
        <View key={i} className={documentsClasses.figureMathStep}>
          <Text className={documentsClasses.figureMathNumber}>{i + 1}.</Text>
          <View className={documentsClasses.figureMathBody}>
            <Text className={documentsClasses.figureMathSay}>{step.say}</Text>
            <View className={documentsClasses.figureMathEq}>
              {step.eq.map((part, j) => (
                <Part key={j} part={part} />
              ))}
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

/** The website's Surya Siddhanta diagram, drawn with react-native-svg. */
export function SuryaFigure({ figureKey, phase, controls }: SuryaFigureProps) {
  const { lang, t } = useLocale();
  const { colorScheme } = useColorScheme();
  const roles = mobileRoles(colorScheme === "dark" ? "dark" : "light");
  const language = lang === "en" ? "en" : "ne";
  const info = figureInfo(figureKey, language);
  const frame = suryaFigure(figureKey, phase, language);
  const view = figureView(figureKey, language);
  const tone: Record<Tone, string> = {
    ink: roles.foreground,
    muted: roles.mutedForeground,
    faint: withAlpha(roles.foreground, 0.22),
    sun: brand.gold,
    moon: brand.offWhite,
    earth: colorScheme === "dark" ? midnight.teal : brand.blue,
    accent: brand.saffron,
    shadow: mix(roles.foreground, 70, roles.card),
    planet: brand.verified,
  };
  return (
    <View className={documentsClasses.figure}>
      <Text className={documentsClasses.figureTitle}>{info.title}</Text>
      <View style={{ width: "100%", aspectRatio: view.w / view.h }}>
        <Svg width="100%" height="100%" viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} accessibilityRole="image" accessibilityLabel={info.caption}>
          {frame.shapes.map((s, i) => (
            <ShapeView key={i} s={s} tone={tone} />
          ))}
        </Svg>
      </View>
      {frame.key?.length ? <FigureKeyList items={frame.key} tone={tone} /> : null}
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
      {frame.steps?.length ? <MathSteps steps={frame.steps} title={t("documents.figure_math")} /> : null}
    </View>
  );
}
