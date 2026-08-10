import { describe, expect, it } from "vitest";
import { appendMessage, applyReadEvent } from "./use-chat-room-stream";
import type {
  ChatMessagePageResponse,
  ChatMessageResponse,
  ChatRoomDetailResponse,
} from "@/types/chat";

function message(messageId: number): ChatMessageResponse {
  return {
    messageId,
    senderId: 6,
    senderName: "SeoulMate",
    senderProfileImageUrl: null,
    content: `message ${messageId}`,
    createdAt: "2026-08-10T13:00:00+09:00",
  };
}

const page: ChatMessagePageResponse = {
  messages: [message(21), message(20)],
  nextCursor: null,
  hasNext: false,
};

const room: ChatRoomDetailResponse = {
  chatRoomId: 1,
  roomType: "DIRECT",
  title: "SeoulMate",
  activityScheduleId: null,
  members: [
    { userId: 11, userName: "Nelli", profileImageUrl: null, lastReadMessageId: 20, left: false },
    { userId: 6, userName: "SeoulMate", profileImageUrl: null, lastReadMessageId: 21, left: false },
  ],
};

describe("appendMessage", () => {
  it("puts a broadcast message at the front of the latest page", () => {
    const next = appendMessage(page, message(22));

    expect(next?.messages.map((item) => item.messageId)).toEqual([22, 21, 20]);
  });

  it("ignores a message already delivered by the send response", () => {
    expect(appendMessage(page, message(21))).toBe(page);
  });

  it("leaves an unloaded page alone", () => {
    expect(appendMessage(undefined, message(22))).toBeUndefined();
  });
});

describe("applyReadEvent", () => {
  it("moves the reader's position forward", () => {
    const next = applyReadEvent(room, { chatRoomId: 1, userId: 11, lastReadMessageId: 21 });

    expect(next?.members.find((member) => member.userId === 11)?.lastReadMessageId).toBe(21);
  });

  it("ignores a position that moves backwards", () => {
    const next = applyReadEvent(room, { chatRoomId: 1, userId: 6, lastReadMessageId: 15 });

    expect(next?.members.find((member) => member.userId === 6)?.lastReadMessageId).toBe(21);
  });

  it("leaves other members untouched", () => {
    const next = applyReadEvent(room, { chatRoomId: 1, userId: 11, lastReadMessageId: 21 });

    expect(next?.members.find((member) => member.userId === 6)?.lastReadMessageId).toBe(21);
  });
});
