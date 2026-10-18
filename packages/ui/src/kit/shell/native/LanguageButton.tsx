import { cn } from "@vedic-patro/design-tokens/cn";
import { shellClasses as shell } from "@vedic-patro/design-tokens/classes/shell-classes";
import { Pressable, Text } from "@vedic-patro/ui";
import type { LanguageButtonProps } from "../contract";

/** The header control that names the language it will switch to. */
export function LanguageButton({ label, onPress, disabled, className }: LanguageButtonProps) {
  return (
    <Pressable label={label} onPress={onPress} disabled={disabled} className={cn(shell.langButton, className)}>
      <Text className={shell.langLabel}>{label}</Text>
    </Pressable>
  );
}