import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTouristActivities } from "@/lib/api/activities";
import { createReview, deleteReview, updateReview } from "@/lib/api/reviews";
import { ApiClientError } from "@/lib/api/errors";
import { IntlTestProvider } from "@/test/render-with-intl";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { Locale } from "@/i18n/routing";
import type { Application } from "@/types/application";
import { ApplicationList } from "./application-list";

const routerMock = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }));

// 호스트 프로필의 "메시지 보내기"가 라우터를 쓰므로 앱 라우터를 대신 세워준다
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/activities", () => ({
  getTouristActivities: vi.fn(),
}));

vi.mock("@/lib/api/reviews", () => ({
  getBuddyProfile: vi.fn(),
  getBuddyReviews: vi.fn(),
  createReview: vi.fn(),
  updateReview: vi.fn(),
  deleteReview: vi.fn(),
}));

const mockedGetTouristActivities = vi.mocked(getTouristActivities);
const mockedCreateReview = vi.mocked(createReview);
const mockedUpdateReview = vi.mocked(updateReview);
const mockedDeleteReview = vi.mocked(deleteReview);

const applications: Application[] = [
  {
    id: "1",
    activityId: 42,
    status: "pending_payment",
    startAt: "2099-07-20T10:00:00+09:00",
    endAt: "2099-07-20T12:00:00+09:00",
    dateLabel: "Jul 20, 2026",
    hostName: "Jihoon Kim",
    hostAvatarUrl: null,
    activityTitle: "Bukchon Hidden Gems",
    thumbnailUrl: "https://static.hanbuddy.com/activities/bukchon.webp",
    cancellationReason: null,
    holdExpiresAt: null,
    myReview: null,
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
    endAt: "2026-07-10T12:00:00+09:00",
    dateLabel: "Jul 10, 2026",
    hostName: "Minji Lee",
    hostAvatarUrl: null,
    activityTitle: "Traditional Tea Tasting",
    thumbnailUrl: null,
    cancellationReason: null,
    holdExpiresAt: null,
    myReview: null,
  },
];

/** 백엔드가 myReview를 함께 내려준 완료 신청 */
const reviewedApplication: Application = {
  ...applications[1],
  myReview: {
    reviewId: 9,
    rating: 5,
    content: "The tea master was wonderful.",
    createdAt: "2026-07-11T13:00:00+09:00",
  },
};

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
  return renderWithQueryClient(
    <ApplicationList
      applications={applications}
      onCancelApplication={vi.fn()}
      onCancelPendingPayment={vi.fn().mockResolvedValue({ ok: true })}
      onContinuePayment={vi.fn().mockResolvedValue(undefined)}
      isPaymentPending={false}
      {...overrides}
    />,
    { locale },
  );
}

describe("ApplicationList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

    // 총액은 접힌 상태에서도 보이고, 카드에서 따로 반복하지 않는다
    expect(screen.getByText("₩90,000")).toBeInTheDocument();
    expect(screen.queryByText("Paid")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Price Breakdown/ }));

    expect(screen.getByText("Total").parentElement).toHaveTextContent("₩90,000");
    expect(screen.getByText("Paid").parentElement).toHaveTextContent("₩90,000");
    expect(screen.queryByText("Service fee")).not.toBeInTheDocument();
  });

  it("shows the stored discount snapshot in the price breakdown", () => {
    const discountedApplication: Application = {
      ...paidApplication,
      paymentAmount: 80000,
      breakdown: {
        unitPrice: 40000,
        guests: 2,
        serviceFee: 0,
        originalUnitPrice: 50000,
        discountedUnitPrice: 40000,
        originalTotalPrice: 100000,
        discountPercent: 20,
        discountAmount: 20000,
        finalTotalPrice: 80000,
      },
    };

    renderList({ applications: [discountedApplication] });
    fireEvent.click(screen.getByRole("button", { name: /Price Breakdown/ }));

    expect(screen.getByText("Discount (20%)").parentElement).toHaveTextContent("-₩20,000");
    expect(screen.getByText("Total").parentElement).toHaveTextContent("₩80,000");
    expect(screen.getByText("Paid").parentElement).toHaveTextContent("₩80,000");
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

  it("keeps the payment action locked while the Toss window is open", async () => {
    let resolvePayment!: () => void;
    const onContinuePayment = vi.fn().mockReturnValue(
      new Promise<void>((resolve) => {
        resolvePayment = resolve;
      }),
    );
    renderList({ onContinuePayment });

    fireEvent.click(screen.getByRole("button", { name: "Continue Payment" }));

    // 결제 재개 API가 끝나고 결제창이 열려 있는 동안에도 다시 누를 수 없어야 한다
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Opening payment..." })).toBeDisabled(),
    );

    await act(async () => {
      resolvePayment();
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Continue Payment" })).toBeEnabled(),
    );
    expect(onContinuePayment).toHaveBeenCalledTimes(1);
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
        onCancelPendingPayment={vi.fn().mockResolvedValue({ ok: true })}
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
          activityId: 42,
          buddyId: 7,
          title: "Bukchon Hidden Gems",
          description: "The activity this application is for.",
          thumbnailImageUrl: "/images/activities/bukchon.jpg",
          buddyName: "Jihoon Kim",
          buddyProfileImageUrl: null,
          meetingPointName: "Anguk Station Exit 2",
          meetingPlaceId: "ChIJ-bukchon",
          price: 45000,
          currency: "KRW",
        },
        {
          activityId: 77,
          buddyId: 7,
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
        onCancelPendingPayment={vi.fn().mockResolvedValue({ ok: true })}
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

  it("shows no hosted activities when the buddy cannot be identified", async () => {
    // 신청한 활동이 목록에 없으면(삭제 등) buddyId를 알 수 없다.
    // 이때 공개 닉네임으로 매칭하면 동명이인의 활동이 섞이므로 아무것도 보여주지 않는다.
    mockedGetTouristActivities.mockResolvedValue({
      status: "success",
      activities: [
        {
          activityId: 88,
          buddyId: 12,
          title: "Namesake's experience",
          description: "Hosted by a different buddy with the same public name.",
          thumbnailImageUrl: "/images/activities/other.jpg",
          buddyName: "Jihoon Kim",
          buddyProfileImageUrl: null,
          meetingPointName: "Hongdae",
          meetingPlaceId: "ChIJ-hongdae",
          price: 20000,
          currency: "KRW",
        },
      ],
    });

    renderList();

    fireEvent.click(screen.getByRole("button", { name: "View Jihoon Kim's profile" }));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("No other experiences yet.")).toBeInTheDocument();
    expect(within(dialog).queryByText("Namesake's experience")).not.toBeInTheDocument();
  });

  it("counts down the seat hold and asks for a refresh when it expires", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const onHoldExpired = vi.fn();
    try {
      renderList({
        applications: [
          {
            ...applications[0],
            holdExpiresAt: new Date(Date.now() + 65_000).toISOString(),
          },
        ],
        onHoldExpired,
      });

      expect(screen.getByTestId("payment-hold-countdown")).toHaveTextContent(
        "1:05 left to complete payment",
      );

      await act(async () => {
        vi.advanceTimersByTime(60_000);
      });
      expect(screen.getByTestId("payment-hold-countdown")).toHaveTextContent(
        "0:05 left to complete payment",
      );
      expect(onHoldExpired).not.toHaveBeenCalled();

      // 선점이 끝나면 목록을 다시 불러오도록 알리고 남은 시간은 감춘다
      await act(async () => {
        vi.advanceTimersByTime(6_000);
      });
      expect(screen.queryByTestId("payment-hold-countdown")).not.toBeInTheDocument();
      expect(onHoldExpired).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("omits the countdown when the seat hold is unknown", () => {
    renderList();

    expect(screen.queryByTestId("payment-hold-countdown")).not.toBeInTheDocument();
  });

  it("cancels a pending payment after confirming the seat release", async () => {
    const onCancelPendingPayment = vi.fn().mockResolvedValue({ ok: true });
    renderList({ onCancelPendingPayment });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("dialog", { name: "Cancel this application?" })).toBeInTheDocument();
    expect(
      screen.queryByText("The seat we're holding for you will be released right away."),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Keep application" })).toHaveClass(
      "border-ink",
      "text-ink",
      "enabled:hover:border-primary",
      "enabled:hover:text-primary",
    );
    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => expect(onCancelPendingPayment).toHaveBeenCalledWith("1"));
    await waitFor(() =>
      expect(
        screen.queryByText("The seat we're holding for you will be released right away."),
      ).not.toBeInTheDocument(),
    );
  });

  it("keeps the pending cancellation dialog open and shows why it failed", async () => {
    const onCancelPendingPayment = vi.fn().mockResolvedValue({
      ok: false,
      error: new ApiClientError({
        code: "PAYMENT409_REVIEW_REQUIRED",
        status: 409,
        details: null,
        backendMessage: "운영자 확인이 필요한 결제입니다.",
      }),
    });
    renderList({ onCancelPendingPayment });

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This payment needs administrator review before it can continue.",
    );
    expect(
      screen.queryByText("The seat we're holding for you will be released right away."),
    ).not.toBeInTheDocument();
  });

  it("shows the cancellation reason on a cancelled application", () => {
    renderList({
      applications: [
        {
          ...applications[1],
          id: "9",
          status: "cancelled",
          cancellationReason: "SCHEDULE_CONFLICT",
        },
      ],
    });

    fireEvent.click(screen.getByRole("tab", { name: "Past" }));

    expect(screen.getByText("Cancellation reason: Schedule conflict")).toBeInTheDocument();
  });

  it("hides the cancel action once the activity has ended", () => {
    renderList({
      applications: [
        {
          ...applications[0],
          id: "8",
          status: "confirmed",
          startAt: "2026-07-20T10:00:00+09:00",
          endAt: "2026-07-20T12:00:00+09:00",
        },
      ],
    });

    // 종료된 활동은 백엔드가 취소를 거절하므로 버튼을 노출하지 않는다
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("keeps the cancel action for a confirmed activity that has not started", () => {
    renderList({
      applications: [{ ...applications[0], id: "7", status: "confirmed" }],
    });

    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("writes a review from a completed application card", async () => {
    mockedCreateReview.mockResolvedValue({
      status: "success",
      review: {
        reviewId: 9,
        applicationId: 2,
        activityId: 43,
        activityTitle: "Traditional Tea Tasting",
        reviewerName: "Nelli",
        reviewerProfileImageUrl: null,
        rating: 5,
        content: "The tea master was wonderful.",
        createdAt: "2026-07-11T13:00:00+09:00",
      },
    });

    renderList();

    fireEvent.click(screen.getByRole("tab", { name: "Past" }));
    fireEvent.click(screen.getByRole("button", { name: "Write a review" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Traditional Tea Tasting")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "5 stars" }));
    fireEvent.change(within(dialog).getByLabelText("Your review"), {
      target: { value: "The tea master was wonderful." },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit review" }));

    await waitFor(() =>
      expect(mockedCreateReview).toHaveBeenCalledWith({
        applicationId: 2,
        rating: 5,
        content: "The tea master was wonderful.",
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("offers edit and delete when the application already carries my review", async () => {
    mockedUpdateReview.mockResolvedValue({
      status: "success",
      review: {
        reviewId: 9,
        applicationId: 2,
        activityId: 43,
        activityTitle: "Traditional Tea Tasting",
        reviewerName: "Nelli",
        reviewerProfileImageUrl: null,
        rating: 4,
        content: "Slightly rushed at the end.",
        createdAt: "2026-07-11T13:00:00+09:00",
      },
    });
    mockedDeleteReview.mockResolvedValue({ status: "success", review: null });

    renderList({ applications: [reviewedApplication] });

    fireEvent.click(screen.getByRole("tab", { name: "Past" }));
    expect(screen.queryByRole("button", { name: "Write a review" })).not.toBeInTheDocument();
    // 작성한 후기가 카드 안에 그대로 보이고, 수정·삭제는 아이콘 버튼이다
    expect(screen.getByText("Your review")).toBeInTheDocument();
    expect(screen.getByText("The tea master was wonderful.")).toBeInTheDocument();
    expect(screen.getByLabelText("Rated 5 out of 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit review" })).toHaveTextContent("");

    fireEvent.click(screen.getByRole("button", { name: "Edit review" }));
    const editDialog = await screen.findByRole("dialog");
    // 수정 폼은 백엔드가 내려준 후기 내용으로 채워진다
    expect(within(editDialog).getByLabelText("Your review")).toHaveValue(
      "The tea master was wonderful.",
    );
    fireEvent.click(within(editDialog).getByRole("button", { name: "4 stars" }));
    fireEvent.change(within(editDialog).getByLabelText("Your review"), {
      target: { value: "Slightly rushed at the end." },
    });
    fireEvent.click(within(editDialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(mockedUpdateReview).toHaveBeenCalledWith(9, {
        rating: 4,
        content: "Slightly rushed at the end.",
      }),
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    const confirmDialog = await screen.findByRole("dialog");
    fireEvent.click(within(confirmDialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(mockedDeleteReview).toHaveBeenCalledWith(9));
  });

  it("refuses to submit a review without a rating", async () => {
    renderList();

    fireEvent.click(screen.getByRole("tab", { name: "Past" }));
    fireEvent.click(screen.getByRole("button", { name: "Write a review" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Your review"), {
      target: { value: "Forgot the stars." },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit review" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Please choose a rating.");
    expect(mockedCreateReview).not.toHaveBeenCalled();
  });

  it("surfaces the backend message when the booking was already reviewed", async () => {
    mockedCreateReview.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "REVIEW409_DUPLICATE",
        status: 409,
        details: null,
        backendMessage: "이미 리뷰를 작성한 신청입니다.",
      }),
    });

    renderList();

    fireEvent.click(screen.getByRole("tab", { name: "Past" }));
    fireEvent.click(screen.getByRole("button", { name: "Write a review" }));

    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "4 stars" }));
    fireEvent.change(within(dialog).getByLabelText("Your review"), {
      target: { value: "Second attempt." },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Submit review" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "You already reviewed this booking.",
    );
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
    expect(screen.getByRole("button", { name: "취소" })).toBeInTheDocument();

    // 총액은 가격 상세 줄에만 나오고 카드에서 반복하지 않는다
    expect(screen.getByText("₩90,000")).toBeInTheDocument();
    expect(screen.queryByText("₩45,000 × 2명")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /가격 상세/ }));

    expect(screen.getByText("₩45,000 × 2명")).toBeInTheDocument();
    expect(screen.getByText("총액").parentElement).toHaveTextContent("₩90,000");
    expect(screen.getByText("결제 금액").parentElement).toHaveTextContent("₩90,000");

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
