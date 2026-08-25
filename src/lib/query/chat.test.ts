import { describe, expect, it } from "vitest";
import {
  CHAT_ROOM_LIST_POLL_INTERVAL,
  chatRoomQueryOptions,
  latestChatMessagesQueryOptions,
  mergeChatMessages,
  myChatRoomsQueryOptions,
} from "./chat";
import type { ChatMessageResponse } from "@/types/chat";

function message(messageId: number): ChatMessageResponse {
  return {
    messageId,
    senderId: 6,
    senderName: "SeoulMate",
    senderProfileImageUrl: null,
    content: `message ${messageId}`,
    sourceLanguage: "KO",
    contentLanguage: "KO",
    originalContent: `message ${messageId}`,
    createdAt: "2026-08-09T13:00:00+09:00",
  };
}

describe("mergeChatMessages", () => {
  it("orders every message from oldest to newest", () => {
    const merged = mergeChatMessages([message(30), message(29)], [message(2), message(1)]);

    expect(merged.map((item) => item.messageId)).toEqual([1, 2, 29, 30]);
  });

  it("keeps one copy when the latest and history pages overlap", () => {
    const merged = mergeChatMessages([message(3), message(2)], [message(2), message(1)]);

    expect(merged.map((item) => item.messageId)).toEqual([1, 2, 3]);
  });

  it("returns an empty list when there is nothing to merge", () => {
    expect(mergeChatMessages([], [])).toEqual([]);
  });
});

describe("chat polling", () => {
  it("checks room-list unread counts every 15 seconds", () => {
    expect(CHAT_ROOM_LIST_POLL_INTERVAL).toBe(15_000);
    expect(myChatRoomsQueryOptions("EN").refetchInterval).toBe(15_000);
  });

  it("never replaces the room WebSocket with REST polling", () => {
    expect(chatRoomQueryOptions(1, "EN").refetchInterval).toBe(false);
    expect(latestChatMessagesQueryOptions(1, "EN").refetchInterval).toBe(false);
  });
});
