import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getMyChatRooms, updateChatRead } from "@/lib/api/chat";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { ChatRoomSummaryResponse } from "@/types/chat";
import { ChatListMenu } from "./ChatListMenu";

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
            sourceLanguage: "KO",
            contentLanguage: "KO",
            originalContent: "안녕하세요",
            createdAt: "2026-08-10T13:00:00+09:00",
          },
    unreadCount,
  };
}

describe("ChatListMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpdateChatRead.mockResolvedValue({ status: "success", chat: null });
  });

  it("keeps the action hidden until the menu is opened", async () => {
    mockedGetMyChatRooms.mockResolvedValue({ status: "success", rooms: [room(1, 3, 21)] });

    renderWithQueryClient(<ChatListMenu />);

    expect(screen.queryByRole("menuitem")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Conversation options" }));
    expect(await screen.findByRole("menuitem", { name: "Mark all as read" })).toBeInTheDocument();
  });

  it("marks every unread conversation up to its last message", async () => {
    mockedGetMyChatRooms.mockResolvedValue({
      status: "success",
      rooms: [room(1, 3, 21), room(2, 0, 40), room(3, 1, 55)],
    });

    renderWithQueryClient(<ChatListMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Conversation options" }));
    const action = await screen.findByRole("menuitem", { name: "Mark all as read" });
    // 목록을 받아와야 올릴 위치를 알 수 있어 그때까지 비활성이다
    await waitFor(() => expect(action).toBeEnabled());
    fireEvent.click(action);

    await waitFor(() => expect(mockedUpdateChatRead).toHaveBeenCalledTimes(2));
    expect(mockedUpdateChatRead).toHaveBeenCalledWith(1, { lastReadMessageId: 21 });
    expect(mockedUpdateChatRead).toHaveBeenCalledWith(3, { lastReadMessageId: 55 });
    // 처리 후 메뉴는 닫힌다
    await waitFor(() => expect(screen.queryByRole("menuitem")).not.toBeInTheDocument());
  });

  it("waits for every request even when one of them fails", async () => {
    mockedGetMyChatRooms.mockResolvedValue({
      status: "success",
      rooms: [room(1, 3, 21), room(3, 1, 55)],
    });
    mockedUpdateChatRead.mockImplementation(async (chatRoomId) => {
      if (chatRoomId === 1) throw new Error("read failed");
      return { status: "success", chat: null };
    });

    renderWithQueryClient(<ChatListMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Conversation options" }));
    const action = await screen.findByRole("menuitem", { name: "Mark all as read" });
    await waitFor(() => expect(action).toBeEnabled());
    fireEvent.click(action);

    // 먼저 실패했다고 나머지를 끊지 않는다 — 성공한 방은 읽음으로 남아야 한다
    await waitFor(() => expect(mockedUpdateChatRead).toHaveBeenCalledTimes(2));
    expect(mockedUpdateChatRead).toHaveBeenCalledWith(3, { lastReadMessageId: 55 });
    // 전부 성공하지 않았으므로 메뉴는 열어 둔다
    expect(await screen.findByRole("menuitem", { name: "Mark all as read" })).toBeInTheDocument();
  });

  it("disables the action when everything is already read", async () => {
    mockedGetMyChatRooms.mockResolvedValue({ status: "success", rooms: [room(1, 0, 21)] });

    renderWithQueryClient(<ChatListMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Conversation options" }));

    expect(await screen.findByRole("menuitem", { name: "Mark all as read" })).toBeDisabled();
    expect(mockedUpdateChatRead).not.toHaveBeenCalled();
  });

  it("closes on Escape", async () => {
    mockedGetMyChatRooms.mockResolvedValue({ status: "success", rooms: [room(1, 3, 21)] });

    renderWithQueryClient(<ChatListMenu />);

    fireEvent.click(screen.getByRole("button", { name: "Conversation options" }));
    expect(await screen.findByRole("menuitem")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menuitem")).not.toBeInTheDocument());
  });
});
