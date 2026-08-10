import { QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createQueryClient } from "@/lib/query/client";
import { getChatMessages } from "@/lib/api/chat";
import type { ChatMessagePageResponse, ChatMessageResponse } from "@/types/chat";
import { useChatMessages } from "./use-chat-messages";

vi.mock("@/lib/api/chat", () => ({ getChatMessages: vi.fn() }));

const mockedGetChatMessages = vi.mocked(getChatMessages);

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

/** 최신순으로 내려오는 백엔드 응답을 흉내 낸다 */
function page(newestId: number, count: number, hasNext = true): ChatMessagePageResponse {
  const messages = Array.from({ length: count }, (_, index) => message(newestId - index));
  return { messages, nextCursor: messages.at(-1)?.messageId ?? null, hasNext };
}

function Probe({ chatRoomId = "1" }: Readonly<{ chatRoomId?: string }>) {
  const { messages, hasOlder, loadOlder } = useChatMessages(chatRoomId, false);

  return (
    <div>
      <span data-testid="ids">{messages.map((item) => item.messageId).join(",")}</span>
      <button type="button" disabled={!hasOlder} onClick={loadOlder}>
        older
      </button>
    </div>
  );
}

function renderProbe() {
  const queryClient = createQueryClient();
  function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { queryClient, ...render(<Probe />, { wrapper: Wrapper }) };
}

function ids() {
  return screen.getByTestId("ids").textContent;
}

describe("useChatMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps loaded history when a new message shifts the latest window", async () => {
    // 최신 창 100..96, 그 아래로 95..91이 한 페이지
    mockedGetChatMessages.mockImplementation(async (_roomId, beforeMessageId) => ({
      status: "success",
      messages:
        beforeMessageId == null ? page(100, 5) : { ...page(95, 5), hasNext: false, nextCursor: 91 },
    }));

    const { queryClient } = renderProbe();

    await waitFor(() => expect(ids()).toBe("96,97,98,99,100"));

    act(() => screen.getByRole("button", { name: "older" }).click());
    await waitFor(() => expect(ids()).toBe("91,92,93,94,95,96,97,98,99,100"));

    const callsBefore = mockedGetChatMessages.mock.calls.length;

    // 메시지가 하나 도착해 최신 창이 101..97로 밀린다
    mockedGetChatMessages.mockImplementation(async (_roomId, beforeMessageId) => ({
      status: "success",
      messages:
        beforeMessageId == null ? page(101, 5) : { ...page(95, 5), hasNext: false, nextCursor: 91 },
    }));
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ["chat", "messages", "1", "latest"] });
    });

    // 창에서 밀려난 96도 남고, 쌓아 둔 과거도 그대로다
    await waitFor(() => expect(ids()).toBe("91,92,93,94,95,96,97,98,99,100,101"));
    // 과거를 다시 받지 않았다 — 늘어난 호출은 최신 창 재조회 한 번뿐이다
    expect(mockedGetChatMessages.mock.calls.length).toBe(callsBefore + 1);
  });

  it("starts over when the latest window no longer overlaps what we have", async () => {
    mockedGetChatMessages.mockImplementation(async (_roomId, beforeMessageId) => ({
      status: "success",
      messages:
        beforeMessageId == null ? page(100, 5) : { ...page(95, 5), hasNext: false, nextCursor: 91 },
    }));

    const { queryClient } = renderProbe();
    await waitFor(() => expect(ids()).toBe("96,97,98,99,100"));

    act(() => screen.getByRole("button", { name: "older" }).click());
    await waitFor(() => expect(ids()).toBe("91,92,93,94,95,96,97,98,99,100"));

    // 폴링 사이에 한 페이지를 넘게 도착해 새 창이 알던 것과 하나도 겹치지 않는다
    mockedGetChatMessages.mockImplementation(async (_roomId, beforeMessageId) => ({
      status: "success",
      messages:
        beforeMessageId == null
          ? page(200, 5)
          : { ...page(195, 5), hasNext: false, nextCursor: 191 },
    }));
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: ["chat", "messages", "1", "latest"] });
    });

    // 이어 붙일 수 없으므로 옛 누적분을 버린다 — 91~100이 새 창 아래 붙어 구멍을 감추지 않는다
    await waitFor(() => expect(ids()).toBe("196,197,198,199,200"));
    expect(ids()).not.toContain("100");
  });

  it("shows a message straddling both windows only once", async () => {
    // 최신 창의 가장 오래된 96이 과거 페이지에도 들어 있다
    mockedGetChatMessages.mockImplementation(async (_roomId, beforeMessageId) => ({
      status: "success",
      messages:
        beforeMessageId == null
          ? page(100, 5)
          : { messages: [message(96), message(95)], nextCursor: 95, hasNext: false },
    }));

    renderProbe();
    await waitFor(() => expect(ids()).toBe("96,97,98,99,100"));

    act(() => screen.getByRole("button", { name: "older" }).click());

    await waitFor(() => expect(ids()).toBe("95,96,97,98,99,100"));
  });
});
