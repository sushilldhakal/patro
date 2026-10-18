import { useState } from "react";
import { useShantiPage } from "@vedic-patro/features/shanti";
import { Flame, UserSearch } from "lucide-react";
import { PageShell, PageHeader } from "../components/PageShell";
import { useRouteLoading } from "@/lib/route-loading";
import type { InstantQuery } from "@vedic-patro/domain/calendar/instant-query";
import { KundaliControls } from "@/components/kundali/KundaliControls";
import { ShantiVidhiPanel } from "@/components/kundali/ShantiVidhiPanel";
import { usePanchangaLocation } from "@/components/panchanga/use-panchanga-location";
import { defaultClockForTimezone } from "@/components/panchanga/use-panchanga-mode";
import { useCalendarEra } from "@/hooks/use-calendar-era";
import { shantiClasses as sc } from "@vedic-patro/design-tokens/classes/shanti-classes";
import { getCurrentBs } from "@vedic-patro/domain/calendar/bs-calendar";

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
  const { location, setLocation } = usePanchangaLocation();
  const calendarEra = useCalendarEra();
  const pickerEra: "bs" | "ad" =
    calendarEra === "ad" || calendarEra === "bc" ? "ad" : "bs";
  const timezone = location.params.timezone ?? "Asia/Kathmandu";
  const [moment, setMoment] = useState<InstantQuery>(() =>
    nowMoment(defaultClockForTimezone(timezone), pickerEra),
  );

  const page = useShantiPage(moment, location.params);

  useRouteLoading(page.status === "loading");

  return (
    <PageShell>
      <PageHeader
        icon={<Flame className="h-7 w-7 text-secondary" />}
        title={page.copy.title}
        subtitle={page.copy.subtitle}
      />

      <section className={sc.card}>
        <header className={sc.header}>
          <UserSearch className="h-4 w-4 text-secondary" />
          <h2 className={sc.headerTitle}>{page.copy.birthSection}</h2>
          <span className={sc.headerMeta}>{page.copy.birthMeta}</span>
        </header>

        <div className={sc.body}>
          <KundaliControls
            moment={moment}
            onMomentChange={setMoment}
            location={location}
            onLocationChange={setLocation}
          />

          <ShantiVidhiPanel
            grahaShanti={page.grahaShanti}
            isError={page.isError}
          />
        </div>
      </section>
    </PageShell>
  );
}

export default ShantiVidhi;
