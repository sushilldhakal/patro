import { Pressable } from "react-native";
import { Text } from "@/components/ui/Text";
import type { KundaliSectionId } from "@vedic-patro/features/kundali";
import { cn } from "@vedic-patro/domain/utils";
import { KundaliSidebarSubnav as Shared } from "@vedic-patro/ui/kit/jyotish";

export function KundaliSidebarSubnav({
  activeSectionId,
  onNavigate,
}: {
  activeSectionId: KundaliSectionId;
  onNavigate: (id: KundaliSectionId) => void;
}) {
  return (
    <Shared
      activeSectionId={activeSectionId}
      renderLink={({ hash, label, active, onPress, className }) => (
        <Pressable
          onPress={() => {
            onPress?.();
            onNavigate(hash as KundaliSectionId);
          }}
          className={className}
        >
          <Text className={cn("text-caption", active ? "font-semibold text-secondary" : "text-muted-foreground")}>{label}</Text>
        </Pressable>
      )}
    />
  );
}
