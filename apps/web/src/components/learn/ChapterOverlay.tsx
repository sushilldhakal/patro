/**
 * Binds a chapter overlay id to this app's diagram registry. The panel itself
 * is `@vedic-patro/ui/kit/learn`.
 */
import { ChapterOverlay as ChapterOverlayPanel } from "@vedic-patro/ui/kit/learn";
import { LEARN_DIAGRAMS } from "@/lib/learn/learn-diagrams";

export function ChapterOverlay({
  id,
  onClose,
  className,
}: {
  /** A key of LEARN_DIAGRAMS. An unknown id draws nothing. */
  id: string;
  onClose: () => void;
  className?: string;
}) {
  const Diagram = LEARN_DIAGRAMS[id as keyof typeof LEARN_DIAGRAMS];
  if (!Diagram) return null;
  return (
    <ChapterOverlayPanel onClose={onClose} className={className}>
      <Diagram />
    </ChapterOverlayPanel>
  );
}

export default ChapterOverlay;
