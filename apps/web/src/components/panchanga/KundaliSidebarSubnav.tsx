import { Link } from "@tanstack/react-router";
import { parseKundaliSectionFromHash, type KundaliSectionId } from "@vedic-patro/features/kundali";
import { KundaliSidebarSubnav as Shared } from "@vedic-patro/ui/kit/jyotish";

export { parseKundaliSectionFromHash };

/** Router links stay here. The section list is shared. */
export function KundaliSidebarSubnav({ profileId, activeSectionId }: { profileId: string; activeSectionId: KundaliSectionId }) {
  return (
    <Shared
      activeSectionId={activeSectionId}
      renderLink={({ hash, label, active, onPress, className }) => (
        <Link to="/kundali/$profileId" params={{ profileId }} hash={hash} onClick={onPress} className={className} aria-current={active ? "true" : undefined}>
          {label}
        </Link>
      )}
    />
  );
}
