import { describe, expect, it } from "vitest";
import {
  addDaysToDateKey,
  addMonthsToMonthKey,
  monthGridDateKeys,
  monthKeyOf,
  startOfWeek,
  weekDateKeys,
  weekdayIndexOf,
} from "./calendar";

describe("dashboard calendar math", () => {
  it("adds days across month and year edges", () => {
    expect(addDaysToDateKey("2026-08-31", 1)).toBe("2026-09-01");
    expect(addDaysToDateKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysToDateKey("2026-03-01", -1)).toBe("2026-02-28");
    // 윤년
    expect(addDaysToDateKey("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("finds the Sunday a date belongs to", () => {
    // 2026-08-12는 수요일
    expect(weekdayIndexOf("2026-08-12")).toBe(3);
    expect(startOfWeek("2026-08-12")).toBe("2026-08-09");
    // 일요일은 자기 자신
    expect(startOfWeek("2026-08-09")).toBe("2026-08-09");
    expect(startOfWeek("2026-08-15")).toBe("2026-08-09");
  });

  it("lays out a week from Sunday to Saturday", () => {
    expect(weekDateKeys("2026-08-12")).toEqual([
      "2026-08-09",
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
      "2026-08-15",
    ]);
  });

  it("moves between months including year rollover", () => {
    expect(monthKeyOf("2026-08-12")).toBe("2026-08");
    expect(addMonthsToMonthKey("2026-12", 1)).toBe("2027-01");
    expect(addMonthsToMonthKey("2026-01", -1)).toBe("2025-12");
  });

  it("pads the month grid to a Sunday-first layout", () => {
    // 2026-08-01은 토요일 → 앞에 빈 칸 6개
    const grid = monthGridDateKeys("2026-08");
    expect(grid.slice(0, 7)).toEqual([null, null, null, null, null, null, "2026-08-01"]);
    expect(grid.filter(Boolean)).toHaveLength(31);
    expect(grid.at(-1)).toBe("2026-08-31");
  });
});
