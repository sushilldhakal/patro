import type { ReactNode } from "react";
import { Modal, Platform, Pressable, TextInput, View, type ViewStyle } from "react-native";
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { space } from "@vedic-patro/design-tokens";
import { haptics } from "@vedic-patro/ui/motion";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocale } from "@/lib/i18n";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useThemeColors } from "@/lib/theme-context";

type Props = {
  open: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  placeholder: string;
  /** Spoken name of the search field. */
  label: string;
  /** The results; `contentContainerStyle` keeps them clear of the top and of the floating field. */
  children: (contentContainerStyle: ViewStyle) => ReactNode;
};

/**
 * A search sheet drawn like Apple Calendar's: the results fill the sheet, and the search field floats at
 * its foot beside a round close button, riding on the keyboard as it rises. iOS raises it as the system
 * page sheet (the same motion as "+"), Android slides it up full screen. Festival search and the place
 * picker both use it.
 */
export function SearchSheetFrame({ open, onClose, query, onQueryChange, placeholder, label, children }: Props) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();

  /* The field sits on the keyboard as it rises, frame by frame, like Voice Memos' and Calendar's.
     (KeyboardAvoidingView measured the page sheet wrong and left the field under the keyboard.) */
  const keyboard = useAnimatedKeyboard();
  const restOffset = Math.max(insets.bottom, space.md);
  // Android resizes the window for the keyboard itself, so the field is already above it there.
  const followKeyboard = Platform.OS === "ios";
  /* Everything the bar needs is in this one animated style: a plain style or class beside an
     animated one gets dropped. */
  const barStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingHorizontal: space.lg,
    transform: [
      { translateY: -Math.max((followKeyboard ? keyboard.height.get() : 0) + space.sm, restOffset) },
    ],
  }));

  const contentContainerStyle: ViewStyle = {
    paddingTop: Platform.OS === "ios" ? space.lg : insets.top + space.sm,
    paddingHorizontal: space.xl,
    // Clear of the floating search field.
    paddingBottom: space["5xl"] * 2.5,
  };

  const close = () => {
    haptics.tick();
    onClose();
  };

  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {children(contentContainerStyle)}

        {/* The floating search field and the round close button, at the foot like Apple Calendar's. */}
        <Animated.View style={barStyle}>
          <View className="h-14 min-w-0 flex-1 flex-row items-center gap-2 rounded-full border border-border bg-card px-4 shadow-md">
            <Ionicons name="search-outline" size={22} color={colors.foreground} />
            <TextInput
              autoFocus
              value={query}
              onChangeText={onQueryChange}
              placeholder={placeholder}
              placeholderTextColor={colors.mutedForeground}
              accessibilityLabel={label}
              returnKeyType="search"
              autoCorrect={false}
              className="min-w-0 flex-1 text-body text-foreground"
              style={nepaliTextStyle(18)}
            />
            {query ? (
              <Pressable onPress={() => onQueryChange("")} hitSlop={8} accessibilityLabel={t("ui.search.search")}>
                <Ionicons name="close-circle" size={20} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>
          <Pressable
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={t("ui.search.cancel")}
            className="h-14 w-14 items-center justify-center rounded-full border border-border bg-card shadow-md active:opacity-60"
          >
            <Ionicons name="close" size={26} color={colors.foreground} />
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}
