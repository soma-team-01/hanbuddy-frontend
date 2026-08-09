import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApplication } from "@/lib/api/applications";
import { ApiClientError } from "@/lib/api/errors";
import { isTossUserCancel, requestTossPayment } from "@/lib/payments/toss";
import { activityKeys } from "@/lib/query/activities";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { Activity } from "@/types/activity";
import type { ApplicationResponse, PaymentReadyResponse } from "@/types/application";
import { BookingForm } from "./booking-form";

const replace = vi.fn();

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace, push: vi.fn() }),
}));

vi.mock("@/lib/api/applications", () => ({
  createApplication: vi.fn(),
}));

vi.mock("@/lib/payments/toss", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/payments/toss")>()),
  requestTossPayment: vi.fn(),
}));

const mockedCreateApplication = vi.mocked(createApplication);
const mockedRequestTossPayment = vi.mocked(requestTossPayment);

const activity: Activity = {
  id: "42",
  title: "Bukchon Hidden Gems",
  description: "Walk through quiet alleys with a local buddy.",
  location: "Anguk Station Exit 2",
  district: "Bukchon",
  categoryLabel: "HanBuddy activity",
  imageUrl: "/images/activities/hanok-hero.jpg",
  heroImageUrl: "/images/activities/hanok-hero.jpg",
  rating: 5,
  reviewCount: 0,
  price: 45000,
  host: {
    name: "Jihoon Kim",
    bio: "Local HanBuddy host",
    avatarUrl: null,
  },
  included: [],
  restrictions: [],
  sessions: [
    {
      id: "101",
      dateLabel: "2026-07-20",
      timeLabel: "10:00",
      spotsLeft: 4,
    },
  ],
  meetingPoint: {
    name: "Anguk Station Exit 2",
    area: "Anguk-dong",
    mapImageUrl: "/images/map-bukchon.jpg",
  },
};

const pendingApplication: ApplicationResponse = {
  applicationId: 11,
  activityId: 42,
  activityScheduleId: 101,
  activityTitle: "Bukchon Hidden Gems",
  thumbnailImageUrl: "/images/activities/hanok-hero.jpg",
  buddyName: "Jihoon Kim",
  guestCount: 2,
  specialRequest: "Vegetarian snacks, please.",
  startAt: "2026-07-20T10:00:00+09:00",
  endAt: "2026-07-20T10:00:00+09:00",
  price: 45000,
  totalPrice: 90000,
  currency: "KRW",
  status: "PENDING_PAYMENT",
  cancellationReason: null,
  cancellationDetail: null,
  holdExpiresAt: null,
  cancelledAt: null,
  myReview: null,
  createdAt: "2026-07-07T10:00:00Z",
};

const paymentReady: PaymentReadyResponse = {
  application: pendingApplication,
  paymentId: 7,
  orderNumber: "hanbuddy-11-550e8400-e29b-41d4-a716-446655440000",
  clientKey: "test_ck_client-key",
  orderName: "Bukchon Hidden Gems",
  paymentStatus: "CREATED",
  paymentAmount: 90000,
  paymentCurrency: "KRW",
  orderExpiresAt: "2026-07-14T13:00:00+09:00",
};

async function agreeAndSubmit(submitLabel = "Apply & Pay") {
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: new RegExp(submitLabel) }));
}

describe("BookingForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateApplication.mockResolvedValue({ status: "success", payment: paymentReady });
    mockedRequestTossPayment.mockResolvedValue(undefined);
  });

  it("uses one responsive form layout with a sticky desktop summary", () => {
    renderWithQueryClient(<BookingForm activity={activity} />);

    expect(screen.getByRole("img", { name: "Bukchon Hidden Gems" })).toHaveAttribute(
      "loading",
      "eager",
    );
    expect(screen.getByTestId("booking-layout")).toHaveClass("lg:grid-cols-[minmax(0,1fr)_360px]");
    expect(screen.getByTestId("booking-panel")).toHaveClass("lg:sticky", "lg:top-24");
    expect(screen.getByTestId("bottom-action-bar")).toHaveClass("lg:static");
    // 요약 카드: 선택한 일정과 총액이 보인다
    expect(screen.getByText("2026-07-20")).toBeInTheDocument();
    expect(screen.getByText("Total (KRW)")).toBeInTheDocument();
    // 취소·환불 정책은 밑줄 트리거에 호버 툴팁으로 제공된다
    expect(
      screen.getByRole("button", { name: "cancellation & refund policy" }),
    ).toBeInTheDocument();
    // 특별 요청 칸은 처음부터 표시되고 비어 있으면 대시로 보인다
    expect(screen.getByTestId("summary-special-request")).toHaveTextContent("—");
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent("48+ hours before the activity");
    expect(tooltip).toHaveTextContent("Full refund");
    expect(tooltip).toHaveTextContent("50% refund");
    expect(tooltip).toHaveTextContent("No refund");
  });

  it("preselects the schedule passed from the availability calendar", () => {
    const twoSessionActivity: Activity = {
      ...activity,
      sessions: [
        ...activity.sessions,
        { id: "102", dateLabel: "2026-07-21", timeLabel: "14:00", spotsLeft: 2 },
      ],
    };

    renderWithQueryClient(<BookingForm activity={twoSessionActivity} initialSessionId="102" />);

    expect(screen.getByTestId("date-select-box")).toHaveTextContent("2026-07-21 14:00");
  });

  it("falls back to the first schedule when the requested one is unknown or full", () => {
    const twoSessionActivity: Activity = {
      ...activity,
      sessions: [
        ...activity.sessions,
        { id: "102", dateLabel: "2026-07-21", timeLabel: "14:00", spotsLeft: 0 },
      ],
    };

    renderWithQueryClient(<BookingForm activity={twoSessionActivity} initialSessionId="102" />);

    expect(screen.getByTestId("date-select-box")).toHaveTextContent("2026-07-20 10:00");
  });

  it("creates an application and opens the Toss payment window", async () => {
    renderWithQueryClient(<BookingForm activity={activity} />);

    fireEvent.change(screen.getByPlaceholderText(/Let your buddy know/i), {
      target: { value: "Vegetarian snacks, please." },
    });
    await agreeAndSubmit();

    expect(screen.getByTestId("summary-special-request")).toHaveTextContent(
      "Vegetarian snacks, please.",
    );
    await waitFor(() => expect(mockedRequestTossPayment).toHaveBeenCalledTimes(1));
    // 기본 인원은 1명이다
    expect(mockedCreateApplication).toHaveBeenCalledWith({
      activityScheduleId: 101,
      guestCount: 1,
      specialRequest: "Vegetarian snacks, please.",
    });
    expect(mockedRequestTossPayment).toHaveBeenCalledWith(paymentReady, "en");
  });

  it("refreshes the activity detail so the held seat is reflected", async () => {
    const { queryClient } = renderWithQueryClient(<BookingForm activity={activity} />);
    queryClient.setQueryData(activityKeys.detail("42"), { activityId: 42 });

    await agreeAndSubmit();

    // 좌석을 선점했으므로 잔여 좌석이 담긴 활동 상세 캐시를 무효화해야 한다
    await waitFor(() =>
      expect(queryClient.getQueryState(activityKeys.detail("42"))?.isInvalidated).toBe(true),
    );
  });

  it("starts with a single guest and applies the chosen count", async () => {
    renderWithQueryClient(<BookingForm activity={activity} />);

    // 스테퍼와 우측 요약 모두 1명으로 시작한다
    expect(screen.getAllByText("1 guest")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Increase guests" }));
    await agreeAndSubmit();

    await waitFor(() =>
      expect(mockedCreateApplication).toHaveBeenCalledWith(
        expect.objectContaining({ guestCount: 2 }),
      ),
    );
  });

  it("shows a localized capacity error when the selected schedule is full", async () => {
    mockedCreateApplication.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "APPLICATION400_CAPACITY_EXCEEDED",
        status: 400,
        details: null,
        backendMessage: "남은 자리가 부족합니다.",
      }),
    });

    renderWithQueryClient(<BookingForm activity={activity} />);
    await agreeAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Not enough spots are available.");
    expect(mockedRequestTossPayment).not.toHaveBeenCalled();
  });

  it("shows a cancellation notice when the buyer closes the Toss window", async () => {
    mockedRequestTossPayment.mockRejectedValue({
      code: "PAY_PROCESS_CANCELED",
      message: "결제가 취소되었습니다.",
    });

    renderWithQueryClient(<BookingForm activity={activity} />);
    await agreeAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Payment was not completed.");
    // 신청은 이미 생성됐고, 같은 화면에서 다시 제출할 수 있다
    expect(screen.getByRole("button", { name: /Apply & Pay/ })).toBeEnabled();
  });

  it("surfaces an error when the Toss window fails to open", async () => {
    mockedRequestTossPayment.mockRejectedValue(new Error("INVALID_CLIENT_KEY"));

    renderWithQueryClient(<BookingForm activity={activity} />);
    await agreeAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Something went wrong while processing the payment.",
    );
  });

  it("changes the schedule through the calendar dialog", async () => {
    const futureDateKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
      new Date(Date.now() + 7 * 86_400_000),
    );
    const calendarActivity: Activity = {
      ...activity,
      sessions: [
        {
          id: "101",
          startAt: `${futureDateKey}T10:00:00+09:00`,
          dateKey: futureDateKey,
          dateLabel: "2026-07-20",
          timeLabel: "10:00 AM",
          spotsLeft: 4,
        },
        {
          id: "102",
          startAt: `${futureDateKey}T14:00:00+09:00`,
          dateKey: futureDateKey,
          dateLabel: "2026-07-20",
          timeLabel: "2:00 PM",
          spotsLeft: 2,
        },
      ],
    };

    renderWithQueryClient(<BookingForm activity={calendarActivity} />);

    fireEvent.click(screen.getByTestId("date-select-box"));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /2:00 PM/ }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByTestId("date-select-box")).toHaveTextContent("2:00 PM");

    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /Apply & Pay/ }));

    await waitFor(() =>
      expect(mockedCreateApplication).toHaveBeenCalledWith(
        expect.objectContaining({ activityScheduleId: 102 }),
      ),
    );
  });

  it("localizes Korean booking controls and the payment flow", async () => {
    renderWithQueryClient(<BookingForm activity={activity} />, { locale: "ko" });

    expect(screen.getByText("가격 상세")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: /신청 및 결제/ }));

    await waitFor(() => expect(mockedRequestTossPayment).toHaveBeenCalledTimes(1));
    expect(mockedRequestTossPayment).toHaveBeenCalledWith(paymentReady, "ko");
  });

  it("treats a Toss user-cancel error code as a cancellation", () => {
    expect(isTossUserCancel({ code: "PAY_PROCESS_CANCELED" })).toBe(true);
    expect(isTossUserCancel({ code: "INVALID_CARD" })).toBe(false);
    expect(isTossUserCancel(new Error("boom"))).toBe(false);
  });
});
