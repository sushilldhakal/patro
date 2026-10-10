import { LayoutGrid } from "lucide-react";
import { PageShell, PageHeader } from "@/components/PageShell";
import { PanchangaDirectory } from "@/components/panchanga/PanchangaDirectory";
import { useLocale, bilingualText } from "@/i18n/locale";
import { useRouteLoading } from "@/lib/route-loading";

export function PanchangaDetailsHub() {
  const { lang } = useLocale();
  useRouteLoading(false);

  return (
    <PageShell showRelatedLinks={false}>
      <PageHeader
        icon={<LayoutGrid className="h-6 w-6 text-secondary" />}
        title={bilingualText(lang, "पञ्चाङ्ग विवरण", "Panchanga details")}
        subtitle={bilingualText(lang, 
          "प्रत्येक तत्त्वको छुट्टै पृष्ठ — आरम्भ, अन्त्य र तालिका",
          "Every element on its own page — begin, end & tables",
        )}
      />
      <PanchangaDirectory />
    </PageShell>
  );
}

export default PanchangaDetailsHub;
