import { View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, { interpolate, useAnimatedStyle } from "react-native-reanimated";
import { Stack } from "expo-router";
import { useGestureProgress, useSpringPan } from "@vedic-patro/ui/gestures";
import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";

/** Where the box rests, as offsets from the middle of the track. */
const SNAPS = [-110, 0, 110];

/**
 * Proof that the animation pipeline runs on a real build: worklets compile, the gesture reaches
 * the UI thread, springs carry the release velocity, and a second value follows the first.
 * Not linked from anywhere; open it with the `vedicpatro://motion-lab` link.
 */
export default function MotionLab() {
  const { gesture, x, style, snapTo } = useSpringPan({ axis: "x", snapPoints: { x: SNAPS }, initialIndex: 1 });
  const progress = useGestureProgress(x, [SNAPS[0]!, SNAPS[2]!]);
  const glow = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.5, 1], [0.35, 1, 0.35]),
    transform: [{ scale: interpolate(progress.get(), [0, 0.5, 1], [0.9, 1.1, 0.9]) }],
  }));

  return (
    <View className="flex-1 items-center justify-center gap-8 bg-background px-6">
      <Stack.Screen options={{ title: "Motion lab" }} />
      <Text className="text-center text-base text-foreground">
        Drag the box. It should follow your finger, stretch stiffly past the ends, and spring to the nearest stop.
      </Text>
      <GestureDetector gesture={gesture}>
        <Animated.View style={style}>
          <Animated.View className="h-24 w-24 rounded-3xl bg-secondary" style={glow} />
        </Animated.View>
      </GestureDetector>
      <View className="flex-row gap-3">
        <Button label="Left" onPress={() => snapTo({ x: 0 })} />
        <Button label="Middle" onPress={() => snapTo({ x: 1 })} />
        <Button label="Right" onPress={() => snapTo({ x: 2 })} />
      </View>
    </View>
  );
}
