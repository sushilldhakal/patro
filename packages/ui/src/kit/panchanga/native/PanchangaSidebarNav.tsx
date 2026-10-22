import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";
import Animated, {
  LinearTransition,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { cssInterop } from "nativewind";
import { cn } from "@vedic-patro/design-tokens/cn";
import { Box, Icon, Pressable, Text } from "@vedic-patro/ui";
import { panchangaPageClasses as pg } from "@vedic-patro/design-tokens/classes/panchanga-page-classes";
import { CSS_EASE_IN_OUT, DURATION, EASE_IN_OUT, useReducedMotionPref } from "@vedic-patro/ui/motion";
import { chevronRightIcon } from "../icons";
import type { PanchangaSidebarSectionView } from "../sidebar-types";

export type { PanchangaSidebarItemView, PanchangaSidebarLinkArgs, PanchangaSidebarSectionView } from "../sidebar-types";

const MotionView = cssInterop(Animated.View, { className: "style" });

const s = pg.sidebar;

/** Plan: the disclosure chevron turns over 180ms. Not a duration token. */
const CHEVRON_TURN_MS = 180;

const RAIL_MOVE = LinearTransition.duration(DURATION.standard).easing(EASE_IN_OUT).reduceMotion(ReduceMotion.System);

const PILL_TIMING = { duration: DURATION.standard, easing: EASE_IN_OUT, reduceMotion: ReduceMotion.System };

type Frame = { x: number; y: number; width: number; height: number };

function near(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.5;
}

function SectionChevron({ expanded, tone, reduced }: { expanded: boolean; tone: "secondary" | "muted"; reduced: boolean }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    setArmed(true);
  }, []);
  return (
    <Animated.View
      style={{
        transform: [{ rotate: expanded ? "-90deg" : "0deg" }],
        transitionProperty: "transform",
        transitionDuration: armed && !reduced ? CHEVRON_TURN_MS : 0,
        transitionTimingFunction: CSS_EASE_IN_OUT,
      }}
    >
      <Icon node={chevronRightIcon} size={16} tone={tone} />
    </Animated.View>
  );
}

export function PanchangaSidebarNav({
  title,
  label,
  sections,
  className,
  compact,
}: {
  title: string;
  label: string;
  sections: PanchangaSidebarSectionView[];
  className?: string;
  compact?: boolean;
}) {
  const reduced = useReducedMotionPref();
  const bodyRef = useRef<View>(null);
  const itemRefs = useRef<Record<string, View | null>>({});
  const [frames, setFrames] = useState<Record<string, Frame>>({});
  const [pillOn, setPillOn] = useState(false);
  const y = useSharedValue(0);
  const h = useSharedValue(0);
  const activeId = sections.flatMap((section) => section.items).find((item) => item.active)?.id ?? null;
  const frame = activeId ? frames[activeId] : undefined;

  const remember = useCallback((id: string, next: Frame) => {
    setFrames((prev) => {
      const cur = prev[id];
      if (cur && near(cur.x, next.x) && near(cur.y, next.y) && near(cur.width, next.width) && near(cur.height, next.height)) {
        return prev;
      }
      return { ...prev, [id]: next };
    });
  }, []);

  const measure = useCallback(
    (id: string) => {
      const item = itemRefs.current[id];
      const body = bodyRef.current;
      if (!item || !body) return;
      body.measureInWindow((bx, by) => {
        item.measureInWindow((ix, iy, width, height) => {
          remember(id, { x: ix - bx, y: iy - by, width, height });
        });
      });
    },
    [remember],
  );

  useEffect(() => {
    if (!activeId || !frame) return;
    if (reduced || !pillOn) {
      y.set(frame.y);
      h.set(frame.height);
      if (!reduced && !pillOn) setPillOn(true);
      return;
    }
    if (!near(y.get(), frame.y)) y.set(withTiming(frame.y, PILL_TIMING));
    if (!near(h.get(), frame.height)) h.set(withTiming(frame.height, PILL_TIMING));
  }, [activeId, frame, h, pillOn, reduced, y]);

  const pillStyle = useAnimatedStyle(() => ({
    height: h.get(),
    transform: [{ translateY: y.get() }],
  }));

  const showPill = pillOn && !reduced && frame != null;

  const body = (
    <>
      <Text className={s.navTitle}>{title}</Text>
      <Box className={compact ? s.navBody : cn("max-h-[70vh]", s.navBody)}>
        <View ref={bodyRef} collapsable={false}>
          {showPill && frame ? (
            <MotionView
              pointerEvents="none"
              accessible={false}
              className="rounded-xl border border-secondary/30 bg-secondary/15"
              style={[{ position: "absolute", left: frame.x, width: frame.width }, pillStyle]}
            />
          ) : null}
          {sections.map((section) => (
            <MotionView key={section.id} layout={RAIL_MOVE} className={cn("pb-1", s.section)}>
              <Pressable
                onPress={section.onToggle}
                className={cn("flex-row", s.sectionHead, section.hasActive && !section.expanded && "bg-secondary/5")}
              >
                <SectionChevron expanded={section.expanded} tone={section.hasActive ? "secondary" : "muted"} reduced={reduced} />
                <Text className={cn(s.sectionTitle, section.hasActive ? s.sectionTitleActive : s.sectionTitleIdle)}>{section.title}</Text>
              </Pressable>
              {section.items.length > 0 ? (
                <Box className={s.list}>
                  {section.items.map((item) => (
                    <MotionView key={item.id} layout={RAIL_MOVE} className={s.item}>
                      <View
                        ref={(node) => {
                          itemRefs.current[item.id] = node;
                        }}
                        collapsable={false}
                        onLayout={() => measure(item.id)}
                      >
                        <Pressable
                          onPress={item.onPress}
                          className={cn(s.link, !item.active && "active:bg-muted")}
                          nativeClassName={
                            item.active
                              ? showPill
                                ? "border border-transparent"
                                : "border border-secondary/30 bg-secondary/15"
                              : undefined
                          }
                        >
                          <Text className={cn(s.linkLabel, item.active ? s.linkLabelActive : s.linkLabelIdle)}>{item.label}</Text>
                          {item.blurb ? <Text className={s.linkBlurb}>{item.blurb}</Text> : null}
                        </Pressable>
                      </View>
                      {item.trailing}
                    </MotionView>
                  ))}
                </Box>
              ) : null}
            </MotionView>
          ))}
        </View>
      </Box>
    </>
  );

  if (compact) {
    return <Box className={cn("overflow-hidden", s.nav, className)} label={label}>{body}</Box>;
  }
  return (
    <Box className={cn("w-full shrink-0 overflow-hidden", s.nav, className)} label={label}>
      <ScrollView showsVerticalScrollIndicator={false}>{body}</ScrollView>
    </Box>
  );
}
