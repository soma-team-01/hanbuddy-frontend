import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/messages/en.json";
import ko from "@/messages/ko.json";
import ja from "@/messages/ja.json";
import zhHans from "@/messages/zh-Hans.json";
import zhHant from "@/messages/zh-Hant.json";
import { renderWithQueryClient as renderWithIntl } from "@/test/render-with-query-client";
import { getMyProfile } from "@/lib/api/users";
import type { MyProfile } from "@/types/user";
import { createQueryClient } from "@/lib/query/client";
import { userKeys } from "@/lib/query/users";
import { AlternativePaymentDialog } from "./AlternativePaymentDialog";

const analytics = vi.hoisted(() => ({ trackInquiry: vi.fn() }));
vi.mock("@/lib/api/users", () => ({ getMyProfile: vi.fn() }));
const booking = {
  activityTitle: "Actual activity",
  buddyName: "Actual buddy",
  startAt: "2026-12-31T16:30:00Z",
  participants: 3,
};
vi.mock("@/components/analytics/AnalyticsProvider", () => ({
  useMeasurementEvents: () => analytics,
}));

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open inquiry</button>
      {open && <AlternativePaymentDialog booking={booking} onClose={() => setOpen(false)} />}
    </>
  );
}

describe("AlternativePaymentDialog", () => {
  beforeEach(() => {
    vi.mocked(getMyProfile).mockImplementation(() => new Promise(() => {}));
  });
  afterEach(() => vi.unstubAllGlobals());
  it.each([undefined, "invalid-date"])(
    "uses selected labels when startAt is %s and keeps copy and WhatsApp aligned",
    async (startAt) => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { clipboard: { writeText } });
      renderWithIntl(
        <AlternativePaymentDialog
          booking={{ ...booking, startAt, dateLabel: "2027-01-02", timeLabel: "14:30" }}
          onClose={vi.fn()}
        />,
      );
      const message = screen.getByTestId("payment-inquiry-message").textContent;
      expect(message).toContain("2027-01-02 14:30 (KST)");
      expect(message).not.toContain(en.AlternativePayment.missingSchedule);
      fireEvent.click(screen.getByRole("button", { name: en.AlternativePayment.copy }));
      await waitFor(() => expect(writeText).toHaveBeenCalledWith(message));
      expect(
        new URL(
          screen.getByRole("link", { name: "WhatsApp" }).getAttribute("href")!,
        ).searchParams.get("text"),
      ).toBe(message);
    },
  );

  it("prefers the exact startAt converted to KST over fallback labels", () => {
    renderWithIntl(
      <AlternativePaymentDialog
        booking={{ ...booking, dateLabel: "Fallback date", timeLabel: "Fallback time" }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("payment-inquiry-message")).toHaveTextContent(
      "2027-01-01 01:30 (KST)",
    );
    expect(screen.getByTestId("payment-inquiry-message")).not.toHaveTextContent("Fallback");
  });

  it.each([
    { dateLabel: "2027-01-02", timeLabel: undefined },
    { dateLabel: undefined, timeLabel: "14:30" },
    { dateLabel: " ", timeLabel: " " },
  ])("keeps the missing-schedule prompt for incomplete labels: %j", (labels) => {
    renderWithIntl(
      <AlternativePaymentDialog
        booking={{ ...booking, startAt: undefined, ...labels }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("payment-inquiry-message")).toHaveTextContent(
      en.AlternativePayment.missingSchedule,
    );
  });
  it("keeps the cached email in copied and WhatsApp messages while refreshing the profile", async () => {
    const queryClient = createQueryClient();
    queryClient.setQueryData(userKeys.me(), { email: "cached@example.test" });
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    renderWithIntl(<AlternativePaymentDialog booking={booking} onClose={vi.fn()} />, {
      queryClient,
    });
    await waitFor(() => expect(getMyProfile).toHaveBeenCalled());
    expect(queryClient.isFetching({ queryKey: userKeys.me() })).toBe(1);
    const message = screen.getByTestId("payment-inquiry-message").textContent;
    expect(message).toContain("cached@example.test");
    fireEvent.click(screen.getByRole("button", { name: en.AlternativePayment.copy }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(message));
    expect(
      new URL(
        screen.getByRole("link", { name: "WhatsApp" }).getAttribute("href")!,
      ).searchParams.get("text"),
    ).toBe(message);
  });
  it("loads the account email and keeps copied text and WhatsApp in sync with current selections", async () => {
    vi.mocked(getMyProfile).mockResolvedValue({
      status: "success",
      profile: { email: "tourist@example.test" } as MyProfile,
    });
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const view = renderWithIntl(<AlternativePaymentDialog booking={booking} onClose={vi.fn()} />);
    await waitFor(() =>
      expect(screen.getByTestId("payment-inquiry-message")).toHaveTextContent(
        "tourist@example.test",
      ),
    );
    const message = screen.getByTestId("payment-inquiry-message").textContent;
    fireEvent.click(screen.getByRole("button", { name: en.AlternativePayment.copy }));
    await screen.findByRole("status");
    expect(writeText).toHaveBeenCalledWith(message);
    expect(
      new URL(
        screen.getByRole("link", { name: "WhatsApp" }).getAttribute("href")!,
      ).searchParams.get("text"),
    ).toBe(message);
    view.rerender(
      <AlternativePaymentDialog
        booking={{
          ...booking,
          activityTitle: "Changed activity",
          startAt: "2027-02-01T03:00:00Z",
          participants: 4,
        }}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByTestId("payment-inquiry-message")).toHaveTextContent("Changed activity");
    expect(screen.getByTestId("payment-inquiry-message")).toHaveTextContent(
      "2027-02-01 12:00 (KST)",
    );
    expect(screen.getByTestId("payment-inquiry-message")).toHaveTextContent(
      "Participants (including me): 4",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("uses an explicit placeholder on profile failure rather than inventing an email", async () => {
    vi.mocked(getMyProfile).mockRejectedValue(new Error("Unavailable"));
    renderWithIntl(<AlternativePaymentDialog booking={booking} onClose={vi.fn()} />);
    await waitFor(() => expect(getMyProfile).toHaveBeenCalled());
    expect(screen.getByTestId("payment-inquiry-message")).toHaveTextContent(
      "HanBuddy sign-up email: [Please fill in]",
    );
  });
  it("opens only on request, restores focus and scroll, and supports Escape", () => {
    renderWithIntl(<Harness />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    const opener = screen.getByRole("button", { name: "Open inquiry" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = screen.getByRole("dialog", { name: "Prefer another payment method?" });
    expect(dialog).toHaveClass("motion-dialog");
    expect(dialog.querySelector(".motion-dialog")).toBeNull();
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
    expect(message).toContain("Actual activity");
    expect(message).toContain("Buddy: Actual buddy");
    expect(message).toContain("HanBuddy sign-up email: [Please fill in]");
    expect(message).toContain("Preferred payment method: [Your preferred payment method]");
    expect(message).toContain("2027-01-01 01:30 (KST)");
    expect(message).toContain("Participants (including me): 3");
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
    expect(screen.getByText("Your inquiry")).toBeInTheDocument();
    expect(screen.getByText(en.AlternativePayment.exampleHint)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("HanBuddy sign-up email");
    expect(screen.getByRole("dialog")).not.toHaveTextContent("Korean bank account");
    analytics.trackInquiry.mockClear();
    fireEvent.click(screen.getByRole("link", { name: "WhatsApp" }));
    fireEvent.click(screen.getByRole("link", { name: "Email" }));
    expect(analytics.trackInquiry).toHaveBeenNthCalledWith(1, {
      channel: "whatsapp",
      placement: "payment_inquiry",
      locale: "en",
    });
    expect(analytics.trackInquiry).toHaveBeenNthCalledWith(2, {
      channel: "email",
      placement: "payment_inquiry",
      locale: "en",
    });
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
      expect(screen.getByTestId("payment-inquiry-message")).toHaveTextContent(
        messages.AlternativePayment.missingSchedule,
      );
      expect(screen.getByTestId("payment-inquiry-message")).toHaveTextContent(
        messages.AlternativePayment.missingValue,
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
