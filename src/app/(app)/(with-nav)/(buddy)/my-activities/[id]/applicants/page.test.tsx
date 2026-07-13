import { describe, expect, it } from "vitest";
import { normalizeScheduleId } from "./schedule-id";

describe("normalizeScheduleId", () => {
  it.each(["", "   ", ["", "99"], ["   ", "99"]])(
    "normalizes an empty schedule id to undefined",
    (scheduleId) => {
      expect(normalizeScheduleId(scheduleId)).toBeUndefined();
    },
  );

  it.each([
    ["99", "99"],
    [" 99 ", "99"],
    [["99", "100"], "99"],
  ])("preserves the first non-empty schedule id", (scheduleId, expected) => {
    expect(normalizeScheduleId(scheduleId)).toBe(expected);
  });
});
