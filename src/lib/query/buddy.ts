import { queryOptions } from "@tanstack/react-query";
import {
  getBuddyActivityApplications,
  getBuddyApplications,
  getBuddyScheduleDates,
  getMyActivities,
  getMyActivity,
} from "@/lib/api/buddy";
import { unwrapApiResult } from "./result";

export const buddyKeys = {
  all: () => ["buddy"] as const,
  activities: () => [...buddyKeys.all(), "activities"] as const,
  myActivities: () => [...buddyKeys.activities(), "me"] as const,
  activityDetail: (activityId: number | string) =>
    [...buddyKeys.activities(), "detail", String(activityId)] as const,
  applications: () => [...buddyKeys.all(), "applications"] as const,
  scheduleDates: () => [...buddyKeys.applications(), "schedule-dates"] as const,
  applicationsByDate: (date: string) => [...buddyKeys.applications(), "date", date] as const,
  applicationsBySchedule: (activityScheduleId: number | string) =>
    [...buddyKeys.applications(), "schedule", String(activityScheduleId)] as const,
};

export function myActivitiesQueryOptions() {
  return queryOptions({
    queryKey: buddyKeys.myActivities(),
    queryFn: async () => unwrapApiResult(await getMyActivities(), "activities"),
  });
}

export function myActivityQueryOptions(activityId: number | string) {
  return queryOptions({
    queryKey: buddyKeys.activityDetail(activityId),
    queryFn: async () => unwrapApiResult(await getMyActivity(activityId), "activity"),
  });
}

export function buddyScheduleDatesQueryOptions() {
  return queryOptions({
    queryKey: buddyKeys.scheduleDates(),
    queryFn: async () => unwrapApiResult(await getBuddyScheduleDates(), "dates"),
  });
}

export function buddyApplicationsQueryOptions(date: string) {
  return queryOptions({
    queryKey: buddyKeys.applicationsByDate(date),
    queryFn: async () => unwrapApiResult(await getBuddyApplications(date), "activities"),
    enabled: Boolean(date),
  });
}

export function buddyActivityApplicationsQueryOptions(activityScheduleId: number | string) {
  return queryOptions({
    queryKey: buddyKeys.applicationsBySchedule(activityScheduleId),
    queryFn: async () =>
      unwrapApiResult(await getBuddyActivityApplications(activityScheduleId), "applications"),
    enabled: Boolean(activityScheduleId),
  });
}
