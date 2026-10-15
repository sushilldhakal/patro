import type { ReactNode } from "react";
import { VASTU_INK, type VastuSelectionId } from "@vedic-patro/domain/vastu";
import { CX, CY } from "@vedic-patro/domain/vastu-purusha-wheel";
import { VASTU_STATUS_MARK } from "@vedic-patro/features/vastu";
import { VastuPurushaWheel as Shared } from "@vedic-patro/ui/kit/jyotish";

const center = { cx: CX, cy: CY };
const marks = { good: VASTU_STATUS_MARK.good, bad: VASTU_STATUS_MARK.bad };

export function VastuPurushaWheel({
  selected,
  onSelect,
  centerContent,
  headingDeg = null,
}: {
  selected: VastuSelectionId;
  onSelect: (id: VastuSelectionId) => void;
  centerContent?: ReactNode;
  headingDeg?: number | null;
}) {
  return (
    <Shared
      selected={selected}
      onSelect={onSelect}
      centerContent={centerContent}
      headingDeg={headingDeg}
      center={center}
      ink={VASTU_INK}
      marks={marks}
    />
  );
}

export default VastuPurushaWheel;
