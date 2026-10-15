import { useId } from "react";
import { View } from "react-native";
import Svg, { G, Image, Marker, Path, Rect, Text as SvgText } from "react-native-svg";
import { useColorScheme } from "nativewind";
import { Text } from "@vedic-patro/ui";
import { mix, mobileRoles, withAlpha } from "@vedic-patro/design-tokens";
import { tmCardCap, tmCardPadLg } from "@vedic-patro/design-tokens/classes/learn-classes";
import { useLocale } from "@vedic-patro/i18n/react";
import {
  PIPELINE_ARROWS,
  PIPELINE_BOXES,
  PIPELINE_GRAHAS,
  PIPELINE_GROUPS,
  PIPELINE_H,
  PIPELINE_W,
  type PipelineAccent,
} from "@vedic-patro/domain/learn/server-pipeline";
import type { ServerPipelineDiagramProps } from "../contract";

export function ServerPipelineDiagram({ earthSrc, grahaSrc }: ServerPipelineDiagramProps) {
  const { t } = useLocale();
  const { colorScheme } = useColorScheme();
  const roles = mobileRoles(colorScheme === "dark" ? "dark" : "light");
  const caption = t("learn.study.pipeline.caption");
  const markerId = `pipe-arrow-${useId().replace(/:/g, "")}`;
  const teal = roles.success;
  const amber = roles.warning;
  const gold = roles.accent;
  const ink = roles.foreground;
  const faint = roles.mutedForeground;
  const strokeFor = (accent?: PipelineAccent) => (accent === "amber" ? amber : accent === "gold" ? gold : teal);
  const fillFor = (accent?: PipelineAccent) => mix(strokeFor(accent), accent === "gold" ? 12 : accent === "amber" ? 14 : 10, roles.card);

  return (
    <View className={tmCardPadLg}>
      <View style={{ width: "100%", aspectRatio: PIPELINE_W / PIPELINE_H }}>
        <Svg viewBox={`0 0 ${PIPELINE_W} ${PIPELINE_H}`} width="100%" height="100%" accessibilityRole="image" accessibilityLabel={caption}>
          <Marker id={markerId} markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <Path d="M0,0 L8,4 L0,8 Z" fill={faint} />
          </Marker>
          <Image href={earthSrc} x="24" y="36" width="48" height="48" opacity={0.92} />
          <SvgText x="80" y="58" fill={withAlpha(ink, 0.78)} fontSize={12}>
            {t("learn.study.pipeline.api_name")}
          </SvgText>
          <SvgText x="80" y="74" fill={teal} fontSize={12} fontWeight="600">
            {t("learn.study.pipeline.api_transport")}
          </SvgText>
          {PIPELINE_GROUPS.map((group) => (
            <SvgText key={group.labelKey} x={group.x} y={group.y} fill={amber} fontSize={11} fontWeight="700">
              {t(group.labelKey)}
            </SvgText>
          ))}
          {PIPELINE_BOXES.map((box) => {
            const lines = t(box.labelKey).split("\n");
            return (
              <G key={box.id}>
                <Rect x={box.x} y={box.y} width={box.w} height={box.h} rx={10} fill={fillFor(box.accent)} stroke={strokeFor(box.accent)} strokeWidth={1.2} opacity={0.95} />
                {lines.map((line, i) => (
                  <SvgText
                    key={i}
                    x={box.x + box.w / 2}
                    y={box.y + box.h / 2 + (i - (lines.length - 1) / 2) * 13}
                    fill={ink}
                    fontSize={12}
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    {line}
                  </SvgText>
                ))}
              </G>
            );
          })}
          <G transform="translate(520, 268)">
            {PIPELINE_GRAHAS.map((key, i) =>
              grahaSrc?.[key] ? (
                <Image key={key} href={grahaSrc[key]} x={(i % 4) * 52} y={Math.floor(i / 4) * 52} width={40} height={40} opacity={0.9} />
              ) : null,
            )}
            <SvgText x={0} y={118} fill={faint} fontSize={11}>
              {t("learn.study.pipeline.grahas_note")}
            </SvgText>
          </G>
          {PIPELINE_ARROWS.map((d) => (
            <Path key={d} d={d} fill="none" stroke={faint} strokeWidth={1.4} markerEnd={`url(#${markerId})`} opacity={0.85} />
          ))}
        </Svg>
      </View>
      <Text className={tmCardCap}>{caption}</Text>
    </View>
  );
}
