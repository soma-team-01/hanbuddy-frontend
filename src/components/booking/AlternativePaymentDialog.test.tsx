import { fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";
import { renderWithIntl } from "@/test/render-with-intl";
import { AlternativePaymentDialog } from "./AlternativePaymentDialog";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open inquiry</button>
      {open && <AlternativePaymentDialog onClose={() => setOpen(false)} />}
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

  it("offers four official channels and a clearly labelled editable example", () => {
    renderWithIntl(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open inquiry" }));
    const message = screen.getByTestId("payment-inquiry-message").textContent;
    expect(message).toContain("Seoul Forest Walk & Seongsu Cafe Tour");
    expect(message).toContain("Buddy: [buddy name]");
    expect(message).toContain("HanBuddy sign-up email: [your email]");
    expect(message).toContain("Preferred payment method: Transfer to a Korean bank account");
    expect(message).toContain("YYYY-MM-DD 14:00 (KST)");
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
    expect(screen.getByRole("link", { name: "Email" })).toHaveAttribute(
      "href",
      "mailto:contact@hanbuddy.kr",
    );
    expect(screen.getAllByRole("link")).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Copy template" })).toBeInTheDocument();
    expect(screen.getByText("Example inquiry")).toBeInTheDocument();
    expect(screen.getByText(en.AlternativePayment.exampleHint)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("HanBuddy sign-up email");
    expect(screen.getByRole("dialog")).toHaveTextContent("Korean bank account");
  });

  it.each([
    ["en", en],
    ["ko", ko],
    ["ja", ja],
    ["zh-Hans", zhHans],
    ["zh-Hant", zhHant],
  ] as const)(
    "renders the updated inquiry guidance and email channel in %s",
    (locale, messages) => {
      renderWithIntl(<AlternativePaymentDialog onClose={vi.fn()} />, { locale, messages });
      expect(screen.getByRole("dialog")).toHaveTextContent(messages.AlternativePayment.description);
      expect(screen.getByTestId("payment-inquiry-message").textContent).toBe(
        messages.AlternativePayment.message,
      );
      expect(
        screen.getByRole("button", { name: messages.AlternativePayment.copy }),
      ).toBeInTheDocument();
      expect(screen.getByRole("link", { name: messages.AlternativePayment.email })).toHaveAttribute(
        "href",
        "mailto:contact@hanbuddy.kr",
      );
    },
  );

  it("copies the displayed example exactly", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    renderWithIntl(<AlternativePaymentDialog onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Copy template" }));
    expect(await screen.findByRole("status")).toHaveTextContent(en.AlternativePayment.copied);
    expect(writeText).toHaveBeenCalledWith(
      screen.getByTestId("payment-inquiry-message").textContent,
    );
  });

  it.each([undefined, { writeText: vi.fn().mockRejectedValue(new Error("denied")) }])(
    "keeps the example selectable if copying is unavailable or rejected",
    async (clipboard) => {
      vi.stubGlobal("navigator", { clipboard });
      renderWithIntl(<AlternativePaymentDialog onClose={vi.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: "Copy template" }));
      expect(await screen.findByRole("status")).toHaveTextContent(en.AlternativePayment.copyFailed);
      expect(screen.getByTestId("payment-inquiry-message")).toHaveClass("select-text");
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
