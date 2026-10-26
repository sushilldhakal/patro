import { useRef, type ComponentRef, type ReactNode } from "react";
import { Pressable } from "react-native";
import Animated from "react-native-reanimated";
import { usePressScale } from "@vedic-patro/ui/gestures";
import { setZoomOrigin } from "@/lib/zoom-origin";

type Props = {
  children: ReactNode;
  onPress: () => void;
  className?: string;
  label?: string;
  disabled?: boolean;
  /** The card opens a full screen: note where it sits first, so that screen's `ZoomTransition` can grow out of it. */
  zoomToScreen?: boolean;
};

/**
 * A card or row that sinks under the finger and springs back, on the UI thread. The scale sits on
 * an outer view that carries only that animated style, and the look (`className`) on the pressable
 * inside it, so NativeWind and Reanimated never share one `style`.
 */
export function PressCard({ children, onPress, className, label, disabled, zoomToScreen }: Props) {
  const press = usePressScale({ disabled });
  const box = useRef<ComponentRef<typeof Pressable>>(null);

  const open = () => {
    if (!zoomToScreen || !box.current) {
      onPress();
      return;
    }
    box.current.measureInWindow((x, y, w, h) => {
      if (w > 0 && h > 0) setZoomOrigin({ x, y, w, h });
      onPress();
    });
  };

  return (
    <Animated.View style={press.animatedStyle}>
      <Pressable
        ref={box}
        onPress={open}
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
