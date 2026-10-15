import type { KundaliSectionId } from "@vedic-patro/features/kundali";
import { KundaliSectionNav as Shared } from "@vedic-patro/ui/kit/jyotish";

export function KundaliSectionNav({
  variant = "horizontal",
  ...props
}: {
  activeId: KundaliSectionId;
  onNavigate: (id: KundaliSectionId) => void;
  variant?: "sidebar" | "horizontal";
  className?: string;
}) {
  return <Shared {...props} variant={variant} />;
}
