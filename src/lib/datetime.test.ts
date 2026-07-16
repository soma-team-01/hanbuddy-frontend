import { describe, expect, it } from "vitest";
import {
  formatSeoulDateTime,
  getSeoulDateTimeParts,
  SERVICE_TIME_ZONE,
  toSeoulStartAt,
} from "./datetime";

const SEOUL_BOUNDARY_INSTANT = "2026-07-18T16:30:00Z";

describe("Seoul date-time boundary", () => {
  it("uses Asia/Seoul as the service time zone", () => {
    expect(SERVICE_TIME_ZONE).toBe("Asia/Seoul");
  });

  it("returns the Seoul calendar date and clock time for an offsetful instant", () => {
    expect(getSeoulDateTimeParts(SEOUL_BOUNDARY_INSTANT)).toEqual({
      date: "2026-07-19",
      time: "01:30",
    });
  });

  it.each([
    ["an offset-less value", "2026-07-19T01:30"],
    ["an impossible calendar date", "2026-02-30T01:30:00+09:00"],
    ["an invalid value", "not-a-date"],
  ])("rejects %s", (_label, value) => {
    expect(getSeoulDateTimeParts(value)).toBeNull();
    expect(formatSeoulDateTime(value, "en")).toBeNull();
  });

  it("interprets datetime-local input as Seoul wall-clock time", () => {
    expect(toSeoulStartAt("2026-07-19T13:00")).toBe("2026-07-19T13:00:00+09:00");
  });

  it.each(["", "2026-02-30T13:00", "2026-07-19T24:00", "2026-07-19T13:00Z"])(
    "rejects invalid datetime-local input %j",
    (value) => {
      expect(toSeoulStartAt(value)).toBeNull();
    },
  );

  it("formats the same Seoul instant in English and Korean", () => {
    expect(formatSeoulDateTime(SEOUL_BOUNDARY_INSTANT, "en")).toBe("Jul 19, 2026, 1:30 AM");
    expect(formatSeoulDateTime(SEOUL_BOUNDARY_INSTANT, "ko")).toBe("2026. 7. 19. 오전 1:30");
  });
});
