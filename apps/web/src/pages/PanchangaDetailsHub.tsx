import { LayoutGrid } from "lucide-react";
import { usePanchangaDetailsPage } from "@vedic-patro/features/panchanga-details";
import { PageShell, PageHeader } from "@/components/PageShell";
import { PanchangaDirectory } from "@/components/panchanga/PanchangaDirectory";
import { useRouteLoading } from "@/lib/route-loading";

/** Panchanga details hub — the website's drawing of `usePanchangaDetailsPage` (@vedic-patro/features). */
export function PanchangaDetailsHub() {
  useRouteLoading(false);
  const { copy } = usePanchangaDetailsPage();

  return (
    <PageShell showRelatedLinks={false}>
      <PageHeader icon={<LayoutGrid className="h-6 w-6 text-secondary" />} title={copy.title} subtitle={copy.subtitle} />
      <PanchangaDirectory />
    </PageShell>
  );
}

export default PanchangaDetailsHub;
