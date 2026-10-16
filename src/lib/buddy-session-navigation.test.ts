import { describe, expect, it } from "vitest";
import {
  activityDetailFromSessionHref,
  activityDetailBackHref,
  parseDashboardSession,
} from "./buddy-session-navigation";

describe("buddy session navigation", () => {
  const selection = { activityId: 42, scheduleId: 99, date: "2026-10-15" };
  it("carries the KST session date and returns to that exact application list", () => {
    expect(activityDetailFromSessionHref(42, 99, "2026-10-14T23:00:00Z")).toBe(
      "/my-activities/42?from=applications&date=2026-10-15&scheduleId=99",
    );
    const params = { from: "applications", date: selection.date, scheduleId: "99" };
    expect(activityDetailBackHref("42", params)).toBe(
      "/dashboard?date=2026-10-15&activityId=42&scheduleId=99",
    );
    expect(
      parseDashboardSession({ date: selection.date, activityId: "42", scheduleId: "99" }),
    ).toEqual(selection);
  });
  it.each([
    {},
    { from: "elsewhere" },
    { from: "applications", date: "2026-02-30", scheduleId: "99" },
    { from: "applications", date: "2026-10-15", scheduleId: "-1" },
    { from: "applications", date: ["2026-10-15"], scheduleId: "99" },
  ])("keeps the normal activity-list fallback for invalid context %j", (params) => {
    expect(activityDetailBackHref("42", params)).toBe("/my-activities");
  });
});
