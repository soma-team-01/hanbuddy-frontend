import { describe, expect, it } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import {
  cancellationRefreshInterval,
  scheduleCancellationQueryOptions,
  applicationScheduleCancellationQueryOptions,
  cacheCancelledSchedule,
  scheduleCancellationKeys,
} from "./schedule-cancellation";
import type { ScheduleCancellationTaskStatus } from "@/types/schedule-cancellation";

describe("cancellation cache and polling", () => {
  it.each<[ScheduleCancellationTaskStatus, number | false]>([
    ["QUEUED", 20000],
    ["DISPATCHED", 20000],
    ["REVIEW_REQUIRED", false],
    ["COMPLETED", false],
    ["NO_PAYMENT", false],
    ["EXCLUDED", false],
  ])("polls %s conservatively", (refundStatus, expected) => {
    expect(
      cancellationRefreshInterval([
        {
          applicationId: 1,
          refundStatus,
          reviewReason: null,
          additionalRefundAmount: null,
          currency: null,
        },
      ]),
    ).toBe(expected);
  });
  it("refreshes even final results on focus and never retries POST automatically", () => {
    expect(scheduleCancellationQueryOptions(99)).toMatchObject({
      retry: false,
      staleTime: 0,
      refetchOnWindowFocus: "always",
    });
    expect(applicationScheduleCancellationQueryOptions(1)).toMatchObject({
      refetchOnWindowFocus: "always",
      staleTime: 0,
    });
  });
  it("stores authoritative cancellation and invalidates related views", () => {
    const client = new QueryClient();
    const keys = [
      ["buddy"],
      ["activities"],
      ["applications"],
      ["chat", "rooms"],
      ["chat", "room", 4],
    ];
    for (const key of keys) client.setQueryData(key, {});
    const result = {
      activityScheduleId: 99,
      status: "CANCELLED" as const,
      reason: "Weather",
      cancelledAt: null,
      applicants: [],
    };
    cacheCancelledSchedule(client, result);
    expect(client.getQueryData(scheduleCancellationKeys.buddy(99))).toEqual(result);
    for (const key of keys) expect(client.getQueryState(key)?.isInvalidated).toBe(true);
  });
});
