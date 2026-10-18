import { VASTU_INK } from "@vedic-patro/domain/vastu/vastu";
import { CX, CY } from "@vedic-patro/domain/vastu/vastu-purusha-wheel";
import { VASTU_STATUS_MARK } from "@vedic-patro/features/vastu";
import { VastuCompassRing as Shared } from "@vedic-patro/ui/kit/jyotish";

const center = { cx: CX, cy: CY };
const marks = { good: VASTU_STATUS_MARK.good, bad: VASTU_STATUS_MARK.bad };

export function VastuCompassRing({ className }: { className?: string }) {
  return <Shared className={className} center={center} ink={VASTU_INK} marks={marks} />;
}
