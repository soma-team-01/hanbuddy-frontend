import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { openChatRoomStream } from "@/lib/chat/stomp-client";
import { chatKeys } from "@/lib/query/chat";
import { appendMessage, applyReadEvent, useChatRoomStream } from "./use-chat-room-stream";
import type {
  ChatMessagePageResponse,
  ChatMessageResponse,
  ChatRoomDetailResponse,
} from "@/types/chat";

vi.mock("@/lib/chat/stomp-client", () => ({ openChatRoomStream: vi.fn() }));

const mockedOpenChatRoomStream = vi.mocked(openChatRoomStream);

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

describe("useChatRoomStream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stays read-only after automatic retries fail and lets the user retry", async () => {
    const close = vi.fn();
    mockedOpenChatRoomStream.mockReturnValue(close);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useChatRoomStream("1", "EN"), { wrapper });
    const firstHandlers = mockedOpenChatRoomStream.mock.calls[0][1];

    act(() => firstHandlers.onStatusChange("failed"));
    expect(result.current.status).toBe("failed");

    act(() => result.current.retry());
    expect(result.current.status).toBe("connecting");
    await waitFor(() => expect(mockedOpenChatRoomStream).toHaveBeenCalledTimes(2));
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("synchronizes messages and read positions once the socket connects", () => {
    mockedOpenChatRoomStream.mockReturnValue(vi.fn());
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children);

    const { result } = renderHook(() => useChatRoomStream("1", "EN"), { wrapper });
    const streamHandlers = mockedOpenChatRoomStream.mock.calls[0][1];

    act(() => streamHandlers.onStatusChange("connected"));

    expect(result.current.status).toBe("connected");
    expect(invalidate).toHaveBeenCalledWith({ queryKey: chatKeys.latestMessages("1") });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: chatKeys.room("1", "EN") });
  });
});

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
