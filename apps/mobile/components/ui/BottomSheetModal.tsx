import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeColors } from "@/lib/theme-context";

const OPEN_MS = 280;
const CLOSE_MS = 220;

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Applied to the sliding panel (not the backdrop). */
  sheetStyle?: ViewStyle;
  maxHeight?: ViewStyle["maxHeight"];
  keyboardAvoiding?: boolean;
  /** Lift the sheet above the software keyboard (use instead of double-stacking with KAV). */
  keyboardInset?: number;
  /** Phone: slide from bottom. Tablet pickers: fade + scale centered. */
  variant?: "bottom" | "center";
};

/**
 * Bottom drawer with backdrop fade + sheet slide in sync (avoids RN `animationType="slide"` flash).
 */
export function BottomSheetModal({
  visible,
  onClose,
  children,
  sheetStyle,
  maxHeight = "88%",
  keyboardAvoiding = false,
  keyboardInset = 0,
  variant = "bottom",
}: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const sheetTravel = useRef(Math.max(Dimensions.get("window").height * 0.55, 320)).current;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: OPEN_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (mounted) {
      Animated.timing(progress, {
        toValue: 0,
        duration: CLOSE_MS,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, mounted, progress]);

  if (!mounted) return null;

  const backdropOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [sheetTravel, 0],
  });
  const centerScale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });
  const centerOpacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const isCenter = variant === "center";

  const themedSheetStyle: ViewStyle = isCenter
    ? {
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
      }
    : {
        backgroundColor: colors.card,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        overflow: "hidden",
        paddingBottom: Math.max(insets.bottom, 8),
      };

  const body = (
    <View style={[styles.root, isCenter && styles.rootCenter]}>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]}
      />
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close"
      />
      <Animated.View
        style={[
          isCenter ? styles.sheetCenter : styles.sheet,
          !isCenter && {
            maxHeight,
            transform: [{ translateY }],
            marginBottom: keyboardInset > 0 ? keyboardInset : 0,
          },
          isCenter && {
            maxHeight,
            opacity: centerOpacity,
            transform: [{ scale: centerScale }],
          },
          themedSheetStyle,
          sheetStyle,
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {keyboardAvoiding && keyboardInset <= 0 ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    width: "100%",
  },
  rootCenter: {
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  sheetCenter: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    borderRadius: 16,
    overflow: "hidden",
  },
});
