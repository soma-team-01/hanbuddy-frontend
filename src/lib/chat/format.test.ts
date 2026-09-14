import { describe, expect, it } from "vitest";
import {
  chatPhotoRows,
  formatChatDateSeparator,
  formatChatScheduleLabel,
  formatChatTimestamp,
  groupChatMessages,
  isSameSeoulDate,
  toChatBubbles,
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
    sourceLanguage: "KO",
    contentLanguage: "KO",
    originalContent: `message ${messageId}`,
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

function imageMessage(
  messageId: number,
  senderId: number,
  createdAt: string,
  batchId?: string,
): ChatMessageResponse {
  return {
    ...message(messageId, senderId, createdAt),
    messageType: "IMAGE",
    content: null,
    originalContent: null,
    imageUrl: `https://cdn/chats/${messageId}.webp`,
    batchId: batchId ?? null,
  };
}

describe("groupChatMessages with batches", () => {
  it("keeps a batch together when it crosses a minute boundary", () => {
    const batchId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
    const groups = groupChatMessages([
      imageMessage(1, 11, "2026-08-10T11:20:59+09:00", batchId),
      imageMessage(2, 11, "2026-08-10T11:21:00+09:00", batchId),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].messages.map((item) => item.messageId)).toEqual([1, 2]);
  });
});

describe("toChatBubbles", () => {
  it("merges photos sent together into one bubble", () => {
    const bubbles = toChatBubbles([
      imageMessage(1, 11, "2026-08-10T11:20:05+09:00"),
      imageMessage(2, 11, "2026-08-10T11:20:06+09:00"),
      imageMessage(3, 11, "2026-08-10T11:20:07+09:00"),
    ]);

    expect(bubbles).toHaveLength(1);
    expect(bubbles[0].kind).toBe("images");
    expect(bubbles[0].kind === "images" && bubbles[0].images).toHaveLength(3);
  });

  it("keeps text messages as their own bubbles", () => {
    const bubbles = toChatBubbles([
      message(1, 11, "2026-08-10T11:20:05+09:00"),
      message(2, 11, "2026-08-10T11:20:06+09:00"),
    ]);

    expect(bubbles.map((bubble) => bubble.kind)).toEqual(["text", "text"]);
  });

  it("splits a photo run when a message comes between", () => {
    const bubbles = toChatBubbles([
      imageMessage(1, 11, "2026-08-10T11:20:05+09:00"),
      message(2, 11, "2026-08-10T11:20:06+09:00"),
      imageMessage(3, 11, "2026-08-10T11:20:07+09:00"),
    ]);

    expect(bubbles.map((bubble) => bubble.kind)).toEqual(["images", "text", "images"]);
  });

  it("keeps two batches sent back to back apart", () => {
    const bubbles = toChatBubbles([
      imageMessage(1, 11, "2026-08-10T11:20:05+09:00", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      imageMessage(2, 11, "2026-08-10T11:20:06+09:00", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
      imageMessage(3, 11, "2026-08-10T11:20:07+09:00", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"),
    ]);

    expect(bubbles).toHaveLength(2);
    expect(bubbles[0].kind === "images" && bubbles[0].images).toHaveLength(2);
    expect(bubbles[1].kind === "images" && bubbles[1].images).toHaveLength(1);
  });

  it("groups a batch even when the minute rolls over", () => {
    const batchId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const bubbles = toChatBubbles([
      imageMessage(1, 11, "2026-08-10T11:20:59+09:00", batchId),
      imageMessage(2, 11, "2026-08-10T11:21:00+09:00", batchId),
    ]);

    expect(bubbles).toHaveLength(1);
    expect(bubbles[0].kind === "images" && bubbles[0].images).toHaveLength(2);
  });

  it("returns nothing for an empty group", () => {
    expect(toChatBubbles([])).toEqual([]);
  });
});

describe("chatPhotoRows", () => {
  it.each([
    [1, [1]],
    [2, [2]],
    [3, [1, 2]],
    [4, [2, 2]],
    [5, [3, 2]],
    [6, [3, 3]],
    [7, [3, 2, 2]],
    [8, [3, 3, 2]],
    [9, [3, 3, 3]],
  ])("splits %i photos as %j", (count, expected) => {
    expect(chatPhotoRows(count)).toEqual(expected);
  });

  it("always accounts for every photo", () => {
    for (let count = 1; count <= 9; count += 1) {
      const rows = chatPhotoRows(count);
      expect(rows.reduce((total, size) => total + size, 0)).toBe(count);
      expect(rows.every((size) => size > 0)).toBe(true);
    }
  });

  it("returns nothing when there is no photo", () => {
    expect(chatPhotoRows(0)).toEqual([]);
  });
});

describe("formatChatScheduleLabel", () => {
  it("names the day and start time of the group room's schedule", () => {
    expect(formatChatScheduleLabel("2026-08-14T17:30:00+09:00", "en")).toBe("Fri, Aug 14 5:30 PM");
    expect(formatChatScheduleLabel("2026-08-14T17:30:00+09:00", "ko")).toBe(
      "8. 14. (금) 오후 5:30",
    );
  });

  it("stays out of the way for one-to-one rooms", () => {
    expect(formatChatScheduleLabel(null, "en")).toBeNull();
    expect(formatChatScheduleLabel(undefined, "en")).toBeNull();
  });
});
