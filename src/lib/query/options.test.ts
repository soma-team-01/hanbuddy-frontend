import { describe, expect, it } from "vitest";
import { activityKeys, touristActivityQueryOptions } from "./activities";
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
  });

  it("builds stable application keys", () => {
    expect(applicationKeys.mine()).toEqual(["applications", "me"]);
    expect(myApplicationsQueryOptions().queryKey).toEqual(applicationKeys.mine());
  });

  it("includes buddy filters and identifiers in keys", () => {
    expect(buddyKeys.applicationsByDate("2026-07-20")).toEqual([
      "buddy",
      "applications",
      "date",
      "2026-07-20",
    ]);
    expect(buddyApplicationsQueryOptions("2026-07-20").queryKey).toEqual(
      buddyKeys.applicationsByDate("2026-07-20"),
    );
    expect(myActivityQueryOptions(7).queryKey).toEqual(["buddy", "activities", "detail", 7]);
    expect(buddyActivityApplicationsQueryOptions(101).queryKey).toEqual([
      "buddy",
      "applications",
      "schedule",
      101,
    ]);
  });

  it("builds a stable current-user key", () => {
    expect(userKeys.me()).toEqual(["users", "me"]);
    expect(myProfileQueryOptions().queryKey).toEqual(userKeys.me());
  });
});
