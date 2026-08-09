import { describe, expect, it } from "vitest";
import { formatChatDateSeparator, formatChatTimestamp, isSameSeoulDate } from "./format";

const now = { date: "2026-08-09", time: "13:00" };
const translate = (key: "today" | "yesterday") => (key === "today" ? "Today" : "Yesterday");

describe("chat timestamps", () => {
  it("shows the time for messages sent today", () => {
    expect(formatChatTimestamp("2026-08-09T09:30:00+09:00", "en", translate, now)).toBe("9:30 AM");
  });

  it("labels yesterday instead of repeating the date", () => {
    expect(formatChatTimestamp("2026-08-08T22:10:00+09:00", "en", translate, now)).toBe(
      "Yesterday",
    );
  });

  it("falls back to the date for older messages", () => {
    expect(formatChatTimestamp("2026-07-30T22:10:00+09:00", "en", translate, now)).toBe(
      "Jul 30, 2026",
    );
  });

  it("crosses a month boundary when resolving yesterday", () => {
    const firstOfMonth = { date: "2026-08-01", time: "09:00" };
    expect(
      formatChatDateSeparator("2026-07-31T20:00:00+09:00", "en", translate, firstOfMonth),
    ).toBe("Yesterday");
  });

  it("groups messages sent on the same Seoul day", () => {
    expect(isSameSeoulDate("2026-08-09T00:30:00+09:00", "2026-08-09T23:30:00+09:00")).toBe(true);
    expect(isSameSeoulDate("2026-08-09T23:30:00+09:00", "2026-08-10T00:30:00+09:00")).toBe(false);
  });
});
