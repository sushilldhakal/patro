import type { ReactNode } from "react";
import { Pressable, TextInput, View } from "react-native";
import { brand, withAlpha } from "@vedic-patro/design-tokens";
import { __iconNode as StarNode } from "lucide-react/dist/esm/icons/star";
import { __iconNode as ChevronRightNode } from "lucide-react/dist/esm/icons/chevron-right";
import { __iconNode as ChevronDownNode } from "lucide-react/dist/esm/icons/chevron-down";
import { __iconNode as CheckNode } from "lucide-react/dist/esm/icons/check";
import { __iconNode as SearchNode } from "lucide-react/dist/esm/icons/search";
import { Sheet } from "@vedic-patro/ui";
import { LucideNative, type LucideIconNode } from "@/components/icons/LucideNative";
import { Text } from "@/components/ui/Text";
import { useLocale } from "@/lib/i18n";
import { useThemeColors } from "@/lib/theme-context";
import { useWatchlist, type WatchKind } from "@/lib/watchlist";

const CHANGE_SIZE = { xs: "text-xs", sm: "text-sm", base: "text-base" } as const;
const AVATAR_TINTS = [brand.blue, brand.green, brand.vermilion, brand.saffron, brand.gold];

/** A round badge with a scrip's or currency's first letters, tinted by its name so each keeps its colour. */
export function SymbolAvatar({ label, size = 44 }: { label: string; size?: number }) {
  const tint = AVATAR_TINTS[[...label].reduce((n, c) => n + c.charCodeAt(0), 0) % AVATAR_TINTS.length]!;
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: withAlpha(tint, 0.16) }}
    >
      <Text className="font-extrabold" style={{ color: tint, fontSize: size * 0.3 }} numberOfLines={1}>
        {label.slice(0, 3)}
      </Text>
    </View>
  );
}

/** ▲ 2.46% in green, ▼ in red, a dash when level; `text` replaces the percent (a rupee change). */
export function Change({ up, value, text, size = "sm" }: { up: boolean | null; value?: number; text?: string; size?: "xs" | "sm" | "base" }) {
  const { digits } = useLocale();
  const colors = useThemeColors();
  const color = up === null ? colors.mutedForeground : up ? colors.success : colors.destructive;
  const body = text ?? (value === undefined ? "" : `${Math.abs(value).toFixed(2)}%`);
  return (
    <Text className={`${CHANGE_SIZE[size]} font-semibold tabular-nums`} style={{ color }} numberOfLines={1}>
      {up === null ? "–" : up ? "▲" : "▼"} {digits(body)}
    </Text>
  );
}

/** The round star across from back: adds or removes the page's item on the watchlist. */
export function StarButton({ kind, id }: { kind: WatchKind; id: string }) {
  const { t } = useLocale();
  const colors = useThemeColors();
  const list = useWatchlist(kind);
  const on = list.has(id);
  return (
    <Pressable
      onPress={() => list.toggle(id)}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={t(on ? "market.watch_remove" : "market.watch_add")}
      hitSlop={10}
      className="size-11 items-center justify-center rounded-full border border-border bg-card active:opacity-70"
    >
      <LucideNative node={StarNode} size={22} color={on ? brand.gold : colors.foreground} fill={on ? brand.gold : "none"} strokeWidth={2} />
    </Pressable>
  );
}

/** A rounded card: a small muted title (with › when it opens a page), then its rows. */
export function MarketSection({ title, children, onPress }: { title: string; children: ReactNode; onPress?: () => void }) {
  const colors = useThemeColors();
  return (
    <View className="gap-2 rounded-3xl border border-border bg-card p-3">
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "link" : "header"}
        hitSlop={8}
        className="flex-row items-center gap-1 self-start active:opacity-70"
      >
        <Text className="text-base font-semibold text-muted-foreground">{title}</Text>
        {onPress ? <LucideNative node={ChevronRightNode} size={18} color={colors.mutedForeground} strokeWidth={2.2} /> : null}
      </Pressable>
      {children}
    </View>
  );
}

/** Two or more options in a pill track, the chosen one filled. */
export function PillSwitch<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View className="flex-row rounded-full bg-muted p-1">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            className={`flex-1 items-center rounded-full py-2 ${on ? "bg-card" : ""}`}
          >
            <Text className={`text-base font-semibold ${on ? "text-foreground" : "text-muted-foreground"}`}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A rounded filter button (icon, the current choice, ▾) that opens its {@link OptionSheet}. */
export function FilterChip({ icon, label, onPress }: { icon: LucideIconNode; label: string; onPress: () => void }) {
  const colors = useThemeColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      className="flex-row items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 active:opacity-70"
    >
      <LucideNative node={icon} size={18} color={colors.foreground} strokeWidth={2} />
      <Text className="text-base font-medium text-foreground">{label}</Text>
      <LucideNative node={ChevronDownNode} size={16} color={colors.mutedForeground} strokeWidth={2} />
    </Pressable>
  );
}

/** A bottom sheet of choices with a tick by the current one; choosing closes it. */
export function OptionSheet<T extends string>({
  open,
  title,
  value,
  options,
  onChange,
  onClose,
}: {
  open: boolean;
  title: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const colors = useThemeColors();
  return (
    <Sheet open={open} onClose={onClose} title={title} closeLabel={t("common.close")}>
      <View className="gap-1 pb-2">
        {options.map((o) => {
          const on = o.id === value;
          return (
            <Pressable
              key={o.id}
              onPress={() => {
                onChange(o.id);
                onClose();
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              className={`flex-row items-center justify-between rounded-2xl px-4 py-3.5 active:opacity-70 ${on ? "bg-muted" : ""}`}
            >
              <Text className="text-base text-foreground">{o.label}</Text>
              {on ? <LucideNative node={CheckNode} size={20} color={colors.foreground} strokeWidth={2.4} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

/** One row: avatar, name over a secondary line, then value over its change. */
export function QuoteRow({
  avatar,
  title,
  subtitle,
  value,
  change,
  onPress,
}: {
  avatar: string;
  title: string;
  subtitle?: string | null;
  value: string;
  change: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      className="flex-row items-center gap-3 py-2.5 active:opacity-70"
    >
      <SymbolAvatar label={avatar} />
      <View className="flex-1">
        <Text className="text-base font-bold text-foreground" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="text-sm text-muted-foreground" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View className="items-end">
        <Text className="text-base font-bold tabular-nums text-foreground">{value}</Text>
        {change}
      </View>
    </Pressable>
  );
}

/** The rounded search field of the market pages (symbol, company or currency). */
export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const colors = useThemeColors();
  return (
    <View className="flex-1 flex-row items-center gap-2 rounded-full border border-border bg-card px-4 py-3">
      <LucideNative node={SearchNode} size={20} color={colors.mutedForeground} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="characters"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        className="flex-1 text-base text-foreground"
      />
    </View>
  );
}
