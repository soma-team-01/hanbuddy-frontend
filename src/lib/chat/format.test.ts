import { describe, expect, it } from "vitest";
import {
  formatChatDateSeparator,
  formatChatTimestamp,
  groupChatMessages,
  isSameSeoulDate,
} from "./format";
import type { ChatMessageResponse } from "@/types/chat";

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

function message(messageId: number, senderId: number, createdAt: string): ChatMessageResponse {
  return {
    messageId,
    senderId,
    senderName: senderId === 11 ? "Nelli" : "SeoulMate",
    senderProfileImageUrl: null,
    content: `message ${messageId}`,
    createdAt,
  };
}

describe("groupChatMessages", () => {
  it("groups consecutive messages from the same sender within one minute", () => {
    const groups = groupChatMessages([
      message(1, 11, "2026-08-10T11:20:05+09:00"),
      message(2, 11, "2026-08-10T11:20:41+09:00"),
      message(3, 11, "2026-08-10T11:21:02+09:00"),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].messages.map((item) => item.messageId)).toEqual([1, 2]);
    // 묶음의 시각은 마지막 메시지 기준이다
    expect(groups[0].timestamp).toBe("2026-08-10T11:20:41+09:00");
    expect(groups[1].messages.map((item) => item.messageId)).toEqual([3]);
  });

  it("keeps each sender separate even at the same minute", () => {
    const groups = groupChatMessages([
      message(1, 11, "2026-08-10T11:20:05+09:00"),
      message(2, 6, "2026-08-10T11:20:20+09:00"),
      message(3, 11, "2026-08-10T11:20:40+09:00"),
    ]);

    // 같은 11시 20분이어도 사람이 바뀌면 각자 자기 시각을 갖는다
    expect(groups).toHaveLength(3);
    expect(groups.map((group) => group.senderId)).toEqual([11, 6, 11]);
  });

  it("starts a new group when the day changes", () => {
    const groups = groupChatMessages([
      message(1, 11, "2026-08-09T23:59:30+09:00"),
      message(2, 11, "2026-08-10T00:00:10+09:00"),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0].startsNewDate).toBe(true);
    expect(groups[1].startsNewDate).toBe(true);
  });

  it("marks only the first group of a day for a date separator", () => {
    const groups = groupChatMessages([
      message(1, 11, "2026-08-10T11:20:05+09:00"),
      message(2, 6, "2026-08-10T11:25:00+09:00"),
    ]);

    expect(groups[0].startsNewDate).toBe(true);
    expect(groups[1].startsNewDate).toBe(false);
  });

  it("returns nothing for an empty conversation", () => {
    expect(groupChatMessages([])).toEqual([]);
  });
});
