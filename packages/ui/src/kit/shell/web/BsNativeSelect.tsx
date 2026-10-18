import { useState } from "react";
import { cn } from "@vedic-patro/design-tokens/cn";
import { useLocale } from "@vedic-patro/i18n/react";
import { Box, Icon, Pressable, Sheet, Text } from "@vedic-patro/ui";
import type { BsNativeSelectProps } from "../contract";
import { shellIcons } from "../icon-nodes";

/** Closed label plus a sheet of options. Both apps use this picker. */
export function BsNativeSelect({ value, options, onChange, ariaLabel, className, comfortable = false }: BsNativeSelectProps) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <>
      <Pressable label={ariaLabel} onPress={() => setOpen(true)} className={cn("relative inline-flex shrink-0", className)}>
        <Box
          className={cn(
            "pointer-events-none w-full min-w-0 flex-row items-center justify-between rounded-md border border-border bg-card text-foreground",
            comfortable ? "h-9 gap-1 px-2 text-sm" : "h-6 gap-0.5 px-1 text-sm sm:h-7 sm:gap-1 sm:px-1.5 sm:text-xs",
          )}
        >
          {selected?.shortLabel ? (
            <Text numberOfLines={1} className="min-w-0">
              <Text className="md:hidden">{selected.shortLabel}</Text>
              <Text className="hidden md:inline">{selected.label}</Text>
            </Text>
          ) : (
            <Text numberOfLines={1} className="min-w-0">
              {selected?.label ?? "—"}
            </Text>
          )}
          <Icon node={shellIcons.chevronDown} size="sm" tone="muted" />
        </Box>
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={ariaLabel} closeLabel={t("common.close")}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            label={option.label}
            onPress={() => {
              onChange(option.value);
              setOpen(false);
            }}
            className={cn("rounded-lg px-3 py-2", option.value === value && "bg-muted")}
          >
            <Text className="text-sm text-foreground">{option.label}</Text>
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}
