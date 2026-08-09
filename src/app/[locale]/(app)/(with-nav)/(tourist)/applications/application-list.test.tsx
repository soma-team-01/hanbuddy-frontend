import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { getTouristActivities } from "@/lib/api/activities";
import { ApiClientError } from "@/lib/api/errors";
import { IntlTestProvider, renderWithIntl } from "@/test/render-with-intl";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { Locale } from "@/i18n/routing";
import type { Application } from "@/types/application";
import { ApplicationList } from "./application-list";

vi.mock("@/lib/api/activities", () => ({
  getTouristActivities: vi.fn(),
}));

const mockedGetTouristActivities = vi.mocked(getTouristActivities);

const applications: Application[] = [
  {
    id: "1",
    activityId: 42,
    status: "pending_payment",
    startAt: "2099-07-20T10:00:00+09:00",
    dateLabel: "Jul 20, 2026",
    hostName: "Jihoon Kim",
    hostAvatarUrl: null,
    activityTitle: "Bukchon Hidden Gems",
    thumbnailUrl: "https://static.hanbuddy.com/activities/bukchon.webp",
    breakdown: {
      unitPrice: 45000,
      guests: 2,
      serviceFee: 0,
    },
    paymentAmount: null,
    paymentCurrency: null,
  },
  {
    id: "2",
    activityId: 43,
    status: "completed",
    startAt: "2026-07-10T10:00:00+09:00",
    dateLabel: "Jul 10, 2026",
    hostName: "Minji Lee",
    hostAvatarUrl: null,
    activityTitle: "Traditional Tea Tasting",
    thumbnailUrl: null,
  },
];

const paidApplication: Application = {
  ...applications[0],
  id: "3",
  status: "confirmed",
  paymentAmount: 90000,
  paymentCurrency: "KRW",
};

function renderList(
  overrides: Partial<React.ComponentProps<typeof ApplicationList>> = {},
  locale: Locale = "en",
) {
  return renderWithIntl(
    <ApplicationList
      applications={applications}
      onCancelApplication={vi.fn()}
      onContinuePayment={vi.fn().mockResolvedValue(undefined)}
      isPaymentPending={false}
      {...overrides}
    />,
    { locale },
  );
}

describe("ApplicationList", () => {
  it("shows a continue-payment action for pending applications", () => {
    const onContinuePayment = vi.fn().mockResolvedValue(undefined);

    renderList({ onContinuePayment });

    expect(screen.getByTestId("application-list")).toHaveClass("grid", "lg:grid-cols-2");
    expect(screen.getByText("₩90,000")).toBeInTheDocument();
    // 카드에 활동 사진·제목·호스트가 보이고 카드가 상세로 연결된다
    expect(screen.getByRole("link", { name: "Bukchon Hidden Gems" })).toHaveAttribute(
      "href",
      "/en/activities/42",
    );
    expect(screen.getByText("Jihoon Kim")).toBeInTheDocument();
    // 미래 일정에는 디데이 배지가 붙는다
    expect(screen.getByText(/^D-\d+$/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue Payment" })).toBeEnabled();
    expect(onContinuePayment).not.toHaveBeenCalled();
  });

  it("opens the Toss payment window when continuing a pending payment", async () => {
    const onContinuePayment = vi.fn().mockResolvedValue(undefined);
    renderList({ onContinuePayment });

    fireEvent.click(screen.getByRole("button", { name: "Continue Payment" }));

    await waitFor(() => expect(onContinuePayment).toHaveBeenCalledWith("1"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the paid amount instead of a service fee after payment", () => {
    renderList({ applications: [paidApplication] });

    expect(screen.getByText("Paid: ₩90,000")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Price Breakdown" }));

    expect(screen.getAllByText("Paid: ₩90,000")).toHaveLength(2);
    expect(screen.queryByText("Service fee")).not.toBeInTheDocument();
  });

  it("shows a localized error when opening the payment fails", async () => {
    const onContinuePayment = vi.fn().mockRejectedValue(
      new ApiClientError({
        code: "PAYMENT502_TOSS_CONFIRM",
        status: 502,
        details: null,
        backendMessage: "토스 결제 요청에 실패했습니다.",
        fallbackMessage: "결제를 이어가지 못했습니다.",
      }),
    );
    renderList({ onContinuePayment });

    fireEvent.click(screen.getByRole("button", { name: "Continue Payment" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The payment service is temporarily unavailable. Please try again shortly.",
    );
    expect(screen.queryByText("토스 결제 요청에 실패했습니다.")).not.toBeInTheDocument();
  });

  it("stays silent when the buyer closes the Toss window", async () => {
    const onContinuePayment = vi
      .fn()
      .mockRejectedValue({ code: "PAY_PROCESS_CANCELED", message: "결제가 취소되었습니다." });
    renderList({ onContinuePayment });

    fireEvent.click(screen.getByRole("button", { name: "Continue Payment" }));

    await waitFor(() => expect(onContinuePayment).toHaveBeenCalledWith("1"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("relocalizes a stored payment error when the locale changes", async () => {
    const onContinuePayment = vi.fn().mockRejectedValue(new Error("raw payment failure"));
    const applicationList = (
      <ApplicationList
        applications={applications}
        onCancelApplication={vi.fn()}
        onContinuePayment={onContinuePayment}
        isPaymentPending={false}
      />
    );
    const { rerender } = render(<IntlTestProvider locale="en">{applicationList}</IntlTestProvider>);

    fireEvent.click(screen.getByRole("button", { name: "Continue Payment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Could not complete the payment.");

    rerender(<IntlTestProvider locale="ko">{applicationList}</IntlTestProvider>);

    expect(screen.getByRole("alert")).toHaveTextContent("결제를 완료하지 못했습니다.");
    expect(screen.queryByText("raw payment failure")).not.toBeInTheDocument();
  });

  it("disables the payment action while a payment request is pending", () => {
    renderList({ isPaymentPending: true });

    expect(screen.getByRole("button", { name: "Opening payment..." })).toBeDisabled();
  });

  it("opens the host profile popup from the application card", async () => {
    mockedGetTouristActivities.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 77,
          title: "Seoul Night Market Walk",
          description: "Another experience by the same buddy.",
          thumbnailImageUrl: "/images/activities/market.jpg",
          buddyName: "Jihoon Kim",
          buddyProfileImageUrl: null,
          meetingPointName: "Gwangjang Market",
          meetingPlaceId: "ChIJ-gwangjang",
          price: 30000,
          currency: "KRW",
        },
      ],
    });

    renderWithQueryClient(
      <ApplicationList
        applications={applications}
        onCancelApplication={vi.fn()}
        onContinuePayment={vi.fn().mockResolvedValue(undefined)}
        isPaymentPending={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "View Jihoon Kim's profile" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "Jihoon Kim" })).toBeInTheDocument();
    expect(
      await within(dialog).findByRole("link", { name: /Seoul Night Market Walk/ }),
    ).toHaveAttribute("href", "/en/activities/77");
  });

  it("keeps the review action disabled until its flow is available", () => {
    renderList();

    fireEvent.click(screen.getByRole("tab", { name: "Past" }));

    expect(screen.getByRole("button", { name: "Leave Review · Coming soon" })).toBeDisabled();
  });

  it("localizes Korean tabs, actions, payment labels, totals, and empty state", () => {
    renderList({ applications: [paidApplication] }, "ko");

    expect(screen.getByRole("tab", { name: "예정" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "지난 내역" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByText("Bukchon Hidden Gems")).toBeInTheDocument();
    expect(screen.getByText("Jihoon Kim")).toBeInTheDocument();
    expect(screen.getByText("₩90,000 결제 완료")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "가격 상세" }));

    expect(screen.getByText("₩45,000 × 2명")).toBeInTheDocument();
    expect(screen.getAllByText("₩90,000 결제 완료")).toHaveLength(2);
    expect(screen.getByText("총액: ₩90,000")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "지난 내역" }));
    expect(screen.getByText("아직 신청 내역이 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "액티비티 둘러보기" })).toHaveAttribute(
      "href",
      "/ko/explore",
    );
  });

  it("localizes the continue-payment action in Korean", () => {
    renderList({}, "ko");

    expect(screen.getByRole("button", { name: "결제 이어서 하기" })).toBeInTheDocument();
    expect(screen.getByText("Bukchon Hidden Gems")).toBeInTheDocument();
  });
});
