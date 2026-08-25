import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePathname } from "next/navigation";
import { getMyChatRooms } from "@/lib/api/chat";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { ChatRoomSummaryResponse } from "@/types/chat";
import { ChatRoomList } from "./ChatRoomList";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: vi.fn(),
}));

vi.mock("@/lib/api/chat", () => ({ getMyChatRooms: vi.fn(), updateChatRead: vi.fn() }));

const mockedGetMyChatRooms = vi.mocked(getMyChatRooms);
const mockedUsePathname = vi.mocked(usePathname);

const directRoom: ChatRoomSummaryResponse = {
  chatRoomId: 1,
  roomType: "DIRECT",
  title: "SeoulMate",
  imageUrl: null,
  activityScheduleId: null,
  lastMessage: {
    messageId: 21,
    senderId: 6,
    senderName: "SeoulMate",
    senderProfileImageUrl: null,
    content: "내일 뵐게요!",
    sourceLanguage: "KO",
    contentLanguage: "KO",
    originalContent: "내일 뵐게요!",
    createdAt: "2026-08-09T13:00:00+09:00",
  },
  unreadCount: 3,
};

const groupRoom: ChatRoomSummaryResponse = {
  chatRoomId: 2,
  roomType: "GROUP",
  title: "Bukchon Hidden Gems",
  imageUrl: null,
  activityScheduleId: 101,
  activityStartAt: "2026-08-14T17:30:00+09:00",
  lastMessage: null,
  unreadCount: 0,
};

describe("ChatRoomList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUsePathname.mockReturnValue("/en/chat");
  });

  it("links each conversation and shows its last message", async () => {
    mockedGetMyChatRooms.mockResolvedValue({ status: "success", rooms: [directRoom, groupRoom] });

    renderWithQueryClient(<ChatRoomList />);

    const link = await screen.findByRole("link", { name: /SeoulMate/ });
    expect(link).toHaveAttribute("href", "/en/chat/1");
    expect(screen.getByText("내일 뵐게요!")).toBeInTheDocument();
  });

  it("counts unread messages and leaves read conversations unmarked", async () => {
    mockedGetMyChatRooms.mockResolvedValue({ status: "success", rooms: [directRoom, groupRoom] });

    renderWithQueryClient(<ChatRoomList />);

    expect(await screen.findByLabelText("3 unread messages")).toHaveTextContent("3");
    expect(screen.queryByLabelText(/0 unread/)).not.toBeInTheDocument();
  });

  it("invites the reader to start a conversation when there is none", async () => {
    mockedGetMyChatRooms.mockResolvedValue({ status: "success", rooms: [] });

    renderWithQueryClient(<ChatRoomList />);

    expect(await screen.findByText("No conversations yet")).toBeInTheDocument();
  });

  it("tells apart group rooms of the same activity by their schedule time", async () => {
    mockedGetMyChatRooms.mockResolvedValue({ status: "success", rooms: [directRoom, groupRoom] });

    renderWithQueryClient(<ChatRoomList />);

    expect(await screen.findByText("Fri, Aug 14 5:30 PM")).toBeInTheDocument();
    // 1:1 방에는 회차가 없어 표기도 붙지 않는다
    expect(screen.getAllByText(/5:30 PM/)).toHaveLength(1);
  });

  it("says a group conversation has no messages yet", async () => {
    mockedGetMyChatRooms.mockResolvedValue({ status: "success", rooms: [groupRoom] });

    renderWithQueryClient(<ChatRoomList />);

    expect(await screen.findByText("No messages yet")).toBeInTheDocument();
  });
});
