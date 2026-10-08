/**
 * The frame every 3D learn diagram sits in.
 *
 * It owns the canvas, the touch camera, the overlay text, the transport row and
 * fullscreen. A diagram itself is then only its scene plus a few numbers: what
 * to scrub, what to read out, what to label.
 */

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Modal, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@/components/icons/Ionicons";
import Slider from "@react-native-community/slider";
import { Canvas } from "@/components/learn/diagrams/LearnCanvas";
import {
  CameraRig,
  useDiagramGesture,
  type DiagramFrame,
  type DiagramViewRef,
} from "@/components/learn/diagrams/diagram-camera";
import type { DiagramLabel } from "@/components/learn/diagrams/diagram-labels";
import { Starfield } from "@/components/learn/diagrams/scene-parts";
import { VedicPatroLoader } from "@/components/branding/VedicPatroLoader";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { DIAGRAM_CANVAS_BG, DIAGRAM_LABEL_COLOR } from "@/lib/learn/diagram-theme";
import { nativeWindThemeVars } from "@/lib/nativewind-theme-vars";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useTheme } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

export type DiagramReadout = { k: string; v: string; tone?: "accent" | "warn" };
export type DiagramLegendItem = { color: string; label: string };
export type DiagramPreset = { label: string; value: number };

type CameraProps = {
  yaw?: number;
  pitch?: number;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  minPitch?: number;
  maxPitch?: number;
  fov?: number;
};

type SliderProps = {
  value: number;
  min: number;
  max: number;
  step?: number;
  label: string;
  onChange: (v: number) => void;
};

type Props = {
  title: string;
  caption?: string;
  /** Card height for the canvas; fullscreen always takes the window. */
  height?: number;
  camera?: CameraProps;
  /** How much world the scene needs kept on screen, as half-extents. */
  frame: DiagramFrame;
  target?: [number, number, number];
  /** Radians per second of drift before the first touch. */
  idleSpin?: number;
  stars?: boolean;
  legend?: DiagramLegendItem[];
  readouts?: DiagramReadout[];
  slider?: SliderProps;
  playing?: boolean;
  onPlayToggle?: () => void;
  presets?: DiagramPreset[];
  onPreset?: (v: number) => void;
  /** Which preset reads as current — usually the clock value. */
  presetValue?: number;
  presetTolerance?: number;
  /** A diagram's own chips, shown under the transport row. */
  extraControls?: ReactNode;
  children: (api: { onLabels: (labels: DiagramLabel[]) => void; fullscreen: boolean }) => ReactNode;
};

export function LearnDiagram3D({
  title,
  caption,
  height = 260,
  camera,
  frame,
  target = [0, 0, 0],
  idleSpin = 0.05,
  stars = true,
  legend,
  readouts,
  slider,
  playing,
  onPlayToggle,
  presets,
  onPreset,
  presetValue,
  presetTolerance = 3,
  extraControls,
  children,
}: Props) {
  const { pick } = useLocale();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const [fullscreen, setFullscreen] = useState(false);
  const [labels, setLabels] = useState<DiagramLabel[]>([]);
  const [ready, setReady] = useState(false);
  const [hinted, setHinted] = useState(false);

  const gesture = useDiagramGesture({
    yaw: camera?.yaw,
    pitch: camera?.pitch,
    zoom: camera?.zoom,
    minZoom: camera?.minZoom,
    maxZoom: camera?.maxZoom,
    minPitch: camera?.minPitch,
    maxPitch: camera?.maxPitch,
  });

  /* The canvas is torn down and rebuilt when it moves into the modal, so the
     labels from the old one would otherwise hang over the new frame. */
  useEffect(() => {
    setLabels([]);
    setReady(false);
  }, [fullscreen]);

  const canvasHeight = fullscreen ? windowHeight : height;
  const overlayTop = fullscreen ? Math.max(insets.top, 24) + 12 : 10;

  const scene = useMemo(
    () => children({ onLabels: setLabels, fullscreen }),
    [children, fullscreen],
  );

  const body = (
    <View
      className={
        fullscreen
          ? "flex-1 bg-background"
          : "my-3 overflow-hidden rounded-2xl border border-border bg-card"
      }
    >
      {!fullscreen ? (
        <View className="flex-row items-center justify-between border-b border-border/60 px-3 py-2">
          <Text
            className="flex-1 text-xs font-bold uppercase tracking-wide text-secondary"
            style={nepaliTextStyle(11)}
          >
            {title}
          </Text>
          <Text className="text-[12px] text-muted-foreground" style={nepaliTextStyle(10)}>
            {pick("घुमाउन तान्नुहोस्", "Drag to rotate")}
          </Text>
        </View>
      ) : null}

      <View
        style={{ height: canvasHeight, backgroundColor: DIAGRAM_CANVAS_BG }}
        onTouchStart={() => setHinted(true)}
        {...gesture.panHandlers}
      >
        <Canvas
          camera={{ position: [0, 2.2, 4], fov: camera?.fov ?? 46, near: 0.05, far: 200 }}
          gl={{ antialias: true }}
          /* Capped: a 3x phone screen does not need a 3x framebuffer for a few
             spheres, and the fill rate is what costs battery here. */
          dpr={[1, 1.75]}
          onCreated={({ gl }) => gl.setClearColor(DIAGRAM_CANVAS_BG)}
        >
          <Suspense fallback={null}>
            <CameraRig
              view={gesture.view as DiagramViewRef}
              frame={frame}
              target={target}
              idleSpin={idleSpin}
            />
            {stars ? <Starfield /> : null}
            <SceneReady onReady={() => setReady(true)} />
            {scene}
          </Suspense>
        </Canvas>

        {/* Real Devanagari over the canvas, placed from the scene's own projection. */}
        <View pointerEvents="none" className="absolute inset-0">
          {labels.map((label) => (
            <Text
              key={label.id}
              className="absolute text-[12px] font-semibold"
              style={[
                nepaliTextStyle(label.size ?? 10),
                {
                  left: label.x + (label.dx ?? 0),
                  top: label.y + (label.dy ?? 0),
                  color: label.color ?? DIAGRAM_LABEL_COLOR.body,
                  opacity: label.color === DIAGRAM_LABEL_COLOR.dim ? 0.68 : 1,
                  fontSize: label.size ?? 10,
                  /* Centred on the anchor without measuring: the text box is
                     free to overflow its own zero-width origin, and it is
                     lifted by half a line so the anchor is not covered. */
                  transform: [{ translateX: -40 }, { translateY: -7 }],
                  width: 80,
                  textAlign: "center",
                  textShadowColor: "rgba(0,0,0,0.85)",
                  textShadowRadius: 3,
                },
              ]}
            >
              {label.text}
            </Text>
          ))}
        </View>

        {!ready ? (
          <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
            <VedicPatroLoader />
          </View>
        ) : null}

        {fullscreen ? (
          <View
            pointerEvents="none"
            className="absolute left-2.5 rounded-lg bg-black/45 px-2.5 py-1"
            style={{ top: overlayTop }}
          >
            <Text
              className="text-[12px] font-bold"
              style={[nepaliTextStyle(11), { color: DIAGRAM_LABEL_COLOR.rashi, fontSize: 11 }]}
            >
              {title}
            </Text>
          </View>
        ) : null}

        {legend?.length ? (
          <View
            pointerEvents="none"
            className="absolute left-2.5 flex-row flex-wrap gap-x-2.5 gap-y-1 pr-16"
            style={{ top: fullscreen ? overlayTop + 30 : overlayTop }}
          >
            {legend.map((item) => (
              <View key={item.label} className="flex-row items-center gap-1 rounded-full bg-black/45 px-2 py-0.5">
                <View
                  style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: item.color }}
                />
                <Text
                  className="text-[12px]"
                  style={[
                    nepaliTextStyle(9),
                    { color: DIAGRAM_LABEL_COLOR.dim, fontSize: 9, opacity: 0.68 },
                  ]}
                >
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        <View className="absolute right-2.5 gap-2" style={{ top: overlayTop }}>
          <RoundButton
            icon="add"
            label={pick("नजिक", "Zoom in")}
            onPress={() => gesture.zoomBy(0.8)}
          />
          <RoundButton
            icon="remove"
            label={pick("टाढा", "Zoom out")}
            onPress={() => gesture.zoomBy(1.25)}
          />
          <RoundButton
            icon="refresh"
            label={pick("पूर्ववत्", "Reset view")}
            onPress={gesture.reset}
          />
          <RoundButton
            icon={fullscreen ? "close" : "expand"}
            label={fullscreen ? pick("बन्द गर्नुहोस्", "Exit fullscreen") : pick("पूरा स्क्रिन", "Fullscreen")}
            onPress={() => setFullscreen((f) => !f)}
          />
        </View>

        {!hinted && !fullscreen ? (
          <View pointerEvents="none" className="absolute inset-x-0 bottom-2 items-center">
            <View className="rounded-full bg-black/45 px-3 py-1">
              <Text
                className="text-[12px]"
                style={[
                  nepaliTextStyle(10),
                  { color: DIAGRAM_LABEL_COLOR.dim, fontSize: 10, opacity: 0.68 },
                ]}
              >
                {pick(
                  "एक औंलाले घुमाउनुहोस् · दुई औंलाले जुम",
                  "One finger rotates · pinch to zoom",
                )}
              </Text>
            </View>
          </View>
        ) : null}
      </View>

      <View
        className={
          fullscreen
            ? "dark absolute inset-x-0 bottom-0 gap-2 px-3 pt-2"
            : "gap-2 border-t border-border/60 px-3 py-2.5"
        }
        style={
          fullscreen
            ? [
                nativeWindThemeVars("dark"),
                {
                  backgroundColor: "rgba(6, 11, 20, 0.72)",
                  paddingBottom: Math.max(insets.bottom, 10),
                },
              ]
            : undefined
        }
      >
        {readouts?.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="items-center gap-2"
          >
            {readouts.map((r) => (
              <View
                key={r.k}
                className="rounded-lg border border-border/70 bg-muted/30 px-2 py-1"
              >
                <Text
                  className="text-[12px] uppercase tracking-wide text-muted-foreground"
                  style={[nepaliTextStyle(9), { fontSize: 9 }]}
                >
                  {r.k}
                </Text>
                <Text
                  className={cn(
                    "text-[12px] font-bold",
                    r.tone === "accent" && "text-secondary",
                    r.tone === "warn" && "text-primary",
                  )}
                  style={nepaliTextStyle(12)}
                >
                  {r.v}
                </Text>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {slider ? (
          <View className="gap-1">
            <Text
              className="text-[12px] font-semibold text-foreground"
              style={nepaliTextStyle(11)}
            >
              {slider.label}
            </Text>
            <View className="flex-row items-center gap-1">
              {onPlayToggle ? (
                <Pressable
                  onPress={onPlayToggle}
                  accessibilityRole="button"
                  accessibilityLabel={playing ? pick("रोक्नुहोस्", "Pause") : pick("चलाउनुहोस्", "Play")}
                  className="h-8 w-8 items-center justify-center rounded-full border border-border bg-muted/40"
                >
                  <Ionicons
                    name={playing ? "pause" : "play"}
                    size={15}
                    color={DIAGRAM_LABEL_COLOR.body}
                  />
                </Pressable>
              ) : null}
              <Slider
                style={{ flex: 1 }}
                value={slider.value}
                minimumValue={slider.min}
                maximumValue={slider.max}
                step={slider.step ?? 0}
                onValueChange={slider.onChange}
                minimumTrackTintColor="#f4c542"
                maximumTrackTintColor="rgba(148, 163, 184, 0.45)"
                thumbTintColor="#f4c542"
              />
            </View>
          </View>
        ) : null}

        {presets?.length && onPreset ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="items-center gap-1.5"
          >
            {presets.map((p) => {
              const active =
                presetValue != null && Math.abs(presetValue - p.value) <= presetTolerance;
              return (
                <Pressable
                  key={p.label}
                  onPress={() => onPreset(p.value)}
                  accessibilityRole="button"
                  className={cn(
                    "rounded-full border px-2.5 py-1",
                    active ? "border-secondary bg-secondary/20" : "border-border bg-muted/20",
                  )}
                >
                  <Text
                    className={cn(
                      "text-[12px] font-semibold",
                      active ? "text-secondary" : "text-muted-foreground",
                    )}
                    style={[nepaliTextStyle(10), { fontSize: 10 }]}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {extraControls}
      </View>

      {caption && !fullscreen ? (
        <Text
          className="border-t border-border/60 px-3 py-2 text-xs leading-snug text-muted-foreground"
          style={nepaliTextStyle(12)}
        >
          {caption}
        </Text>
      ) : null}
    </View>
  );

  if (!fullscreen) return body;

  return (
    <Modal
      visible
      animationType="fade"
      supportedOrientations={["portrait", "landscape"]}
      onRequestClose={() => setFullscreen(false)}
    >
      {/* Outside the provider tree — the theme tokens have to be re-applied or
          every chip in the control bar loses its colours. */}
      <View
        className={cn("flex-1 bg-background", isDark && "dark")}
        style={nativeWindThemeVars(isDark ? "dark" : "light")}
      >
        {body}
      </View>
    </Modal>
  );
}

/** Mounts once the scene's textures have resolved — drops the loader. */
function SceneReady({ onReady }: { onReady: () => void }) {
  const called = useRef(false);
  useEffect(() => {
    if (called.current) return;
    called.current = true;
    onReady();
  }, [onReady]);
  return null;
}

function RoundButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-8 w-8 items-center justify-center rounded-full"
      style={{ backgroundColor: "rgba(6, 11, 20, 0.55)", borderWidth: 1, borderColor: "rgba(148,163,184,0.35)" }}
    >
      <Ionicons name={icon} size={15} color={DIAGRAM_LABEL_COLOR.body} />
    </Pressable>
  );
}
