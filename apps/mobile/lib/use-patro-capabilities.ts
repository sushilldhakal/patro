import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPatroCapabilities, patroCapabilitiesKey, type PatroApiLimits } from "@/lib/api";
import { applyPatroApiLimits } from "@/lib/patro-browse-years";

/** Keep picker/year gates in step with the host. Bootstrap constants until this lands. */
export function usePatroCapabilities() {
  const q = useQuery({
    queryKey: patroCapabilitiesKey,
    queryFn: fetchPatroCapabilities,
    staleTime: 1000 * 60 * 60 * 24,
    gcTime: 1000 * 60 * 60 * 24,
  });

  useEffect(() => {
    if (q.data) applyPatroApiLimits(q.data);
  }, [q.data]);

  return q;
}

export function applyMonthLimits(limits?: PatroApiLimits | null) {
  if (limits) applyPatroApiLimits(limits);
}
