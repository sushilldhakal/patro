import type { ReactNode } from "react";
import { Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { usePressScale } from "@vedic-patro/ui/gestures";

type Props = {
  children: ReactNode;
  /** Optional when a `Link asChild` wraps the card and hands it the press. */
  onPress?: () => void;
  className?: string;
  label?: string;
  disabled?: boolean;
};

/**
 * A card or row that sinks under the finger and springs back, on the UI thread. The scale sits on
 * an outer view that carries only that animated style, and the look (`className`) on the pressable
 * inside it, so NativeWind and Reanimated never share one `style`.
 */
export function PressCard({ children, onPress, className, label, disabled }: Props) {
  const press = usePressScale({ disabled });
  return (
    <Animated.View style={press.animatedStyle}>
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={label}
        pressRetentionOffset={16}
        className={className}
        {...press.handlers}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
