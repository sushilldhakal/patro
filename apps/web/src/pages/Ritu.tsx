import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Sprout } from "lucide-react";
import { LearnMoreCard } from "@/components/LearnMoreCard";
import { PageHeader, PageShell } from "@/components/PageShell";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import { RituSeasons } from "@/components/RituSeasons";
import {
  displayLocationLabel,
  usePanchangaLocation,
} from "@/components/panchanga/use-panchanga-location";
import { usePatroLocationUrlBrowse } from "@/hooks/use-patro-url-browse";
import { useLocale } from "@/i18n/locale";
import { useRouteLoading } from "@/lib/route-loading";

const routeApi = getRouteApi("/panchanga-shell/ritu");

export function Ritu() {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/ritu" });
  const search = routeApi.useSearch();
  const { location, setLocation } = usePanchangaLocation();
  usePatroLocationUrlBrowse(search, navigate, location, setLocation);
  const { lang } = useLocale();

  useRouteLoading(false);

  const locationLabel = displayLocationLabel(location, undefined, lang);
  const subtitle = `${t("ritu.subtitle")}${locationLabel ? ` · ${locationLabel}` : ""}`;

  return (
    <PageShell>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          icon={<Sprout className="size-7 text-secondary dark:text-primary" strokeWidth={1.8} />}
          title={t("ritu.title")}
          subtitle={subtitle}
        />
        <LocationSelector compact location={location} onLocationChange={setLocation} />
      </div>

      <RituSeasons location={location} showHeader={false} />

      <LearnMoreCard className="mt-7" slugs={["ritu-drift"]} />
    </PageShell>
  );
}

export default Ritu;
