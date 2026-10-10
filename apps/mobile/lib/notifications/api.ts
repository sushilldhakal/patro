import { authFetch } from "@/lib/auth/client";
import type { LocationParams } from "@/lib/api";
import type { GuidanceRange, ReminderInput, ReminderRule } from "./types";

function locationQuery(location: LocationParams): string {
  const params = new URLSearchParams();
  if (location.city_id != null) params.set("city_id", String(location.city_id));
  if (location.lat != null) params.set("lat", String(location.lat));
  if (location.lon != null) params.set("lon", String(location.lon));
  if (location.timezone) params.set("timezone", location.timezone);
  return params.toString();
}

export function fetchDailyGuidance(
  profileId: string,
  from: string,
  days: number,
  location: LocationParams,
): Promise<GuidanceRange> {
  const qs = `from=${from}&days=${days}&${locationQuery(location)}`;
  return authFetch<GuidanceRange>(`/profiles/${profileId}/daily-guidance?${qs}`);
}

export const listReminders = () => authFetch<ReminderRule[]>("/reminders");

export const createReminder = (input: ReminderInput) =>
  authFetch<ReminderRule>("/reminders", { method: "POST", body: JSON.stringify(input) });

export const updateReminder = (id: string, input: ReminderInput) =>
  authFetch<ReminderRule>(`/reminders/${id}`, { method: "PUT", body: JSON.stringify(input) });

export const deleteReminder = (id: string) =>
  authFetch<void>(`/reminders/${id}`, { method: "DELETE" });

export interface RegisteredDevice {
  id: string;
}

export const registerDevice = (body: {
  push_token: string;
  platform: "ios" | "android";
  timezone?: string;
  locale?: string;
}) => authFetch<RegisteredDevice>("/devices", { method: "POST", body: JSON.stringify(body) });

export const unregisterDevice = (id: string) =>
  authFetch<void>(`/devices/${id}`, { method: "DELETE" });
