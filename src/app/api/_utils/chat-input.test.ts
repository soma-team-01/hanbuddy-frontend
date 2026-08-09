import { describe, expect, it } from "vitest";
import {
  buildChatMessageQuery,
  isPositiveId,
  isValidChatMessageContent,
  isValidChatRoomId,
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
