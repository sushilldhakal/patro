/**
 * Binds a chapter overlay id to this app's diagram registry. The panel itself
 * is `@vedic-patro/ui/kit/learn`.
 */
import { ChapterOverlay as ChapterOverlayPanel } from "@vedic-patro/ui/kit/learn";
import { LEARN_DIAGRAMS } from "@/lib/learn/learn-diagrams";

export function ChapterOverlay({ id, onClose }: { id: string; onClose: () => void }) {
  const Diagram = LEARN_DIAGRAMS[id];
  if (!Diagram) return null;
  return (
    <ChapterOverlayPanel onClose={onClose}>
      <Diagram />
    </ChapterOverlayPanel>
  );
}

export default ChapterOverlay;
