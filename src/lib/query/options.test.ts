import { describe, expect, it } from "vitest";
import {
  activityKeys,
  activityWeatherQueryOptions,
  touristActivityQueryOptions,
} from "./activities";
import { applicationKeys, myApplicationsQueryOptions } from "./applications";
import {
  buddyActivityApplicationsQueryOptions,
  buddyApplicationsQueryOptions,
  buddyKeys,
  myActivityQueryOptions,
} from "./buddy";
import { myProfileQueryOptions, userKeys } from "./users";

describe("domain query options", () => {
  it("builds stable activity keys", () => {
    expect(activityKeys.list()).toEqual(["activities", "list"]);
    expect(activityKeys.detail("42")).toEqual(["activities", "detail", "42"]);
    expect(touristActivityQueryOptions("42").queryKey).toEqual(activityKeys.detail("42"));
    expect(activityKeys.detail(42)).toEqual(activityKeys.detail("42"));
    expect(activityKeys.weather(42)).toEqual(["activities", "weather", "42"]);
    expect(activityWeatherQueryOptions("42").queryKey).toEqual(activityKeys.weather(42));
  });

  it("builds stable application keys", () => {
    expect(applicationKeys.mine()).toEqual(["applications", "me"]);
    expect(myApplicationsQueryOptions().queryKey).toEqual(applicationKeys.mine());
  });

  it("polls my applications only while a pending payment can expire", () => {
    const { refetchInterval } = myApplicationsQueryOptions();
    expect(typeof refetchInterval).toBe("function");
    if (typeof refetchInterval !== "function") return;

    type QueryArg = Parameters<typeof refetchInterval>[0];
    const withStatus = (status?: string) =>
      ({ state: { data: status ? [{ status }] : undefined } }) as unknown as QueryArg;

    // 좌석 선점이 풀린 결제 대기 신청은 백엔드 목록에서 사라지므로 주기적으로 확인한다
    expect(refetchInterval(withStatus("PENDING_PAYMENT"))).toBe(60_000);
    expect(refetchInterval(withStatus("CONFIRMED"))).toBe(false);
    expect(refetchInterval(withStatus())).toBe(false);
  });

  it("includes buddy filters and identifiers in keys", () => {
    expect(buddyKeys.activityDetail(42)).toEqual(buddyKeys.activityDetail("42"));
    expect(buddyKeys.applicationsBySchedule(99)).toEqual(buddyKeys.applicationsBySchedule("99"));
    expect(buddyKeys.applicationsByDate("2026-07-20")).toEqual([
      "buddy",
      "applications",
      "date",
      "2026-07-20",
    ]);
    expect(buddyApplicationsQueryOptions("2026-07-20").queryKey).toEqual(
      buddyKeys.applicationsByDate("2026-07-20"),
    );
    expect(myActivityQueryOptions(7).queryKey).toEqual(["buddy", "activities", "detail", "7"]);
    expect(buddyActivityApplicationsQueryOptions(101).queryKey).toEqual([
      "buddy",
      "applications",
      "schedule",
      "101",
    ]);
  });

  it("builds a stable current-user key", () => {
    expect(userKeys.me()).toEqual(["users", "me"]);
    expect(myProfileQueryOptions().queryKey).toEqual(userKeys.me());
  });
});
