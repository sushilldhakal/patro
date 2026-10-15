import { memo, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { SkyTimeSheet } from "@/components/sky3d/SkyTimeSheet";
import { fetchPanchangaAtTimeForDay, fetchPanchangaAtTimeJd, panchangaKeys } from "@/lib/api";
import type { PatroDayFetchState } from "@/lib/patro-day-url";
import { GRAHA_PLANET_ICON_URL } from "@/lib/graha-planet-icons";
import { PanchangaWheel as KitWheel, type WheelAtTimeClient } from "@vedic-patro/ui/kit/panchanga";

const atTime: WheelAtTimeClient = {
  queryKey: (query) => {
    if (query.kind === "jd" && query.jd != null && query.clock) {
      return panchangaKeys.atTime(query.jd, query.clock, query.locationParams);
    }
    if (query.kind === "day" && query.dayState != null && query.clock) {
      return panchangaKeys.atTimeDay(query.dayState as PatroDayFetchState, query.clock, query.locationParams);
    }
    return ["panchanga", "at-time", "idle"] as const;
  },
  queryFn: (query) => {
    if (query.kind === "jd" && query.jd != null && query.clock) {
      return fetchPanchangaAtTimeJd(query.jd, query.clock, query.locationParams);
    }
    if (query.kind === "day" && query.dayState != null && query.clock) {
      return fetchPanchangaAtTimeForDay(query.dayState as PatroDayFetchState, query.clock, query.locationParams, {
        resolvedJdUt: query.anchorJd,
      });
    }
    throw new Error("at-time fetch requires jd or atTimeDayState");
  },
};

type Props = Omit<ComponentProps<typeof KitWheel>, "skyBase" | "nodeIcon" | "atTime" | "renderSkySheet" | "mountExpanded">;

function mountExpanded(node: ReactNode) {
  return createPortal(node, document.body);
}

function PanchangaWheelImpl(props: Props) {
  return (
    <KitWheel
      {...props}
      skyBase={import.meta.env.BASE_URL}
      nodeIcon={{ rahu: GRAHA_PLANET_ICON_URL.rahu, ketu: GRAHA_PLANET_ICON_URL.ketu }}
      atTime={atTime}
      mountExpanded={mountExpanded}
      renderSkySheet={(slot) => (
        <SkyTimeSheet
          centered={slot.centered}
          transport={slot.transport}
          timeMs={slot.timeMs}
          zoneOffsetMs={slot.zoneOffsetMs}
          onApplyMs={slot.onApplyMs}
          onClose={slot.onClose}
        />
      )}
    />
  );
}

/** Fetch, sky sheet, and planet artwork stay in the app. The wheel drawing lives in the kit. */
export const PanchangaWheel = memo(PanchangaWheelImpl);
export type { YearWheelCalendarPick, YearWheelScrub } from "@vedic-patro/ui/kit/panchanga";
