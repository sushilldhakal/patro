import { LayoutGrid } from "lucide-react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { PanchangaDirectory } from "@/components/panchanga/PanchangaDirectory";
import { useLocale } from "@/i18n/locale";
import { useRouteLoading } from "@/lib/route-loading";

import { tFor } from "@vedic-patro/i18n/runtime";
export function PanchangaDetailsHub() {
  const { lang } = useLocale();
  useRouteLoading(false);

  return (
    <PageShell showRelatedLinks={false}>
      <PageHeader
        icon={<LayoutGrid className="h-6 w-6 text-secondary" />}
        title={tFor(lang, "ui.panchanga.panchanga_details")}
        subtitle={tFor(lang, "ui.panchanga.every_element_on_its_own_page")}
      />
      <PanchangaDirectory />
    </PageShell>
  );
}

export default PanchangaDetailsHub;
