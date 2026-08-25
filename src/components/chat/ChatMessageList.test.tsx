import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import type { ChatMessageResponse } from "@/types/chat";
import { ChatMessageList } from "./ChatMessageList";

function message(overrides: Partial<ChatMessageResponse> = {}): ChatMessageResponse {
  return {
    messageId: 21,
    senderId: 6,
    senderName: "SeoulMate",
    senderProfileImageUrl: null,
    content: "See you tomorrow",
    sourceLanguage: "KO",
    contentLanguage: "EN",
    originalContent: "내일 만나요",
    createdAt: "2026-08-10T13:00:00+09:00",
    ...overrides,
  };
}

function renderList(messages: ChatMessageResponse[]) {
  renderWithIntl(
    <ChatMessageList
      messages={messages}
      members={[]}
      myUserId={11}
      locale="en"
      language="EN"
      isPending={false}
      isError={false}
      hasOlder={false}
      isLoadingOlder={false}
      onLoadOlder={vi.fn()}
      onOpenImage={vi.fn()}
    />,
  );
}

describe("ChatMessageList translation", () => {
  it("keeps the latest message above the floating translation guide", () => {
    renderList([message()]);

    expect(screen.getByTestId("chat-message-list")).toHaveClass("pb-20");
  });

  it("shows the requested translation first and lets the reader switch to the original", () => {
    renderList([message()]);

    expect(screen.getByText("See you tomorrow")).toBeInTheDocument();
    const originalButton = screen.getByRole("button", { name: "Show original" });
    expect(originalButton).toHaveClass("text-muted/55");
    expect(originalButton.parentElement).toHaveTextContent(/1:00 PM.*Show original/);
    fireEvent.click(originalButton);

    expect(screen.getByText("내일 만나요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show translation" })).toBeInTheDocument();
  });

  it("does not show a switch when the message is already in the site language", () => {
    renderList([
      message({
        content: "See you tomorrow",
        sourceLanguage: "EN",
        contentLanguage: "EN",
        originalContent: "See you tomorrow",
      }),
    ]);

    expect(screen.queryByRole("button", { name: /Show (original|translation)/ })).toBeNull();
  });

  it("keeps an unknown-language legacy message as original-only", () => {
    renderList([
      message({
        content: "언제 만날까요?",
        sourceLanguage: "UNKNOWN",
        contentLanguage: "UNKNOWN",
        originalContent: "언제 만날까요?",
      }),
    ]);

    expect(screen.getByText("언제 만날까요?")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Show (original|translation)/ })).toBeNull();
  });

  it("applies the same original switch to an image caption", () => {
    renderList([
      message({
        messageType: "IMAGE",
        imageUrl: "https://cdn/chats/21.webp",
        imageWidth: 1200,
        imageHeight: 800,
      }),
    ]);

    expect(screen.getByText("See you tomorrow")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show original" }));
    expect(screen.getByText("내일 만나요")).toBeInTheDocument();
  });
});
