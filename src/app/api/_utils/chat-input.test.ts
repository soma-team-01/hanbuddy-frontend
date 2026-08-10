import { describe, expect, it } from "vitest";
import {
  buildChatImagePageQuery,
  buildChatMessageQuery,
  isValidChatImageKey,
  isPositiveId,
  isValidChatMessageContent,
  isValidChatRoomId,
  normalizeChatRoomTitle,
} from "./chat-input";

function query(search: string) {
  return buildChatMessageQuery(new URLSearchParams(search));
}

describe("chat input validation", () => {
  it("accepts only positive integer identifiers", () => {
    expect(isPositiveId(1)).toBe(true);
    expect(isPositiveId(0)).toBe(false);
    expect(isPositiveId(-3)).toBe(false);
    expect(isPositiveId(1.5)).toBe(false);
    expect(isPositiveId("7")).toBe(false);
    expect(isPositiveId(undefined)).toBe(false);
    // 안전 범위를 넘으면 값이 정확히 표현되지 않으므로 ID로 받지 않는다
    expect(isPositiveId(Number.MAX_SAFE_INTEGER)).toBe(true);
    expect(isPositiveId(Number.MAX_SAFE_INTEGER + 2)).toBe(false);
    expect(isPositiveId(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it("requires non-empty message content within the backend limit", () => {
    expect(isValidChatMessageContent("안녕하세요")).toBe(true);
    expect(isValidChatMessageContent("a".repeat(2000))).toBe(true);
    expect(isValidChatMessageContent("a".repeat(2001))).toBe(false);
    expect(isValidChatMessageContent("   ")).toBe(false);
    expect(isValidChatMessageContent("")).toBe(false);
    expect(isValidChatMessageContent(12)).toBe(false);
  });

  it("accepts only positive integer room ids from the path", () => {
    expect(isValidChatRoomId("12")).toBe(true);
    expect(isValidChatRoomId("0")).toBe(false);
    expect(isValidChatRoomId("-1")).toBe(false);
    expect(isValidChatRoomId("1a")).toBe(false);
    // 자릿수가 아주 많은 문자열은 Number 변환에서 Infinity가 된다
    expect(isValidChatRoomId("9".repeat(400))).toBe(false);
  });

  it("treats only an explicit null or blank title as a reset", () => {
    expect(normalizeChatRoomTitle("8월 14일 팀")).toBe("8월 14일 팀");
    expect(normalizeChatRoomTitle("  여백  ")).toBe("여백");
    expect(normalizeChatRoomTitle(null)).toBeNull();
    expect(normalizeChatRoomTitle("   ")).toBeNull();
    // title 키가 없는 요청까지 초기화로 처리하면 빈 PATCH가 방 이름을 지운다
    expect(normalizeChatRoomTitle(undefined)).toBeUndefined();
    expect(normalizeChatRoomTitle(12)).toBeUndefined();
    expect(normalizeChatRoomTitle("a".repeat(51))).toBeUndefined();
  });

  it("normalizes the message page query", () => {
    expect(query("size=30")).toBe("?size=30");
    expect(query("")).toBe("?size=30");
    expect(query("size=0")).toBe("?size=30");
    expect(query("size=500")).toBe("?size=100");
    expect(query("size=20&beforeMessageId=118")).toBe("?size=20&beforeMessageId=118");
  });

  it("drops an unusable cursor instead of forwarding it", () => {
    expect(query("size=20&beforeMessageId=0")).toBe("?size=20");
    expect(query("size=20&beforeMessageId=abc")).toBe("?size=20");
    expect(query("size=20&beforeMessageId=-5")).toBe("?size=20");
  });
});

describe("chat image input", () => {
  it("accepts only keys issued for the chat folder", () => {
    expect(isValidChatImageKey("chats/2026/08/10/uuid.webp")).toBe(true);
    expect(isValidChatImageKey("activities/uuid.webp")).toBe(false);
    expect(isValidChatImageKey("profiles/uuid.webp")).toBe(false);
    expect(isValidChatImageKey("chats/../secret.webp")).toBe(false);
    expect(isValidChatImageKey("")).toBe(false);
    expect(isValidChatImageKey(42)).toBe(false);
  });

  it("normalizes the photo panel page query", () => {
    const query = (search: string) => buildChatImagePageQuery(new URLSearchParams(search));

    expect(query("page=1&size=30")).toBe("?page=1&size=30");
    expect(query("")).toBe("?page=0&size=30");
    expect(query("page=-1&size=0")).toBe("?page=0&size=30");
    expect(query("page=0&size=500")).toBe("?page=0&size=100");
  });
});
