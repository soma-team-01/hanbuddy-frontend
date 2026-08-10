import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMyChatRooms, updateChatRead } from "@/lib/api/chat";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { ChatRoomSummaryResponse } from "@/types/chat";
import { ChatMarkAllReadButton } from "./ChatMarkAllReadButton";

vi.mock("@/lib/api/chat", () => ({ getMyChatRooms: vi.fn(), updateChatRead: vi.fn() }));

const mockedGetMyChatRooms = vi.mocked(getMyChatRooms);
const mockedUpdateChatRead = vi.mocked(updateChatRead);

function room(
  chatRoomId: number,
  unreadCount: number,
  lastMessageId: number | null,
): ChatRoomSummaryResponse {
  return {
    chatRoomId,
    roomType: "DIRECT",
    title: `Room ${chatRoomId}`,
    imageUrl: null,
    activityScheduleId: null,
    lastMessage:
      lastMessageId === null
        ? null
        : {
            messageId: lastMessageId,
            senderId: 6,
            senderName: "SeoulMate",
            senderProfileImageUrl: null,
            content: "안녕하세요",
            createdAt: "2026-08-10T13:00:00+09:00",
          },
    unreadCount,
  };
}

describe("ChatMarkAllReadButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpdateChatRead.mockResolvedValue({ status: "success", chat: null });
  });

  it("marks every unread conversation up to its last message", async () => {
    mockedGetMyChatRooms.mockResolvedValue({
      status: "success",
      rooms: [room(1, 3, 21), room(2, 0, 40), room(3, 1, 55)],
    });

    renderWithQueryClient(<ChatMarkAllReadButton />);

    fireEvent.click(await screen.findByRole("button", { name: "Mark all as read" }));

    await waitFor(() => expect(mockedUpdateChatRead).toHaveBeenCalledTimes(2));
    expect(mockedUpdateChatRead).toHaveBeenCalledWith(1, { lastReadMessageId: 21 });
    expect(mockedUpdateChatRead).toHaveBeenCalledWith(3, { lastReadMessageId: 55 });
  });

  it("stays hidden when everything is already read", async () => {
    mockedGetMyChatRooms.mockResolvedValue({ status: "success", rooms: [room(1, 0, 21)] });

    renderWithQueryClient(<ChatMarkAllReadButton />);

    await waitFor(() => expect(mockedGetMyChatRooms).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Mark all as read" })).not.toBeInTheDocument();
  });

  it("skips a conversation that has no message to mark", async () => {
    mockedGetMyChatRooms.mockResolvedValue({ status: "success", rooms: [room(1, 2, null)] });

    renderWithQueryClient(<ChatMarkAllReadButton />);

    await waitFor(() => expect(mockedGetMyChatRooms).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Mark all as read" })).not.toBeInTheDocument();
  });
});
