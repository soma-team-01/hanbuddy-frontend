import { queryOptions, type QueryClient } from "@tanstack/react-query";
import {
  getApplicationScheduleCancellation,
  getScheduleCancellation,
} from "@/lib/api/schedule-cancellation";
import { buddyKeys } from "./buddy";
import { activityKeys } from "./activities";
import { applicationKeys } from "./applications";
import { chatKeys } from "./chat";
import { unwrapApiResult } from "./result";
import type {
  ScheduleCancellationApplicant,
  ScheduleCancellationResponse,
} from "@/types/schedule-cancellation";

export const scheduleCancellationKeys = {
  buddy: (id: number | string) => ["schedule-cancellations", "buddy", String(id)] as const,
  application: (id: number | string) =>
    ["schedule-cancellations", "application", String(id)] as const,
};

export function cancellationRefreshInterval(tasks: ScheduleCancellationApplicant[]) {
  if (tasks.some((task) => task.refundStatus === "QUEUED" || task.refundStatus === "DISPATCHED"))
    return 20_000;
  // Manual review and final states refresh on focus/re-entry, not indefinitely.
  return false;
}

export function scheduleCancellationQueryOptions(id: number | string) {
  return queryOptions({
    queryKey: scheduleCancellationKeys.buddy(id),
    queryFn: async () => unwrapApiResult(await getScheduleCancellation(id), "cancellation"),
    enabled: Boolean(id),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchInterval: (query) =>
      query.state.data?.status === "CANCELLED"
        ? cancellationRefreshInterval(query.state.data.applicants)
        : false,
  });
}

export function applicationScheduleCancellationQueryOptions(id: number | string) {
  return queryOptions({
    queryKey: scheduleCancellationKeys.application(id),
    queryFn: async () =>
      unwrapApiResult(await getApplicationScheduleCancellation(id), "cancellation"),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchInterval: (query) =>
      query.state.data ? cancellationRefreshInterval([query.state.data]) : false,
  });
}

export function cacheCancelledSchedule(client: QueryClient, result: ScheduleCancellationResponse) {
  client.setQueryData(scheduleCancellationKeys.buddy(result.activityScheduleId), result);
  // Refresh all content-language variants, booking availability and chat metadata.
  for (const queryKey of [
    buddyKeys.all(),
    activityKeys.all(),
    applicationKeys.all(),
    chatKeys.rooms(),
    ["chat", "room"],
  ]) {
    void client.invalidateQueries({ queryKey });
  }
}
