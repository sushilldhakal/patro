import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme as useSystemColorScheme, View } from "react-native";
import * as SystemUI from "expo-system-ui";
import { colorScheme as nativeWindColorScheme } from "nativewind";
import { darkTheme, lightTheme, type ThemeColors } from "@/lib/theme";
import { nativeWindThemeVars } from "@/lib/nativewind-theme-vars";
import { cn } from "@/lib/utils";
import {
  getStoredThemePreference,
  setStoredThemePreference,
  type ThemePreference,
} from "@/lib/theme-storage";

export type { ThemePreference };

type ThemeContextValue = {
  preference: ThemePreference;
  resolvedTheme: "light" | "dark";
  isDark: boolean;
  colors: ThemeColors;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveTheme(
  preference: ThemePreference,
  system: "light" | "dark" | null | undefined,
): "light" | "dark" {
  if (preference === "light" || preference === "dark") return preference;
  return system === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    void (async () => {
      const stored = await getStoredThemePreference();
      if (stored) setPreferenceState(stored);
    })();
  }, []);

  const resolvedTheme = resolveTheme(
    preference,
    systemScheme === "light" || systemScheme === "dark" ? systemScheme : null,
  );
  const colors = resolvedTheme === "dark" ? darkTheme : lightTheme;

  useEffect(() => {
    nativeWindColorScheme.set(preference === "system" ? "system" : resolvedTheme);
  }, [preference, resolvedTheme]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    void setStoredThemePreference(next);
  };

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolvedTheme,
      isDark: resolvedTheme === "dark",
      colors,
      setPreference,
    }),
    [preference, resolvedTheme, colors],
  );

  return (
    <ThemeContext.Provider value={value}>
      <View
        className={cn("flex-1 bg-background", resolvedTheme === "dark" && "dark")}
        style={[nativeWindThemeVars(resolvedTheme), { flex: 1, color: colors.foreground }]}
      >
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function useThemeColors(): ThemeColors {
  return useTheme().colors;
}
