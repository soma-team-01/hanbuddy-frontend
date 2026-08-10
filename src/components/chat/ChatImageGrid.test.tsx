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

function rowSizesOf(count: number) {
  renderWithIntl(
    <ChatImageGrid
      images={Array.from({ length: count }, (_, index) => photo(index + 1))}
      mine
      onOpen={vi.fn()}
    />,
  );

  return screen
    .getAllByTestId("chat-photo-row")
    .map((row) => row.querySelectorAll("button").length);
}

describe("ChatImageGrid", () => {
  it("lays a single photo out on its own", () => {
    renderWithIntl(<ChatImageGrid images={[photo(1)]} mine onOpen={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Open photo" })).toBeInTheDocument();
  });

  it("fills the bubble width so the layout does not collapse", () => {
    // items-end 정렬 아래에서는 폭을 지정하지 않으면 사진이 0으로 줄어든다
    rowSizesOf(3);
    expect(screen.getByTestId("chat-photo-grid")).toHaveClass("w-full");
    for (const cell of screen.getAllByRole("button")) {
      expect(cell).toHaveClass("flex-1");
    }
  });

  it.each([
    [2, [2]],
    [3, [3]],
    [4, [2, 2]],
    [5, [3, 2]],
    [6, [3, 3]],
    [7, [3, 2, 2]],
    [8, [3, 3, 2]],
    [9, [3, 3, 3]],
  ])("splits %i photos into rows with no empty cell", (count, expected) => {
    expect(rowSizesOf(count)).toEqual(expected);
  });

  it("gives every row the same height as the first", () => {
    rowSizesOf(5);
    const rows = screen.getAllByTestId("chat-photo-row");

    // 첫 줄이 3칸이면 모든 줄이 가로:세로 3:1 — 아래 줄 칸이 더 넓어질 뿐 높이는 같다
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row).toHaveStyle({ aspectRatio: "3" });
    }
  });

  it("keeps rows square when the first row holds two photos", () => {
    rowSizesOf(4);

    for (const row of screen.getAllByTestId("chat-photo-row")) {
      expect(row).toHaveStyle({ aspectRatio: "2" });
    }
  });

  it("numbers photos across rows so the viewer opens the right one", () => {
    renderWithIntl(
      <ChatImageGrid
        images={Array.from({ length: 5 }, (_, index) => photo(index + 1))}
        mine
        onOpen={vi.fn()}
      />,
    );

    // 둘째 줄 첫 사진은 네 번째다
    expect(screen.getByRole("button", { name: "Open photo 4 of 5" })).toBeInTheDocument();
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
