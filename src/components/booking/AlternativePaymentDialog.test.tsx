import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl } from "@/test/render-with-intl";
import { AlternativePaymentDialog } from "./AlternativePaymentDialog";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open inquiry</button>
      {open && (
        <AlternativePaymentDialog
          activityTitle="Market & music"
          scheduleLabel="September 20, 2026 · 18:00"
          guests={2}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

describe("AlternativePaymentDialog", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("opens only on request, restores focus and scroll, and supports Escape", () => {
    renderWithIntl(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const opener = screen.getByRole("button", { name: "Open inquiry" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Prefer another payment method?" });
    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();
    fireEvent(dialog, new Event("cancel", { bubbles: true, cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("copies exactly the visible inquiry and pre-fills only WhatsApp", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    renderWithIntl(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open inquiry" }));
    const message = screen.getByTestId("payment-inquiry-message").textContent;
    expect(message).toContain("Market & music");
    expect(message).toContain("September 20, 2026 · 18:00 (KST)");
    expect(message).toContain("Participants: 2");
    const whatsapp = new URL(screen.getByRole("link", { name: "WhatsApp" }).getAttribute("href")!);
    expect(whatsapp.origin + whatsapp.pathname).toBe("https://wa.me/821082970110");
    expect(whatsapp.searchParams.get("text")).toBe(message);
    expect(screen.getByRole("link", { name: "KakaoTalk" })).toHaveAttribute(
      "href",
      "https://pf.kakao.com/_qapJX/chat",
    );
    expect(screen.getByRole("link", { name: "Instagram" })).toHaveAttribute(
      "href",
      "https://www.instagram.com/hanbuddy_kr/",
    );
    fireEvent.click(screen.getByRole("button", { name: "Copy inquiry" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(message));
    expect(await screen.findByRole("status")).toHaveTextContent("Copied");
  });

  it.each([undefined, { writeText: vi.fn().mockRejectedValue(new Error("denied")) }])(
    "keeps selectable text when clipboard is unavailable or rejected",
    async (clipboard) => {
      vi.stubGlobal("navigator", { clipboard });
      renderWithIntl(
        <AlternativePaymentDialog
          activityTitle="Market"
          scheduleLabel={null}
          guests={1}
          onClose={vi.fn()}
        />,
      );
      expect(screen.getByTestId("payment-inquiry-message")).toHaveTextContent("Not selected yet");
      fireEvent.click(screen.getByRole("button", { name: "Copy inquiry" }));
      expect(await screen.findByRole("status")).toHaveTextContent(
        "Please select and copy the message above.",
      );
    },
  );

  it("closes through the backdrop and visible close button", () => {
    renderWithIntl(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open inquiry" }));
    fireEvent.click(screen.getByTestId("payment-inquiry-backdrop"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open inquiry" }));
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
