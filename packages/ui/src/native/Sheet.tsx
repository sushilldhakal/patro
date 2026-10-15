import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { cn } from "@vedic-patro/domain/utils";
import { kitIcons, sheetClass } from "../classes";
import type { SheetProps } from "../contract";
import { Icon } from "./Icon";
import { Text } from "./Text";

/** A panel that rises from the bottom; the back button and a tap on the backdrop close it. */
export function Sheet({ open, onClose, title, closeLabel, maxHeightPercent, placement, children, className, nativeClassName, testID }: SheetProps) {
  const top = placement === "top";
  return (
    <Modal visible={open} transparent animationType={top ? "fade" : "slide"} onRequestClose={onClose} testID={testID}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className={cn("flex-1", top ? "justify-start" : "justify-end")}>
        <Pressable
          className={cn("absolute bottom-0 left-0 right-0 top-0", sheetClass.backdrop)}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
        <View className={cn(top ? cn("pt-14", sheetClass.panelTop) : cn("pb-10", sheetClass.panel), className, nativeClassName)} accessibilityViewIsModal style={{ maxHeight: `${maxHeightPercent ?? 85}%` }}>
          {top ? null : <View className={sheetClass.handle} />}
          {title || closeLabel ? (
            <View className={sheetClass.header}>
              {title ? (
                <Text as="h2" className={sheetClass.title}>
                  {title}
                </Text>
              ) : (
                <View />
              )}
              {closeLabel ? (
                <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={closeLabel} hitSlop={8} className="p-1 active:opacity-70">
                  <Icon node={kitIcons.x} size="md" tone="muted" />
                </Pressable>
              ) : null}
            </View>
          ) : null}
          <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
