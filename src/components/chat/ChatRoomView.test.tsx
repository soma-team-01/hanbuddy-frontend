import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createChatWsTicket,
  removeChatRoomMember,
  updateChatRoomTitle,
  getChatMessages,
  getChatRoom,
  getMyChatRooms,
  leaveChatRoom,
  sendChatMessage,
  updateChatRead,
} from "@/lib/api/chat";
import { getMyProfile } from "@/lib/api/users";
import { uploadChatImages } from "@/lib/images/presigned";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { ChatMessageResponse } from "@/types/chat";
import { ChatRoomView } from "./ChatRoomView";

const routerMock = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

vi.mock("@/lib/images/presigned", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/images/presigned")>()),
  uploadChatImages: vi.fn(),
}));

vi.mock("@/lib/api/chat", () => ({
  removeChatRoomMember: vi.fn(),
  updateChatRoomTitle: vi.fn(),
  buildChatImageDownloadUrl: (roomId: string, messageId: number) =>
    `/api/chat/rooms/${roomId}/images/${messageId}/download`,
  getChatRoomImages: vi.fn(),
  createChatWsTicket: vi.fn(),
  getChatRoom: vi.fn(),
  getChatMessages: vi.fn(),
  getMyChatRooms: vi.fn(),
  sendChatMessage: vi.fn(),
  updateChatRead: vi.fn(),
  leaveChatRoom: vi.fn(),
}));

vi.mock("@/lib/api/users", () => ({ getMyProfile: vi.fn() }));

const mockedCreateChatWsTicket = vi.mocked(createChatWsTicket);
const mockedGetChatRoom = vi.mocked(getChatRoom);
const mockedRemoveChatRoomMember = vi.mocked(removeChatRoomMember);
const mockedUpdateChatRoomTitle = vi.mocked(updateChatRoomTitle);
const mockedGetChatMessages = vi.mocked(getChatMessages);
const mockedGetMyChatRooms = vi.mocked(getMyChatRooms);
const mockedSendChatMessage = vi.mocked(sendChatMessage);
const mockedUpdateChatRead = vi.mocked(updateChatRead);
const mockedLeaveChatRoom = vi.mocked(leaveChatRoom);
const mockedGetMyProfile = vi.mocked(getMyProfile);
const mockedUploadChatImages = vi.mocked(uploadChatImages);

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
    // 실시간 구독은 테스트 대상이 아니므로 티켓 발급을 실패시켜 폴링 경로만 확인한다
    mockedCreateChatWsTicket.mockResolvedValue({
      status: "unauthenticated",
    });
    mockedGetMyProfile.mockResolvedValue({
      status: "success",
      profile: { userId: 11, displayName: "Nelli" } as never,
    });
    mockedGetMyChatRooms.mockResolvedValue({
      status: "success",
      rooms: [
        {
          chatRoomId: 1,
          roomType: "DIRECT",
          title: "SeoulMate",
          imageUrl: "https://cdn/activities/hero.webp",
          activityScheduleId: null,
          lastMessage: null,
          unreadCount: 0,
        },
      ],
    });
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

  it("shows one timestamp per sender-minute group instead of per message", async () => {
    mockedGetChatMessages.mockResolvedValue({
      status: "success",
      messages: {
        messages: [
          { ...message(23, 11, "곧 도착해요"), createdAt: "2026-08-10T11:20:50+09:00" },
          { ...message(22, 11, "출발했어요"), createdAt: "2026-08-10T11:20:10+09:00" },
          { ...message(21, 6, "네 기다릴게요"), createdAt: "2026-08-10T11:20:30+09:00" },
        ],
        nextCursor: null,
        hasNext: false,
      },
    });

    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    expect(await screen.findByText("출발했어요")).toBeInTheDocument();
    // 내 메시지 2건과 상대 메시지 1건이 각각 하나의 시각만 갖는다 (11:20 두 번)
    expect(screen.getAllByText("11:20 AM")).toHaveLength(2);
  });

  it("counts how many people have not read my message yet", async () => {
    // 상대는 20번까지 읽었으므로 21번은 1명이 아직 안 읽은 상태다
    mockedGetChatMessages.mockResolvedValue({
      status: "success",
      messages: {
        messages: [message(21, 11, "읽었나요?"), message(20, 11, "안녕하세요")],
        nextCursor: null,
        hasNext: false,
      },
    });
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
            lastReadMessageId: 20,
            left: false,
          },
        ],
      },
    });

    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    expect(await screen.findByLabelText("1 person has not read this")).toHaveTextContent("1");
    // 상대가 읽은 메시지에는 숫자를 남기지 않는다
    expect(screen.queryByLabelText(/2 people/)).not.toBeInTheDocument();
  });

  it("does not send twice when Enter confirms a Korean composition", async () => {
    mockedSendChatMessage.mockResolvedValue({
      status: "success",
      message: message(22, 11, "안녕하세요"),
    });

    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    const input = await screen.findByLabelText("Message");
    fireEvent.change(input, { target: { value: "안녕하세요" } });
    // 조합 확정 Enter는 무시하고, 그다음 Enter만 전송한다
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(mockedSendChatMessage).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(mockedSendChatMessage).toHaveBeenCalledTimes(1));
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

  it("uploads picked photos and sends them as image messages", async () => {
    mockedUploadChatImages.mockResolvedValue([
      {
        uploadUrl: "https://s3/1",
        imageKey: "chats/a.webp",
        imageUrl: "https://s3/a.webp",
        expiresInSeconds: 300,
      },
      {
        uploadUrl: "https://s3/2",
        imageKey: "chats/b.webp",
        imageUrl: "https://s3/b.webp",
        expiresInSeconds: 300,
      },
    ]);
    mockedSendChatMessage.mockResolvedValue({
      status: "success",
      message: message(22, 11, "사진"),
    });

    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    const picker = await screen.findByLabelText("Attach photos");
    const input = picker.parentElement?.querySelector("input[type=file]") as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: [
          new File(["a"], "a.webp", { type: "image/webp" }),
          new File(["b"], "b.webp", { type: "image/webp" }),
        ],
      },
    });

    expect(await screen.findByRole("img", { name: "a.webp" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(mockedUploadChatImages).toHaveBeenCalledTimes(1));
    // 사진 장수만큼 메시지를 보낸다
    await waitFor(() => expect(mockedSendChatMessage).toHaveBeenCalledTimes(2));
    expect(mockedSendChatMessage).toHaveBeenNthCalledWith(
      1,
      "1",
      expect.objectContaining({ messageType: "IMAGE", imageKey: "chats/a.webp" }),
    );
  });

  it("lets a photo be removed before sending", async () => {
    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    const picker = await screen.findByLabelText("Attach photos");
    const input = picker.parentElement?.querySelector("input[type=file]") as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [new File(["a"], "a.webp", { type: "image/webp" })] },
    });

    expect(await screen.findByRole("img", { name: "a.webp" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));

    await waitFor(() =>
      expect(screen.queryByRole("img", { name: "a.webp" })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("explains the limit when more than five photos are picked", async () => {
    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    const picker = await screen.findByLabelText("Attach photos");
    const input = picker.parentElement?.querySelector("input[type=file]") as HTMLInputElement;
    fireEvent.change(input, {
      target: {
        files: Array.from(
          { length: 10 },
          (_, index) => new File(["x"], `photo-${index}.webp`, { type: "image/webp" }),
        ),
      },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You can send up to 9 photos at once.",
    );
    // 넘친 만큼은 버리고 5장만 담는다
    expect(screen.getAllByRole("button", { name: "Remove photo" })).toHaveLength(9);
  });

  it("asks whether to save one photo or the whole batch", async () => {
    const photos = [
      {
        ...message(30, 6, ""),
        messageType: "IMAGE" as const,
        content: null,
        imageUrl: "https://cdn/chats/30.webp",
      },
      {
        ...message(31, 6, ""),
        messageType: "IMAGE" as const,
        content: null,
        imageUrl: "https://cdn/chats/31.webp",
      },
    ];
    mockedGetChatMessages.mockResolvedValue({
      status: "success",
      messages: { messages: [photos[1], photos[0]], nextCursor: null, hasNext: false },
    });

    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Open photo 1 of 2" }));
    fireEvent.click(await screen.findByRole("button", { name: "Download" }));

    // 아이콘 하나로 열고, 그 안에서 범위를 고른다
    expect(await screen.findByRole("button", { name: "Save this photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save all" })).toBeInTheDocument();
  });

  it("leaves the conversation after confirmation", async () => {
    mockedLeaveChatRoom.mockResolvedValue({ status: "success", chat: null });

    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    // 나가기는 이제 헤더의 메뉴 안에 있다
    fireEvent.click(await screen.findByRole("button", { name: "Conversation menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Leave conversation" }));

    const confirmDialog = await screen.findByRole("dialog", { name: "Leave this conversation?" });
    fireEvent.click(within(confirmDialog).getByRole("button", { name: "Leave conversation" }));

    await waitFor(() => expect(mockedLeaveChatRoom).toHaveBeenCalledWith("1"));
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/en/chat"));
  });

  it("shows the room image from the conversation list in the header", async () => {
    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    // 방 상세 응답에는 대표 이미지가 없어 목록에서 가져온다
    const image = await screen.findByRole("img", { name: "SeoulMate" });
    expect(image).toHaveAttribute("src", expect.stringContaining("hero.webp"));
  });

  it("lists group members in the menu and opens a member profile", async () => {
    mockedGetChatRoom.mockResolvedValue({
      status: "success",
      room: {
        chatRoomId: 1,
        roomType: "GROUP",
        title: "Bukchon Hidden Gems",
        activityScheduleId: 101,
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
            lastReadMessageId: 21,
            left: false,
          },
          {
            userId: 9,
            userName: "Gone",
            profileImageUrl: null,
            lastReadMessageId: null,
            left: true,
          },
        ],
      },
    });

    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    // 참여자 수를 눌러도 같은 메뉴가 열린다
    fireEvent.click(await screen.findByRole("button", { name: "2 members" }));

    const menu = await screen.findByRole("dialog", { name: "Conversation menu" });
    // 나간 참여자는 목록에 남기지 않는다
    expect(within(menu).queryByText("Gone")).not.toBeInTheDocument();
    expect(within(menu).getByText("You")).toBeInTheDocument();

    fireEvent.click(within(menu).getByRole("button", { name: /SeoulMate/ }));

    const profile = await screen.findByRole("dialog", { name: "SeoulMate" });
    expect(
      within(profile).getByRole("button", { name: "Start a direct chat" }),
    ).toBeInTheDocument();
  });

  it("shows which schedule a group conversation belongs to", async () => {
    mockedGetChatRoom.mockResolvedValue({
      status: "success",
      room: {
        chatRoomId: 1,
        roomType: "GROUP",
        title: "Bukchon Hidden Gems",
        activityScheduleId: 101,
        activityStartAt: "2026-08-14T17:30:00+09:00",
        members: [
          {
            userId: 11,
            userName: "Nelli",
            profileImageUrl: null,
            lastReadMessageId: 21,
            left: false,
          },
        ],
      },
    });

    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    expect(await screen.findByText("Fri, Aug 14 5:30 PM")).toBeInTheDocument();
  });

  it("shows a member's nationality on their profile", async () => {
    mockedGetChatRoom.mockResolvedValue({
      status: "success",
      room: {
        chatRoomId: 1,
        roomType: "GROUP",
        title: "Bukchon Hidden Gems",
        activityScheduleId: 101,
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
            nationalityCode: "KR",
            lastReadMessageId: 21,
            left: false,
          },
        ],
      },
    });

    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    fireEvent.click(await screen.findByRole("button", { name: "2 members" }));
    const menu = await screen.findByRole("dialog", { name: "Conversation menu" });
    fireEvent.click(within(menu).getByRole("button", { name: /SeoulMate/ }));

    const profile = await screen.findByRole("dialog", { name: "SeoulMate" });
    expect(within(profile).getByText("South Korea")).toBeInTheDocument();
  });

  it("does not offer a direct chat with myself", async () => {
    mockedGetChatRoom.mockResolvedValue({
      status: "success",
      room: {
        chatRoomId: 1,
        roomType: "GROUP",
        title: "Bukchon Hidden Gems",
        activityScheduleId: 101,
        members: [
          {
            userId: 11,
            userName: "Nelli",
            profileImageUrl: null,
            lastReadMessageId: 21,
            left: false,
          },
        ],
      },
    });

    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Conversation menu" }));
    fireEvent.click(await screen.findByRole("button", { name: /Nelli/ }));

    const profile = await screen.findByRole("dialog", { name: "Nelli" });
    expect(
      within(profile).queryByRole("button", { name: "Start a direct chat" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the member list out of a one-to-one conversation", async () => {
    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Conversation menu" }));

    const menu = await screen.findByRole("dialog", { name: "Conversation menu" });
    expect(within(menu).getByRole("button", { name: "Photos" })).toBeInTheDocument();
    expect(within(menu).queryByText("You")).not.toBeInTheDocument();
  });

  it("lets the room owner rename the chat and remove a member", async () => {
    mockedGetChatRoom.mockResolvedValue({
      status: "success",
      room: {
        chatRoomId: 1,
        roomType: "GROUP",
        title: "Bukchon Hidden Gems",
        imageUrl: null,
        ownerId: 11,
        activityScheduleId: 101,
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
            lastReadMessageId: 21,
            left: false,
          },
        ],
      },
    });
    mockedUpdateChatRoomTitle.mockResolvedValue({ status: "success", room: {} as never });
    mockedRemoveChatRoomMember.mockResolvedValue({ status: "success", chat: null });

    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Conversation menu" }));
    fireEvent.click(await screen.findByRole("button", { name: "Rename chat" }));

    const renameDialog = await screen.findByRole("dialog", { name: "Rename chat" });
    fireEvent.change(within(renameDialog).getByLabelText("Chat name"), {
      target: { value: "Aug 14 walk" },
    });
    fireEvent.click(within(renameDialog).getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockedUpdateChatRoomTitle).toHaveBeenCalledWith("1", { title: "Aug 14 walk" }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Conversation menu" }));
    fireEvent.click(await screen.findByRole("button", { name: /SeoulMate/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Remove from chat" }));

    const confirm = await screen.findByRole("dialog", { name: "Remove SeoulMate?" });
    fireEvent.click(within(confirm).getByRole("button", { name: "Remove from chat" }));

    await waitFor(() => expect(mockedRemoveChatRoomMember).toHaveBeenCalledWith("1", 6));
  });

  it("hides room management from members who are not the owner", async () => {
    mockedGetChatRoom.mockResolvedValue({
      status: "success",
      room: {
        chatRoomId: 1,
        roomType: "GROUP",
        title: "Bukchon Hidden Gems",
        imageUrl: null,
        ownerId: 6,
        activityScheduleId: 101,
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
            lastReadMessageId: 21,
            left: false,
          },
        ],
      },
    });

    renderWithQueryClient(<ChatRoomView chatRoomId="1" />);

    fireEvent.click(await screen.findByRole("button", { name: "Conversation menu" }));

    const menu = await screen.findByRole("dialog", { name: "Conversation menu" });
    expect(within(menu).queryByRole("button", { name: "Rename chat" })).not.toBeInTheDocument();

    fireEvent.click(within(menu).getByRole("button", { name: /SeoulMate/ }));

    const profile = await screen.findByRole("dialog", { name: "SeoulMate" });
    expect(
      within(profile).queryByRole("button", { name: "Remove from chat" }),
    ).not.toBeInTheDocument();
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
