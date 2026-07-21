import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelMyApplication,
  captureApplicationPayment,
  continueApplicationPayment,
  getMyApplications,
} from "@/lib/api/applications";
import { ApiClientError } from "@/lib/api/errors";
import { applicationKeys } from "@/lib/query/applications";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { ApplicationResponse } from "@/types/application";
import { ApplicationsContent } from "./applications-content";

const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/applications", () => ({
  cancelMyApplication: vi.fn(),
  captureApplicationPayment: vi.fn(),
  continueApplicationPayment: vi.fn(),
  getMyApplications: vi.fn(),
}));

vi.mock("@paypal/react-paypal-js/sdk-v6", () => ({
  PayPalProvider: ({ children }: { children: React.ReactNode }) => children,
  PayPalOneTimePaymentButton: ({
    createOrder,
    onApprove,
    onError,
  }: {
    createOrder: () => Promise<{ orderId: string }>;
    onApprove: (data: { orderId: string }) => Promise<void> | void;
    onError?: (error: unknown) => void;
  }) => (
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
      PayPal
    </button>
  ),
  PayPalGuestPaymentButton: () => <button type="button">Debit or Credit Card</button>,
}));

const mockedCancelMyApplication = vi.mocked(cancelMyApplication);
const mockedCaptureApplicationPayment = vi.mocked(captureApplicationPayment);
const mockedContinueApplicationPayment = vi.mocked(continueApplicationPayment);
const mockedGetMyApplications = vi.mocked(getMyApplications);

const confirmedApplication: ApplicationResponse = {
  applicationId: 11,
  activityId: 42,
  activityScheduleId: 101,
  activityTitle: "Bukchon Hidden Gems",
  thumbnailImageUrl: "https://static.hanbuddy.com/activities/bukchon.webp",
  buddyName: "Jihoon Kim",
  guestCount: 2,
  specialRequest: null,
  startAt: "2026-07-20T10:00:00+09:00",
  price: 45000,
  totalPrice: 90000,
  currency: "KRW",
  paymentAmount: 68.97,
  paymentCurrency: "USD",
  status: "CONFIRMED",
  cancellationReason: null,
  cancellationDetail: null,
  cancelledAt: null,
  createdAt: "2026-07-07T10:00:00Z",
};

describe("ApplicationsContent", () => {
  beforeEach(() => {
    routerMock.replace.mockReset();
    mockedCancelMyApplication.mockReset();
    mockedCaptureApplicationPayment.mockReset();
    mockedContinueApplicationPayment.mockReset();
    mockedGetMyApplications.mockReset();
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "test-client-id");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("completes a pending payment through the PayPal button", async () => {
    const pendingApplication: ApplicationResponse = {
      ...confirmedApplication,
      status: "PENDING_PAYMENT",
    };
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [pendingApplication],
    });
    mockedContinueApplicationPayment.mockResolvedValue({
      status: "success",
      payment: {
        application: pendingApplication,
        paymentId: 7,
        paypalOrderId: "ORDER123",
        approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER123",
        paymentStatus: "CREATED",
        paymentAmount: 68.97,
        paymentCurrency: "USD",
        orderExpiresAt: "2026-07-14T13:00:00+09:00",
      },
    });
    mockedCaptureApplicationPayment.mockResolvedValue({
      status: "success",
      application: {
        ...confirmedApplication,
        paymentAmount: null,
        paymentCurrency: null,
      },
    });

    const { queryClient } = renderWithQueryClient(<ApplicationsContent />);

    expect(await screen.findByText("₩90,000")).toBeInTheDocument();
    expect(screen.queryByText("Paid with PayPal: $68.97")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "PayPal" }));

    await waitFor(() => {
      expect(mockedCaptureApplicationPayment).toHaveBeenCalledWith("11", "ORDER123");
    });
    expect(mockedContinueApplicationPayment).toHaveBeenCalledWith("11");
    expect(await screen.findByText("Confirmed")).toBeInTheDocument();
    expect(queryClient.getQueryData(applicationKeys.mine())).toEqual([
      expect.objectContaining({
        applicationId: 11,
        status: "CONFIRMED",
        paymentAmount: 68.97,
        paymentCurrency: "USD",
      }),
    ]);
    expect(routerMock.replace).toHaveBeenCalledWith("/en/payments/success?applicationId=11");
  });

  it("renders applications loaded from the API", async () => {
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [confirmedApplication],
    });

    renderWithQueryClient(<ApplicationsContent />);

    expect(await screen.findByText("Bukchon Hidden Gems")).toBeInTheDocument();
    expect(screen.getByText("Jihoon Kim")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
  });

  it("cancels a confirmed application and moves it to the Past tab", async () => {
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [confirmedApplication],
    });
    mockedCancelMyApplication.mockResolvedValue({
      status: "success",
      application: {
        ...confirmedApplication,
        status: "CANCELLED",
        cancellationReason: "SCHEDULE_CONFLICT",
        cancelledAt: "2026-07-09T10:00:00Z",
      },
    });

    const { queryClient } = renderWithQueryClient(<ApplicationsContent />);

    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Schedule conflict" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Cancel" }));

    await waitFor(() =>
      expect(mockedCancelMyApplication).toHaveBeenCalledWith("11", "SCHEDULE_CONFLICT"),
    );
    await waitFor(() => expect(screen.queryByText("Bukchon Hidden Gems")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("tab", { name: "Past" }));

    expect(screen.getByText("Bukchon Hidden Gems")).toBeInTheDocument();
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
    expect(queryClient.getQueryData(applicationKeys.mine())).toEqual([
      expect.objectContaining({ applicationId: 11, status: "CANCELLED" }),
    ]);
  });

  it("passes a cancellation API error to the dialog for localized rendering", async () => {
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [confirmedApplication],
    });
    mockedCancelMyApplication.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "APPLICATION400_NOT_CANCELLABLE",
        status: 400,
        details: null,
        backendMessage: "확정된 신청만 취소할 수 있습니다.",
        fallbackMessage: "신청을 취소하지 못했습니다.",
      }),
    });

    renderWithQueryClient(<ApplicationsContent />);
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Schedule conflict" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, Cancel" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This application can no longer be cancelled.",
    );
    expect(screen.queryByText("확정된 신청만 취소할 수 있습니다.")).not.toBeInTheDocument();
  });

  it("localizes Korean loading and maps a tourist-role error", async () => {
    let rejectApplications!: (error: Error) => void;
    mockedGetMyApplications.mockReturnValue(
      new Promise((_, reject) => {
        rejectApplications = reject;
      }),
    );

    renderWithQueryClient(<ApplicationsContent />, { locale: "ko" });

    expect(screen.getByText("신청 내역을 불러오는 중...")).toBeInTheDocument();

    await act(async () => {
      rejectApplications(
        new ApiClientError({
          code: "USER403_TOURIST",
          status: 403,
          details: null,
          backendMessage: "raw server detail",
        }),
      );
    });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "투어리스트 사용자만 이용할 수 있는 기능입니다.",
    );
    expect(screen.queryByText("raw server detail")).not.toBeInTheDocument();
  });
});
