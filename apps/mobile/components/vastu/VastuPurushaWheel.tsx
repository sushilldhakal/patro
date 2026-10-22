import type { ReactNode } from "react";
import { VASTU_INK, type VastuSelectionId } from "@vedic-patro/domain/vastu/vastu";
import { CX, CY } from "@vedic-patro/drawing/vastu/vastu-purusha-wheel";
import { VASTU_STATUS_MARK } from "@vedic-patro/features/vastu";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { VastuPurushaWheel as Shared } from "@vedic-patro/ui/kit/jyotish";
import { ZoomStageInsets } from "@vedic-patro/ui/kit/panchanga";

const center = { cx: CX, cy: CY };
const marks = { good: VASTU_STATUS_MARK.good, bad: VASTU_STATUS_MARK.bad };

export function VastuPurushaWheel({
  size,
  selected,
  onSelect,
  centerContent,
  headingDeg = null,
}: {
  size: number;
  selected: VastuSelectionId;
  onSelect: (id: VastuSelectionId) => void;
  centerContent?: ReactNode;
  headingDeg?: number | null;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ZoomStageInsets value={{ top: insets.top, bottom: insets.bottom, left: insets.left, right: insets.right }}>
    <Shared
      size={size}
      selected={selected}
      onSelect={onSelect}
      centerContent={centerContent}
      headingDeg={headingDeg}
      center={center}
      ink={VASTU_INK}
      marks={marks}
    />
    </ZoomStageInsets>
  );
}

export default VastuPurushaWheel;
