import { queryOptions } from "@tanstack/react-query";
import {
  getBuddyActivityApplications,
  getBuddyApplications,
  getBuddyScheduleDates,
  getMyActivities,
  getMyActivity,
} from "@/lib/api/buddy";
import { unwrapApiResult } from "./result";
import type { ContentLanguage } from "@/types/content-language";

export const buddyKeys = {
  all: () => ["buddy"] as const,
  activities: () => [...buddyKeys.all(), "activities"] as const,
  myActivities: () => [...buddyKeys.activities(), "me"] as const,
  activityDetail: (activityId: number | string) =>
    [...buddyKeys.activities(), "detail", String(activityId)] as const,
  applications: () => [...buddyKeys.all(), "applications"] as const,
  /** 인자 없이 부르면 모든 기간 조회를 덮는 접두사가 된다 (무효화용) */
  scheduleDates: (range?: { from: string; to: string }) =>
    range
      ? ([...buddyKeys.applications(), "schedule-dates", range.from, range.to] as const)
      : ([...buddyKeys.applications(), "schedule-dates"] as const),
  applicationsByDate: (date: string, language?: ContentLanguage) =>
    language
      ? ([...buddyKeys.applications(), "date", date, language] as const)
      : ([...buddyKeys.applications(), "date", date] as const),
  applicationsBySchedule: (activityScheduleId: number | string, language?: ContentLanguage) =>
    language
      ? ([...buddyKeys.applications(), "schedule", String(activityScheduleId), language] as const)
      : ([...buddyKeys.applications(), "schedule", String(activityScheduleId)] as const),
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

export function buddyScheduleDatesQueryOptions(range?: { from: string; to: string }) {
  return queryOptions({
    // 기본 창(range 없음)은 접두사 키와 겹치지 않게 "default" 표식을 둔다
    queryKey: range
      ? buddyKeys.scheduleDates(range)
      : ([...buddyKeys.scheduleDates(), "default"] as const),
    queryFn: async () => unwrapApiResult(await getBuddyScheduleDates(range), "dates"),
  });
}

export function buddyApplicationsQueryOptions(date: string, language: ContentLanguage) {
  return queryOptions({
    queryKey: buddyKeys.applicationsByDate(date, language),
    queryFn: async () => unwrapApiResult(await getBuddyApplications(date, language), "activities"),
    enabled: Boolean(date),
  });
}

export function buddyActivityApplicationsQueryOptions(
  activityScheduleId: number | string,
  language: ContentLanguage,
) {
  return queryOptions({
    queryKey: buddyKeys.applicationsBySchedule(activityScheduleId, language),
    queryFn: async () =>
      unwrapApiResult(
        await getBuddyActivityApplications(activityScheduleId, language),
        "applications",
      ),
    enabled: Boolean(activityScheduleId),
  });
}
