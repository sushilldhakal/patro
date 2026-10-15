import { Modal, Pressable, ScrollView, View } from "react-native";
import { cn } from "@vedic-patro/domain/utils";
import { kitIcons, sheetClass } from "../classes";
import type { SheetProps } from "../contract";
import { Icon } from "./Icon";
import { Text } from "./Text";

/** A panel that rises from the bottom; the back button and a tap on the backdrop close it. */
export function Sheet({ open, onClose, title, closeLabel, children, className, nativeClassName, testID }: SheetProps) {
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} testID={testID}>
      <View className="flex-1 justify-end">
        <Pressable
          className={cn("absolute bottom-0 left-0 right-0 top-0", sheetClass.backdrop)}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
        <View className={cn("max-h-[85%] pb-10", sheetClass.panel, className, nativeClassName)} accessibilityViewIsModal>
          <View className={sheetClass.handle} />
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
          <ScrollView>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}
