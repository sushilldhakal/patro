/**
 * Host-owned browse bounds from `GET /meta/capabilities`, shared by the
 * website's `hooks/use-patro-capabilities.ts` and the app's
 * `lib/use-patro-capabilities.ts`: keeps the picker/year gates in step with
 * the host (bootstrap constants until this lands).
 *
 * `apply` defaults to the shared year axis; the app passes its own wrapper,
 * which also records the offline-download span.
 */
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPatroCapabilities, patroCapabilitiesKey, type PatroApiLimits } from "@vedic-patro/api-client";
import { applyPatroApiLimits } from "@vedic-patro/domain/patro-year-axis";

export type ApplyPatroApiLimits = (limits: PatroApiLimits) => void;

export function usePatroCapabilities(apply: ApplyPatroApiLimits = applyPatroApiLimits) {
  const q = useQuery({
    queryKey: patroCapabilitiesKey,
    queryFn: fetchPatroCapabilities,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
  });

  useEffect(() => {
    if (q.data) apply(q.data);
  }, [q.data, apply]);

  return q;
}

/** Apply a month response's `limits` block, if any. */
export function applyMonthLimits(
  limits?: PatroApiLimits | null,
  apply: ApplyPatroApiLimits = applyPatroApiLimits,
) {
  if (limits) apply(limits);
}
