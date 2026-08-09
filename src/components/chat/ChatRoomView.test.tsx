import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getChatMessages,
  getChatRoom,
  getMyChatRooms,
  leaveChatRoom,
  sendChatMessage,
  updateChatRead,
} from "@/lib/api/chat";
import { getMyProfile } from "@/lib/api/users";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { ChatMessageResponse } from "@/types/chat";
import { ChatRoomView } from "./ChatRoomView";

const routerMock = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/chat", () => ({
  getChatRoom: vi.fn(),
  getChatMessages: vi.fn(),
  getMyChatRooms: vi.fn(),
  sendChatMessage: vi.fn(),
  updateChatRead: vi.fn(),
  leaveChatRoom: vi.fn(),
}));

vi.mock("@/lib/api/users", () => ({ getMyProfile: vi.fn() }));

const mockedGetChatRoom = vi.mocked(getChatRoom);
const mockedGetChatMessages = vi.mocked(getChatMessages);
const mockedGetMyChatRooms = vi.mocked(getMyChatRooms);
const mockedSendChatMessage = vi.mocked(sendChatMessage);
const mockedUpdateChatRead = vi.mocked(updateChatRead);
const mockedLeaveChatRoom = vi.mocked(leaveChatRoom);
const mockedGetMyProfile = vi.mocked(getMyProfile);

function message(messageId: number, senderId: number, content: string): ChatMessageResponse {
  return {
    messageId,
    senderId,
    senderName: senderId === 11 ? "Nelli" : "SeoulMate",
    senderProfileImageUrl: null,
    content,
    createdAt: "2026-08-09T13:00:00+09:00",
  };
}

function mockDirectRoom(lastReadMessageId: number | null = null) {
  mockedGetChatRoom.mockResolvedValue({
    status: "success",
    room: {
      chatRoomId: 1,
      roomType: "DIRECT",
      title: "SeoulMate",
      activityScheduleId: null,
      members: [
        {
          userId: 11,
          userName: "Nelli",
          profileImageUrl: null,
          lastReadMessageId: 21,
          left: false,
        },
        {
          userId: 6,
          userName: "SeoulMate",
          profileImageUrl: null,
          lastReadMessageId,
          left: false,
        },
      ],
    },
  });
}

describe("ChatRoomView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetMyProfile.mockResolvedValue({
      status: "success",
      profile: { userId: 11, displayName: "Nelli" } as never,
    });
    mockedGetMyChatRooms.mockResolvedValue({ status: "success", rooms: [] });
    mockedUpdateChatRead.mockResolvedValue({ status: "success", chat: null });
    mockDirectRoom();
    mockedGetChatMessages.mockResolvedValue({
      status: "success",
      messages: {
        messages: [message(21, 11, "언제 만날까요?"), message(20, 6, "안녕하세요!")],
        nextCursor: null,
        hasNext: false,
      },
    });
  });

  it("shows the conversation oldest first with the counterpart's name", async () => {
    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    expect(await screen.findByRole("heading", { name: "SeoulMate" })).toBeInTheDocument();
    const bubbles = await screen.findAllByText(/안녕하세요!|언제 만날까요\?/);
    expect(bubbles[0]).toHaveTextContent("안녕하세요!");
    expect(bubbles[1]).toHaveTextContent("언제 만날까요?");
  });

  it("reports the newest message as read when the conversation opens", async () => {
    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    await waitFor(() =>
      expect(mockedUpdateChatRead).toHaveBeenCalledWith("1", { lastReadMessageId: 21 }),
    );
  });

  it("sends a message and clears the draft", async () => {
    mockedSendChatMessage.mockResolvedValue({
      status: "success",
      message: message(22, 11, "내일 3시 어때요?"),
    });

    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    const input = await screen.findByLabelText("Message");
    fireEvent.change(input, { target: { value: "내일 3시 어때요?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(mockedSendChatMessage).toHaveBeenCalledWith("1", { content: "내일 3시 어때요?" }),
    );
    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("sends on Enter but keeps Shift+Enter for a new line", async () => {
    mockedSendChatMessage.mockResolvedValue({
      status: "success",
      message: message(22, 11, "네!"),
    });

    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    const input = await screen.findByLabelText("Message");
    fireEvent.change(input, { target: { value: "네!" } });
    fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
    expect(mockedSendChatMessage).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() =>
      expect(mockedSendChatMessage).toHaveBeenCalledWith("1", { content: "네!" }),
    );
  });

  it("refuses to send an empty draft", async () => {
    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    const input = await screen.findByLabelText("Message");
    fireEvent.change(input, { target: { value: "   " } });

    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(mockedSendChatMessage).not.toHaveBeenCalled();
  });

  it("leaves the conversation after confirmation", async () => {
    mockedLeaveChatRoom.mockResolvedValue({ status: "success", chat: null });

    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Leave conversation" }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Leave conversation" }));

    await waitFor(() => expect(mockedLeaveChatRoom).toHaveBeenCalledWith("1"));
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/en/chat"));
  });

  it("surfaces the backend message when sending fails", async () => {
    const { ApiClientError } = await import("@/lib/api/errors");
    mockedSendChatMessage.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "CHAT403_MEMBER",
        status: 403,
        details: null,
        backendMessage: "채팅방 참여자만 접근할 수 있습니다.",
      }),
    });

    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    const input = await screen.findByLabelText("Message");
    fireEvent.change(input, { target: { value: "안녕" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You are no longer part of this conversation.",
    );
  });
});
