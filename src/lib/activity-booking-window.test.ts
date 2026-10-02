import { describe, expect, it } from "vitest";
import {
  isBookingOpen,
  isBookableSession,
  isActivitySearchDate,
  withActivityDate,
} from "./activity-booking-window";

describe("activity booking window", () => {
  const now = Date.parse("2026-09-30T23:30:00+09:00");
  it("allows exactly 24 hours, excludes one millisecond before the boundary", () => {
    expect(isBookingOpen("2026-10-01T23:30:00+09:00", now)).toBe(true);
    expect(isBookingOpen("2026-10-01T23:29:59.999+09:00", now)).toBe(false);
    expect(isBookingOpen("2026-10-01T14:30:00Z", now)).toBe(true);
  });
  it("rejects missing/invalid/past times and sold-out sessions", () => {
    for (const startAt of [undefined, "invalid", "2026-09-30T23:30:00+09:00"]) {
      expect(isBookingOpen(startAt, now)).toBe(false);
    }
    expect(isBookableSession({ startAt: "2026-10-02T12:00:00+09:00", spotsLeft: 0 }, now)).toBe(
      false,
    );
    expect(isBookableSession({ startAt: "2026-10-02T12:00:00+09:00", spotsLeft: 4 }, now)).toBe(
      true,
    );
  });
  it("validates calendar dates without converting the selected KST day to UTC", () => {
    for (const date of ["2026-09-30", "2028-02-29"]) expect(isActivitySearchDate(date)).toBe(true);
    for (const date of ["2026-02-29", "2026-04-31", "2026-13-01", "2026-9-30", "", "0000-01-01"])
      expect(isActivitySearchDate(date)).toBe(false);
    expect(withActivityDate("/activities?language=KO", "2026-09-30")).toBe(
      "/activities?language=KO&date=2026-09-30",
    );
    expect(withActivityDate("/activities?date=2026-09-30&language=KO", "")).toBe(
      "/activities?language=KO",
    );
  });
});
