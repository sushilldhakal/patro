import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchVastuSketch, type VastuSketchRequest } from "@/lib/api";
import { localVastuSketch } from "@/lib/vastu-offline";
import type { CardinalWall } from "@/shared/vastu";
import type { HousePlan } from "@/lib/vastu-plan";

/** How long the plot/requirements must sit still before the sketch is re-asked for. */
const SKETCH_DEBOUNCE_MS = 250;

function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return settled;
}

/**
 * The plot sketch — zone per room, Āyādi check, entrance corner — as computed
 * by the server (`POST /vastu/sketch`). Nothing is worked out here; while a
 * newer answer is in flight the previous one stays on screen.
 */
export function useVastuSketch(
  plot: { widthM: number; depthM: number; facing: CardinalWall },
  house: HousePlan,
  enabled = true,
) {
  const request = useMemo<VastuSketchRequest>(
    () => ({
      plot_width: plot.widthM,
      plot_depth: plot.depthM,
      facing: plot.facing,
      plan: {
        bedrooms: house.bedrooms,
        toilets: house.toilets,
        bathrooms: house.bathrooms,
        combined: house.combined,
        master_bedroom: house.masterBedroom,
        extras: house.extras,
        mode: house.mode,
        storeys: house.storeys,
        floors: house.floors as Record<string, string>,
      },
    }),
    [plot.widthM, plot.depthM, plot.facing, house],
  );
  const settled = useDebounced(request, SKETCH_DEBOUNCE_MS);

  return useQuery({
    queryKey: ["vastu", "sketch", settled],
    queryFn: async ({ signal }) => {
      try {
        return await fetchVastuSketch(settled, signal);
      } catch (err) {
        // A real answer from the server (bad input) or a cancelled request is
        // surfaced as-is; no connection means the planner still works from the
        // on-device copy, which is the point of offline mode.
        const message = err instanceof Error ? err.message : "";
        if (message.startsWith("API 4") || (err instanceof Error && err.name === "AbortError")) throw err;
        return localVastuSketch(settled);
      }
    },
    enabled,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  });
}
