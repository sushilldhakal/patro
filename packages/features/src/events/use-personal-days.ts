import { useQuery } from "@tanstack/react-query";
import { fetchDayGuidance, listProfiles, type LocationParams } from "@vedic-patro/api-client";
import { shiftDate } from "@vedic-patro/domain/calendar/event-time";
import { personalColumn, type PersonalColumn } from "./personal-slots";

/**
 * The signed-in default profile's personal filter for each of `dates`.
 * A guest, or a profile with no birth date and place, gets an empty map and
 * the placeholders stay as they are for everyone. Birth data stays on the
 * authenticated profile route; it is never put on the query string.
 *
 * One request covers the visible days plus the day before, because the small
 * hours of a date belong to the previous panchanga day.
 */
export function usePersonalDays(dates: string[], location: LocationParams, enabled: boolean) {
  const profiles = useQuery({
    queryKey: ["events", "profiles"],
    queryFn: listProfiles,
    enabled,
    staleTime: 5 * 60_000,
  });
  const profile = profiles.data?.find((item) => item.is_default) ?? profiles.data?.[0] ?? null;
  const born = Boolean(profile?.birth_date && profile.latitude != null && profile.longitude != null);
  const first = dates[0];
  const guidance = useQuery({
    queryKey: ["events", "personal-days", profile?.id, dates.join(","), location.lat, location.lon, location.timezone, location.city_id],
    enabled: enabled && born && profile != null && dates.length > 0,
    staleTime: 60 * 60_000,
    queryFn: () => fetchDayGuidance(profile!.id, shiftDate(first!, -1), location, dates.length + 1),
  });
  const columns = new Map<string, PersonalColumn>();
  if (born && profile && guidance.data) {
    const byDate = new Map(guidance.data.days.map((day) => [day.date, day]));
    for (const date of dates) {
      const column = personalColumn(byDate.get(date), byDate.get(shiftDate(date, -1)), profile.full_name);
      if (column) columns.set(date, column);
    }
  }
  return { columns, loading: enabled && born && (profiles.isLoading || guidance.isLoading) };
}
