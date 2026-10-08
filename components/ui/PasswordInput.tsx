import { useState } from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";
import { Ionicons } from "@/components/icons/Ionicons";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";

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
        style={[style, { paddingRight: 48 }]}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={8}
        className="absolute right-1 h-10 w-10 items-center justify-center rounded-full active:bg-muted"
        accessibilityRole="button"
        accessibilityLabel={pick(
          visible ? "पासवर्ड लुकाउनुहोस्" : "पासवर्ड देखाउनुहोस्",
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
