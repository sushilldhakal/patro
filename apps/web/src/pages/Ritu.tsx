import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { Sprout } from "lucide-react";
import { LearnMoreCard } from "@/components/LearnMoreCard";
import { PageHeader, PageShell } from "@/components/PageShell";
import { LocationSelector } from "@/components/panchanga/LocationSelector";
import { RituSeasons } from "@/components/RituSeasons";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { usePatroLocationUrlBrowse } from "@/hooks/use-patro-url-browse";
import { useRituScreen } from "@vedic-patro/features/ritu";
import { useRouteLoading } from "@/lib/route-loading";
import { cn } from "@vedic-patro/domain/utils";
import { rituClasses } from "@vedic-patro/design-tokens/classes/ritu-classes";

const routeApi = getRouteApi("/panchanga-shell/ritu");

export function Ritu() {
  const navigate = useNavigate({ from: "/ritu" });
  const search = routeApi.useSearch();
  const { location, setLocation } = usePanchangaLocation();
  usePatroLocationUrlBrowse(search, navigate, location, setLocation);
  const ritu = useRituScreen(location);

  useRouteLoading(false);

  return (
    <PageShell>
      <div className={cn("flex flex-wrap", rituClasses.headerRow)}>
        <PageHeader
          icon={<Sprout className="size-7 text-secondary dark:text-primary" strokeWidth={1.8} />}
          title={ritu.title}
          subtitle={ritu.subtitle}
        />
        <LocationSelector compact location={location} onLocationChange={setLocation} />
      </div>

      <RituSeasons location={location} showHeader={false} />

      <LearnMoreCard className="mt-7" slugs={ritu.learnSlugs} />
    </PageShell>
  );
}

export default Ritu;
