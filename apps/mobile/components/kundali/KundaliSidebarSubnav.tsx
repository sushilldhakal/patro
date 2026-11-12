import { Pressable } from "react-native";
import { Text } from "@/components/ui/Text";
import type { KundaliSectionId } from "@vedic-patro/features/kundali";
import { cn } from "@vedic-patro/design-tokens/cn";
import { kundaliDetailClasses } from "@vedic-patro/design-tokens/classes/kundali-detail-classes";
import { KundaliSidebarSubnav as Shared } from "@vedic-patro/ui/kit/jyotish";

const sub = kundaliDetailClasses.sidebarSubnav;

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
      renderLink={({ hash, label, active, onPress, className, child }) => (
        <Pressable
          onPress={() => {
            onPress?.();
            onNavigate(hash as KundaliSectionId);
          }}
          className={className}
        >
          <Text
            className={cn(
              sub.label,
              active ? sub.labelActive : child ? sub.childLabelIdle : sub.labelIdle,
            )}
          >
            {label}
          </Text>
        </Pressable>
      )}
    />
  );
}
