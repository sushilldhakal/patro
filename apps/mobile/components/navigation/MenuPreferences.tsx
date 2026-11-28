import { Pressable, View } from "react-native";
import { Text } from "@/components/ui/Text";
import { Ionicons } from "@/components/icons/Ionicons";
import { useAuth } from "@/lib/auth/AuthContext";
import { useLocale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme-context";
import { nepaliTextStyle } from "@/lib/nepali-text";
import { useCalculationSystemToggle, useCalendarSystemToggle } from "@vedic-patro/features/patro-date";
import { ListGroup, ListRow } from "@vedic-patro/ui/kit/account";
import { nativeShadow } from "@vedic-patro/design-tokens";
import { haptics } from "@vedic-patro/ui/motion";

type Option = { key: string; label: string; icon?: keyof typeof Ionicons.glyphMap; iconOnly?: boolean; active: boolean; onPress: () => void };

/**
 * The foot of the side menu, and the app's one way to the account now that the bottom bar has no
 * profile tab: "लगइन" while signed out, "सेटिङ" once signed in. Both open the profile page.
 *
 * Above it, the switches people reach for most (BS | AD, language, theme, Drik | Surya Siddhanta),
 * each a full-width segmented pill under its name, every option visible, the chosen one raised.
 * One tap changes it without opening settings.
 */
export function MenuPreferences({ onNavigate }: { onNavigate: (href: string) => void }) {
  const { t, lang, setLang } = useLocale();
  const { isDark, setPreference } = useTheme();
  const { isAuthenticated } = useAuth();
  const calendar = useCalendarSystemToggle();
  const calculation = useCalculationSystemToggle();

  return (
    <View className="gap-4">
      <View className="rounded-3xl border border-border bg-card px-4">
        <Preference first icon="calendar-outline" label={t("calendar_system.label")}>
          {calendar.options.map((o) => ({ key: o.calendar, label: o.label, active: o.active, onPress: () => calendar.select(o.calendar) }))}
        </Preference>
        <Preference icon="language-outline" label={t("language")}>
          {[
            { key: "ne", label: t("switch_to_nepali"), active: lang === "ne", onPress: () => void setLang("ne") },
            { key: "en", label: t("switch_to_english"), active: lang === "en", onPress: () => void setLang("en") },
          ]}
        </Preference>
        <Preference icon="contrast-outline" label={t("theme_label")}>
          {[
            { key: "light", label: t("theme_light"), icon: "sunny-outline", iconOnly: true, active: !isDark, onPress: () => setPreference("light") },
            { key: "dark", label: t("theme_dark"), icon: "moon-outline", iconOnly: true, active: isDark, onPress: () => setPreference("dark") },
          ]}
        </Preference>
        <Preference icon="planet-outline" label={t("calculation_system.label")}>
          {calculation.options.map((o) => ({
            key: o.system,
            label: o.system === "drik" ? o.label : t("calculation_system.surya_short"),
            active: o.active,
            onPress: () => calculation.select(o.system),
          }))}
        </Preference>
      </View>
      <ListGroup>
        <ListRow
          icon={isAuthenticated ? "sliders" : "user"}
          tint="teal"
          title={isAuthenticated ? t("ui.settings.title") : t("ui.nav.log_in")}
          onPress={() => onNavigate("/account")}
        />
      </ListGroup>
    </View>
  );
}

/** One line: the preference's icon and name on the left, a compact segmented pill on the right. */
function Preference({ icon, label, first, children }: { icon: keyof typeof Ionicons.glyphMap; label: string; first?: boolean; children: Option[] }) {
  const { colors } = useTheme();
  return (
    <View className={first ? "min-h-14 flex-row items-center gap-3" : "min-h-14 flex-row items-center gap-3 border-t border-border"}>
      <Ionicons name={icon} size={18} color={colors.mutedForeground} />
      <Text className="min-w-0 flex-1 text-sm font-semibold text-foreground" numberOfLines={1} style={nepaliTextStyle()}>
        {label}
      </Text>
      <Segmented options={children} />
    </View>
  );
}

function Segmented({ options }: { options: Option[] }) {
  const { colors } = useTheme();
  return (
    <View accessibilityRole="tablist" className="h-9 shrink-0 flex-row rounded-full bg-muted p-0.5">
      {options.map((o) => (
        <Pressable
          key={o.key}
          accessibilityRole="tab"
          accessibilityState={{ selected: o.active }}
          accessibilityLabel={o.label}
          onPress={() => {
            if (o.active) return;
            haptics.tick();
            o.onPress();
          }}
          hitSlop={4}
          className={o.iconOnly ? "w-10 items-center justify-center rounded-full active:opacity-70" : "items-center justify-center rounded-full px-3 active:opacity-70"}
          style={o.active ? [{ backgroundColor: colors.background }, nativeShadow("sm")] : undefined}
        >
          {o.iconOnly && o.icon ? (
            <Ionicons name={o.icon} size={17} color={o.active ? colors.foreground : colors.mutedForeground} />
          ) : (
            <Text
              numberOfLines={1}
              className={o.active ? "text-sm font-bold text-foreground" : "text-sm font-semibold text-muted-foreground"}
              style={nepaliTextStyle()}
            >
              {o.label}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}
