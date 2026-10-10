import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Flame, UserSearch } from "lucide-react";
import { PageShell, PageHeader } from "../components/PageShell";
import { useRouteLoading } from "@/lib/route-loading";
import { fetchKundaliDetail, kundaliDetailKeys } from "@/lib/api";
import type { InstantQuery } from "@/lib/instant-query";
import { KundaliControls } from "@/components/kundali/KundaliControls";
import { ShantiVidhiPanel } from "@/components/kundali/ShantiVidhiPanel";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { defaultClockForTimezone } from "@/components/panchanga/use-panchanga-mode";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { getCurrentBs } from "@/lib/bs-calendar";

function nowMoment(clock: string, pickerEra: "bs" | "ad"): InstantQuery {
  if (pickerEra === "bs") {
    const bs = getCurrentBs();
    return { inputEra: "bs", year: bs.year, month: bs.month, day: bs.day, clock };
  }
  const n = new Date();
  return {
    inputEra: "ad",
    year: n.getFullYear(),
    month: n.getMonth() + 1,
    day: n.getDate(),
    clock,
  };
}

export function ShantiVidhi() {
  const { t } = useTranslation();
  const { location, setLocation } = usePanchangaLocation();
  const calendarEra = useCalendarEra();
  const pickerEra: "bs" | "ad" =
    calendarEra === "ad" || calendarEra === "bc" ? "ad" : "bs";
  const timezone = location.params.timezone ?? "Asia/Kathmandu";
  const [moment, setMoment] = useState<InstantQuery>(() =>
    nowMoment(defaultClockForTimezone(timezone), pickerEra),
  );

  const birthMoment = useMemo(() => moment, [moment]);

  const detailQ = useQuery({
    queryKey: kundaliDetailKeys.atTime(birthMoment, location.params),
    queryFn: () => fetchKundaliDetail(birthMoment, location.params),
    staleTime: 1000 * 60 * 5,
  });

  useRouteLoading(detailQ.isLoading);

  return (
    <PageShell>
      <PageHeader
        icon={<Flame className="h-7 w-7 text-secondary" />}
        title={t("shanti_vidhi.title")}
        subtitle={t("shanti_vidhi.subtitle")}
      />

      <section className="rounded-2xl border border-border">
        <header className="flex items-center gap-1.5 border-b border-border px-4 py-3">
          <UserSearch className="h-4 w-4 text-secondary" />
          <h2 className="text-sm font-semibold text-foreground">{t("shanti_vidhi.birth_section")}</h2>
          <span className="ml-auto text-sm">{t("shanti_vidhi.birth_meta")}</span>
        </header>

        <div className="space-y-4 p-4">
          <KundaliControls
            moment={moment}
            onMomentChange={setMoment}
            location={location}
            onLocationChange={setLocation}
          />

          <ShantiVidhiPanel
            grahaShanti={detailQ.data?.grahaShanti}
            isError={detailQ.isError}
          />
        </div>
      </section>
    </PageShell>
  );
}

export default ShantiVidhi;
