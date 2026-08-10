import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import type { ChatMessageResponse } from "@/types/chat";
import { ChatImageGrid } from "./ChatImageGrid";

function photo(messageId: number): ChatMessageResponse {
  return {
    messageId,
    senderId: 6,
    senderName: "SeoulMate",
    senderProfileImageUrl: null,
    messageType: "IMAGE",
    content: null,
    imageUrl: `https://cdn/chats/${messageId}.webp`,
    imageWidth: 1600,
    imageHeight: 1200,
    createdAt: "2026-08-10T13:00:00+09:00",
  };
}

function gridOf(count: number) {
  const { container } = renderWithIntl(
    <ChatImageGrid
      images={Array.from({ length: count }, (_, index) => photo(index + 1))}
      mine
      onOpen={vi.fn()}
    />,
  );

  return container.querySelector("div.grid");
}

describe("ChatImageGrid", () => {
  it("lays a single photo out on its own", () => {
    renderWithIntl(<ChatImageGrid images={[photo(1)]} mine onOpen={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Open photo" })).toBeInTheDocument();
  });

  it("fills the bubble width so the grid does not collapse", () => {
    // items-end 정렬 아래에서는 폭을 지정하지 않으면 격자가 0으로 줄어든다
    expect(gridOf(3)).toHaveClass("w-full");
    for (const cell of screen.getAllByRole("button")) {
      expect(cell).toHaveClass("w-full");
    }
  });

  it.each([
    [2, "grid-cols-2"],
    [3, "grid-cols-3"],
    [4, "grid-cols-2"],
    [6, "grid-cols-3"],
    [9, "grid-cols-3"],
  ])("arranges %i photos with %s", (count, expected) => {
    expect(gridOf(count)).toHaveClass(expected);
  });

  it("shows the caption once for the whole batch", () => {
    renderWithIntl(
      <ChatImageGrid
        images={[{ ...photo(1), content: "한강에서" }, photo(2)]}
        mine
        onOpen={vi.fn()}
      />,
    );

    expect(screen.getAllByText("한강에서")).toHaveLength(1);
  });
});
