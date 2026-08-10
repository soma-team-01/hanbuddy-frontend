import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDirectChatRoom, createGroupChatRoom } from "@/lib/api/chat";
import { ApiClientError } from "@/lib/api/errors";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { StartChatButton } from "./StartChatButton";

const routerMock = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/chat", () => ({
  createDirectChatRoom: vi.fn(),
  createGroupChatRoom: vi.fn(),
  getMyChatRooms: vi.fn(),
}));

const mockedCreateDirect = vi.mocked(createDirectChatRoom);
const mockedCreateGroup = vi.mocked(createGroupChatRoom);

function room(chatRoomId: number) {
  return {
    status: "success" as const,
    room: {
      chatRoomId,
      roomType: "DIRECT" as const,
      title: "SeoulMate",
      activityScheduleId: null,
      members: [],
    },
  };
}

describe("StartChatButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens a one-to-one conversation and goes to it", async () => {
    mockedCreateDirect.mockResolvedValue(room(5));

    renderWithQueryClient(
      <StartChatButton target={{ kind: "direct", targetUserId: 6 }} label="Message SeoulMate" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Message SeoulMate" }));

    await waitFor(() => expect(mockedCreateDirect).toHaveBeenCalledWith({ targetUserId: 6 }));
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/en/chat/5"));
  });

  it("opens the group conversation for an activity schedule", async () => {
    mockedCreateGroup.mockResolvedValue(room(9));

    renderWithQueryClient(
      <StartChatButton
        target={{ kind: "group", activityScheduleId: 101 }}
        label="Group chat with guests"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Group chat with guests" }));

    await waitFor(() =>
      expect(mockedCreateGroup).toHaveBeenCalledWith({ activityScheduleId: 101 }),
    );
    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith("/en/chat/9"));
  });

  it("explains a rejected conversation instead of navigating", async () => {
    mockedCreateDirect.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "CHAT400_TARGET",
        status: 400,
        details: null,
        backendMessage: "대화 상대가 올바르지 않습니다.",
      }),
    });

    renderWithQueryClient(
      <StartChatButton target={{ kind: "direct", targetUserId: 6 }} label="Message SeoulMate" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Message SeoulMate" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You can't start a chat with this person.",
    );
    expect(routerMock.push).not.toHaveBeenCalled();
  });
});
