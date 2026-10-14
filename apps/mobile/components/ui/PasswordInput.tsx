import { useState } from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { space } from "@vedic-patro/design-tokens";
import { tFor } from "@vedic-patro/i18n/runtime";

/** Password field with an eye button that toggles between hidden and visible text. */
export function PasswordInput({ style, className, ...props }: TextInputProps) {
  const colors = useThemeColors();
  const { pick } = useLocale();
  const [visible, setVisible] = useState(false);

  return (
    <View className="justify-center">
      <TextInput
        {...props}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        className={className}
        style={[style, { paddingRight: space["5xl"] }]}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        className="absolute right-1 h-10 w-10 items-center justify-center rounded-full active:bg-muted"
        accessibilityRole="button"
        accessibilityLabel={pick(
          visible ? tFor("ne", "ui.ui.x_41ccbc34") : tFor("ne", "ui.ui.x_5abec41f"),
          visible ? "Hide password" : "Show password",
        )}
        accessibilityState={{ selected: visible }}
      >
        <Ionicons
          name={visible ? "eye-off-outline" : "eye-outline"}
          size={20}
          color={visible ? colors.secondary : colors.mutedForeground}
        />
      </Pressable>
    </View>
  );
}
