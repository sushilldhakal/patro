/**
 * Shanti vidhi page logic, shared by the website (`apps/web/src/pages/ShantiVidhi.tsx`)
 * and the app (`apps/mobile/app/(tabs)/shanti-vidhi.tsx`): the copy and the
 * kundali reading for the chosen birth moment. Each app keeps its own moment
 * picker; both pass the moment it produces.
 */
import { useQuery } from "@tanstack/react-query";
import { fetchKundaliDetail, kundaliDetailKeys, type LocationParams } from "@vedic-patro/api-client";
import type { InstantQuery } from "@vedic-patro/domain/instant-query";
import { useLocale } from "@vedic-patro/i18n/react";
import { statusOf, type PageStatus } from "../_shared";

export function useShantiPage(moment: InstantQuery, location?: LocationParams) {
  const { t } = useLocale();
  const query = useQuery({
    queryKey: kundaliDetailKeys.atTime(moment, location),
    queryFn: () => fetchKundaliDetail(moment, location),
    staleTime: 1000 * 60 * 5,
  });
  return {
    copy: {
      title: t("shanti_vidhi.title"),
      subtitle: t("shanti_vidhi.subtitle"),
      birthSection: t("shanti_vidhi.birth_section"),
      birthMeta: t("shanti_vidhi.birth_meta"),
    },
    status: statusOf(query) as PageStatus,
    isError: query.isError,
    grahaShanti: query.data?.grahaShanti,
  };
}
