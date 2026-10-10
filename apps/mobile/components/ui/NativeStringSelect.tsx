import { useEffect, useState } from "react";
import { Platform, Pressable, View, type ViewStyle } from "react-native";
import { Text } from "@/components/ui/Text";
import { Picker } from "@react-native-picker/picker";
import { Ionicons } from "@/components/icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { useLocale } from "@/lib/i18n";
import { useBreakpoint } from "@/lib/responsive";
import { useThemeColors } from "@/lib/theme-context";
import { cn } from "@/lib/utils";

export type StringSelectOption = { value: string; label: string };

type Props = {
  value: string;
  options: StringSelectOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  minWidth?: number;
  className?: string;
};

function WebStringSelect({ value, options, onChange, ariaLabel, minWidth = 96 }: Props) {
  const colors = useThemeColors();
  const selected = options.find((o) => o.value === value);

  return (
    <label
      style={{
        position: "relative",
        display: "flex",
        minWidth,
        height: 36,
        alignItems: "center",
        gap: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.card,
        paddingLeft: 10,
        paddingRight: 6,
        cursor: "pointer",
        width: "100%",
      }}
    >
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          width: "100%",
          height: "100%",
          cursor: "pointer",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span
        style={{
          flex: 1,
          fontSize: 15,
          color: colors.foreground,
          pointerEvents: "none",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {selected?.label ?? "—"}
      </span>
      <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
    </label>
  );
}

function AndroidStringSelect({ value, options, onChange, minWidth = 96 }: Props) {
  const colors = useThemeColors();
  return (
    <View
      className="h-9 justify-center overflow-hidden rounded-lg border border-border bg-card"
      style={{ minWidth, width: "100%" }}
    >
      <Picker
        selectedValue={value}
        onValueChange={(v) => onChange(String(v))}
        mode="dropdown"
        dropdownIconColor={colors.mutedForeground}
        style={{ height: 36, marginTop: -4, marginBottom: -4 }}
      >
        {options.map((o) => (
          <Picker.Item key={o.value} label={o.label} value={o.value} color={colors.foreground} />
        ))}
      </Picker>
    </View>
  );
}

/** Web `<select>`, Android dropdown, iOS bottom-sheet wheel — for string values (e.g. chart anchor). */
export function NativeStringSelect(props: Props) {
  const colors = useThemeColors();
  const { pick } = useLocale();
  const { isTablet } = useBreakpoint();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(props.value);
  const selected = props.options.find((o) => o.value === props.value);

  useEffect(() => {
    if (!open) setDraft(props.value);
  }, [props.value, open]);

  if (Platform.OS === "web") {
    return <WebStringSelect {...props} />;
  }

  if (Platform.OS === "android") {
    return <AndroidStringSelect {...props} />;
  }

  const sheetStyle: ViewStyle = isTablet
    ? {
        alignSelf: "center",
        width: "100%",
        maxWidth: 420,
        marginHorizontal: 24,
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.border,
      }
    : {
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
      };

  return (
    <>
      <Pressable
        onPress={() => {
          setDraft(props.value);
          setOpen(true);
        }}
        accessibilityLabel={props.ariaLabel}
        className={cn(
          "h-9 flex-row items-center gap-1 rounded-lg border border-border bg-card px-2.5 active:bg-muted",
          props.className,
        )}
        style={{ minWidth: props.minWidth ?? 96, width: "100%" }}
      >
        <Text numberOfLines={1} className="text-body min-w-0 flex-1 text-foreground">
          {selected?.label ?? "—"}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
      </Pressable>

      <BottomSheetModal
        visible={open}
        onClose={() => setOpen(false)}
        variant={isTablet ? "center" : "bottom"}
        maxHeight={isTablet ? "80%" : undefined}
        sheetStyle={{ backgroundColor: colors.card, ...sheetStyle }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Pressable onPress={() => setOpen(false)} style={{ minWidth: 72 }}>
            <Text style={{ fontSize: 18, color: colors.mutedForeground }}>{pick("रद्द", "Cancel")}</Text>
          </Pressable>
          <Text
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 18,
              fontWeight: "600",
              color: colors.foreground,
            }}
          >
            {props.ariaLabel}
          </Text>
          <Pressable
            onPress={() => {
              props.onChange(draft);
              setOpen(false);
            }}
            style={{ minWidth: 72, alignItems: "flex-end" }}
          >
            <Text style={{ fontSize: 18, fontWeight: "600", color: colors.primary }}>
              {pick("भयो", "Done")}
            </Text>
          </Pressable>
        </View>
        <Picker selectedValue={draft} onValueChange={(v) => setDraft(String(v))} style={{ height: 216 }}>
          {props.options.map((o) => (
            <Picker.Item key={o.value} label={o.label} value={o.value} color={colors.foreground} />
          ))}
        </Picker>
        <View style={{ height: Math.max(insets.bottom, 8) }} />
      </BottomSheetModal>
    </>
  );
}
