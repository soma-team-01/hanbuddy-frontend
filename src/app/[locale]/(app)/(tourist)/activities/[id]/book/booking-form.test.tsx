import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  captureApplicationPayment,
  continueApplicationPayment,
  createApplication,
} from "@/lib/api/applications";
import { ApiClientError } from "@/lib/api/errors";
import { applicationKeys } from "@/lib/query/applications";
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
  continueApplicationPayment: vi.fn(),
  captureApplicationPayment: vi.fn(),
}));

vi.mock("@paypal/react-paypal-js/sdk-v6", () => {
  interface MockButtonProps {
    createOrder: () => Promise<{ orderId: string }>;
    onApprove: (data: { orderId: string }) => Promise<void> | void;
    onError?: (error: unknown) => void;
  }
  function MockPaymentButton({
    label,
    createOrder,
    onApprove,
    onError,
  }: MockButtonProps & { label: string }) {
    return (
      <button
        type="button"
        onClick={async () => {
          try {
            const { orderId } = await createOrder();
            await onApprove({ orderId });
          } catch (error) {
            onError?.(error);
          }
        }}
      >
        {label}
      </button>
    );
  }
  return {
    PayPalProvider: ({ children }: { children: React.ReactNode }) => children,
    PayPalOneTimePaymentButton: (props: MockButtonProps) => (
      <MockPaymentButton label="PayPal" {...props} />
    ),
    PayPalGuestPaymentButton: (props: MockButtonProps) => (
      <MockPaymentButton label="Debit or Credit Card" {...props} />
    ),
  };
});

const mockedCreateApplication = vi.mocked(createApplication);
const mockedContinueApplicationPayment = vi.mocked(continueApplicationPayment);
const mockedCaptureApplicationPayment = vi.mocked(captureApplicationPayment);

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
  price: 45000,
  totalPrice: 90000,
  currency: "KRW",
  status: "PENDING_PAYMENT",
  cancellationReason: null,
  cancellationDetail: null,
  cancelledAt: null,
  createdAt: "2026-07-07T10:00:00Z",
};

const paymentReady: PaymentReadyResponse = {
  application: pendingApplication,
  paymentId: 7,
  paypalOrderId: "5O190127TN364715T",
  approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T",
  paymentStatus: "CREATED",
  paymentAmount: 68.97,
  paymentCurrency: "USD",
  orderExpiresAt: "2026-07-14T13:00:00+09:00",
};

describe("BookingForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "test-client-id");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("creates an application and captures the PayPal payment from the confirm dialog", async () => {
    mockedCreateApplication.mockResolvedValue({ status: "success", payment: paymentReady });
    mockedCaptureApplicationPayment.mockResolvedValue({
      status: "success",
      application: { ...pendingApplication, status: "CONFIRMED" },
    });

    const { queryClient } = renderWithQueryClient(<BookingForm activity={activity} />);
    queryClient.setQueryData(applicationKeys.mine(), []);
    fireEvent.change(screen.getByPlaceholderText("Let your buddy know..."), {
      target: { value: "Vegetarian snacks, please." },
    });
    fireEvent.click(screen.getByLabelText("I agree to the terms above."));
    fireEvent.click(screen.getByRole("button", { name: /Submit Application/ }));

    const dialog = await screen.findByRole("dialog", { name: "Choose a payment method" });
    expect(
      within(dialog).getByText("Bukchon Hidden Gems · 2026-07-20 10:00 · 2 guests"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Total application amount: ₩90,000")).toBeInTheDocument();
    expect(within(dialog).getByText("PayPal charge: $68.97")).toBeInTheDocument();
    expect(within(dialog).getByText("PayPal payments are processed in USD.")).toBeInTheDocument();
    expect(within(dialog).queryByText("Activity")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("When")).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Guests")).not.toBeInTheDocument();

    expect(mockedCreateApplication).toHaveBeenCalledWith({
      activityScheduleId: 101,
      guestCount: 2,
      specialRequest: "Vegetarian snacks, please.",
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "PayPal" }));

    await waitFor(() => {
      expect(mockedCaptureApplicationPayment).toHaveBeenCalledWith(11, "5O190127TN364715T");
    });
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/en/payments/success?applicationId=11"),
    );
    expect(queryClient.getQueryState(applicationKeys.mine())?.isInvalidated).toBe(true);
  });

  it("shows a localized capacity error when the selected schedule is full", async () => {
    mockedCreateApplication.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "APPLICATION400_CAPACITY_EXCEEDED",
        status: 400,
        details: null,
        backendMessage: "신청 가능 인원을 초과했습니다.",
        fallbackMessage: "신청을 생성하지 못했습니다.",
      }),
    });

    renderWithQueryClient(<BookingForm activity={activity} />);
    fireEvent.click(screen.getByLabelText("I agree to the terms above."));
    fireEvent.click(screen.getByRole("button", { name: /Submit Application/ }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Not enough spots are available.");
    expect(screen.queryByText("신청 가능 인원을 초과했습니다.")).not.toBeInTheDocument();
  });

  it("pays as a guest with a card through the same application flow", async () => {
    mockedCreateApplication.mockResolvedValue({ status: "success", payment: paymentReady });
    mockedCaptureApplicationPayment.mockResolvedValue({
      status: "success",
      application: { ...pendingApplication, status: "CONFIRMED" },
    });

    renderWithQueryClient(<BookingForm activity={activity} />);
    fireEvent.click(screen.getByLabelText("I agree to the terms above."));
    fireEvent.click(screen.getByRole("button", { name: /Submit Application/ }));

    const dialog = await screen.findByRole("dialog", { name: "Choose a payment method" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Debit or Credit Card" }));

    await waitFor(() => {
      expect(mockedCaptureApplicationPayment).toHaveBeenCalledWith(11, "5O190127TN364715T");
    });
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/en/payments/success?applicationId=11"),
    );
  });

  it("continues the existing payment when retrying after a capture failure", async () => {
    mockedCreateApplication.mockResolvedValue({ status: "success", payment: paymentReady });
    mockedCaptureApplicationPayment
      .mockResolvedValueOnce({
        status: "error",
        error: new ApiClientError({
          code: null,
          status: null,
          details: null,
          backendMessage: null,
          fallbackMessage: "PayPal 결제 캡처에 실패했습니다.",
        }),
      })
      .mockResolvedValueOnce({
        status: "success",
        application: { ...pendingApplication, status: "CONFIRMED" },
      });
    mockedContinueApplicationPayment.mockResolvedValue({
      status: "success",
      payment: { ...paymentReady, paypalOrderId: "NEW_ORDER_ID" },
    });

    renderWithQueryClient(<BookingForm activity={activity} />);
    fireEvent.click(screen.getByLabelText("I agree to the terms above."));
    fireEvent.click(screen.getByRole("button", { name: /Submit Application/ }));

    const dialog = await screen.findByRole("dialog", { name: "Choose a payment method" });
    fireEvent.click(within(dialog).getByRole("button", { name: "PayPal" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Could not complete the payment.",
    );
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    expect(within(dialog).queryByText("PayPal 결제 캡처에 실패했습니다.")).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "PayPal" }));

    await waitFor(() => {
      expect(mockedContinueApplicationPayment).toHaveBeenCalledWith(11);
    });
    await waitFor(() => {
      expect(mockedCaptureApplicationPayment).toHaveBeenLastCalledWith(11, "NEW_ORDER_ID");
    });
    expect(mockedCreateApplication).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/en/payments/success?applicationId=11"),
    );
  });

  it("keeps the pending application available when the payment dialog is closed", async () => {
    mockedCreateApplication.mockResolvedValue({ status: "success", payment: paymentReady });

    renderWithQueryClient(<BookingForm activity={activity} />);
    fireEvent.click(screen.getByLabelText("I agree to the terms above."));
    fireEvent.click(screen.getByRole("button", { name: /Submit Application/ }));

    const dialog = await screen.findByRole("dialog", { name: "Choose a payment method" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Close dialog" }));

    expect(mockedCreateApplication).toHaveBeenCalledTimes(1);
    expect(mockedCaptureApplicationPayment).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith("/en/applications");
  });

  it("localizes Korean booking controls and HanBuddy-owned PayPal copy", async () => {
    mockedCreateApplication.mockResolvedValue({ status: "success", payment: paymentReady });

    renderWithQueryClient(<BookingForm activity={activity} />, { locale: "ko" });

    expect(screen.getByText("Jihoon Kim 버디와 함께")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "날짜 및 시간" })).toBeInTheDocument();
    expect(screen.getByText("날짜와 시간")).toBeInTheDocument();
    expect(screen.getByText("모든 시간은 한국 표준시(KST) 기준입니다.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "인원" })).toBeInTheDocument();
    expect(screen.getByText("게스트 수")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "인원 줄이기" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "인원 늘리기" })).toBeEnabled();
    expect(screen.getByRole("heading", { name: "특별 요청" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("버디에게 요청 사항을 알려 주세요...")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "가격 상세" })).toBeInTheDocument();
    expect(screen.getByText("₩45,000 × 2명")).toBeInTheDocument();
    expect(screen.getByText("총액(KRW): ₩90,000")).toBeInTheDocument();
    expect(screen.getByText("환불은 이용일 하루 전까지만 가능합니다.")).toBeInTheDocument();
    expect(screen.getByLabelText("위 약관에 동의합니다.")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("버디에게 요청 사항을 알려 주세요..."), {
      target: { value: "Vegetarian snacks, please." },
    });
    fireEvent.click(screen.getByLabelText("위 약관에 동의합니다."));
    fireEvent.click(screen.getByRole("button", { name: "신청하기" }));

    const dialog = await screen.findByRole("dialog", { name: "결제 수단 선택" });
    expect(
      within(dialog).getByText("Bukchon Hidden Gems · 2026-07-20 10:00 · 2명"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("신청 총액: ₩90,000")).toBeInTheDocument();
    expect(within(dialog).getByText("PayPal 결제 금액: US$68.97")).toBeInTheDocument();
    expect(within(dialog).getByText("PayPal 결제는 USD로 처리됩니다.")).toBeInTheDocument();
    expect(mockedCreateApplication).toHaveBeenCalledWith({
      activityScheduleId: 101,
      guestCount: 2,
      specialRequest: "Vegetarian snacks, please.",
    });

    fireEvent.click(within(dialog).getByRole("button", { name: "대화상자 닫기" }));
    expect(replace).toHaveBeenCalledWith("/ko/applications");
  });

  it.each([
    ["en", "Please select an available schedule."],
    ["ko", "신청 가능한 일정을 선택해 주세요."],
  ] as const)("translates the stable schedule validation key in %s", (locale, message) => {
    renderWithQueryClient(<BookingForm activity={{ ...activity, sessions: [] }} />, { locale });

    const agreement = locale === "ko" ? "위 약관에 동의합니다." : "I agree to the terms above.";
    const submit = locale === "ko" ? "신청하기" : "Submit Application";
    fireEvent.click(screen.getByLabelText(agreement));
    fireEvent.click(screen.getByRole("button", { name: submit }));

    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(mockedCreateApplication).not.toHaveBeenCalled();
  });

  it.each([
    ["en", "2 guests", "1 guest", "Decrease guests"],
    ["ko", "2명", "1명", "인원 줄이기"],
  ] as const)(
    "renders the localized guest-count plural in %s",
    (locale, twoGuests, oneGuest, decreaseGuests) => {
      renderWithQueryClient(<BookingForm activity={activity} />, { locale });

      expect(screen.getByText(twoGuests)).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: decreaseGuests }));

      expect(screen.getByText(oneGuest)).toBeInTheDocument();
      expect(screen.queryByText(twoGuests)).not.toBeInTheDocument();
    },
  );
});
