import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  cancelMyApplication,
  cancelPendingPayment,
  continueApplicationPayment,
  getMyApplications,
} from "@/lib/api/applications";
import { ApiClientError } from "@/lib/api/errors";
import { applicationKeys } from "@/lib/query/applications";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { ApplicationResponse } from "@/types/application";
import { requestTossPayment } from "@/lib/payments/toss";
import { ApplicationsContent } from "./applications-content";

const routerMock = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/applications", () => ({
  cancelMyApplication: vi.fn(),
  cancelPendingPayment: vi.fn(),
  continueApplicationPayment: vi.fn(),
  getMyApplications: vi.fn(),
}));

vi.mock("@/lib/payments/toss", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/payments/toss")>()),
  requestTossPayment: vi.fn(),
}));

const mockedCancelMyApplication = vi.mocked(cancelMyApplication);
const mockedCancelPendingPayment = vi.mocked(cancelPendingPayment);
const mockedContinueApplicationPayment = vi.mocked(continueApplicationPayment);
const mockedGetMyApplications = vi.mocked(getMyApplications);
const mockedRequestTossPayment = vi.mocked(requestTossPayment);

const confirmedApplication: ApplicationResponse = {
  applicationId: 11,
  activityId: 42,
  activityScheduleId: 101,
  activityTitle: "Bukchon Hidden Gems",
  thumbnailImageUrl: "https://static.hanbuddy.com/activities/bukchon.webp",
  buddyName: "Jihoon Kim",
  guestCount: 2,
  specialRequest: null,
  startAt: "2099-07-20T10:00:00+09:00",
  endAt: "2099-07-20T12:00:00+09:00",
  price: 45000,
  totalPrice: 90000,
  currency: "KRW",
  paymentAmount: 90000,
  paymentCurrency: "KRW",
  status: "CONFIRMED",
  cancellationReason: null,
  cancellationDetail: null,
  holdExpiresAt: null,
  cancelledAt: null,
  createdAt: "2026-07-07T10:00:00Z",
};

describe("ApplicationsContent", () => {
  beforeEach(() => {
    routerMock.replace.mockReset();
    mockedCancelMyApplication.mockReset();
    mockedCancelPendingPayment.mockReset();
    mockedContinueApplicationPayment.mockReset();
    mockedGetMyApplications.mockReset();
    mockedRequestTossPayment.mockReset();
    mockedRequestTossPayment.mockResolvedValue(undefined);
  });

  it("continues a pending payment through the Toss window", async () => {
    const pendingApplication: ApplicationResponse = {
      ...confirmedApplication,
      status: "PENDING_PAYMENT",
      paymentAmount: null,
      paymentCurrency: null,
    };
    const paymentReady = {
      application: pendingApplication,
      paymentId: 7,
      orderNumber: "hanbuddy-11-order",
      clientKey: "test_ck_client-key",
      orderName: "Bukchon Hidden Gems",
      paymentStatus: "CREATED" as const,
      paymentAmount: 90000,
      paymentCurrency: "KRW",
      orderExpiresAt: "2026-07-14T13:00:00+09:00",
    };
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [pendingApplication],
    });
    mockedContinueApplicationPayment.mockResolvedValue({
      status: "success",
      payment: paymentReady,
    });

    renderWithQueryClient(<ApplicationsContent />);

    expect(await screen.findByText("₩90,000")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue Payment" }));

    await waitFor(() => {
      expect(mockedRequestTossPayment).toHaveBeenCalledWith(paymentReady, "en");
    });
    expect(mockedContinueApplicationPayment).toHaveBeenCalledWith("11");
  });

  it("shows the seat-hold countdown from the application response", async () => {
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [
        {
          ...confirmedApplication,
          status: "PENDING_PAYMENT",
          paymentAmount: null,
          paymentCurrency: null,
          holdExpiresAt: new Date(Date.now() + 9 * 60_000 + 30_000).toISOString(),
        },
      ],
    });

    renderWithQueryClient(<ApplicationsContent />);

    expect(await screen.findByTestId("payment-hold-countdown")).toHaveTextContent(
      /9:2\d left to complete payment/,
    );
  });

  it("removes a pending application from the list after cancelling it", async () => {
    const pendingApplication: ApplicationResponse = {
      ...confirmedApplication,
      status: "PENDING_PAYMENT",
      paymentAmount: null,
      paymentCurrency: null,
    };
    mockedGetMyApplications.mockResolvedValueOnce({
      status: "success",
      applications: [pendingApplication],
    });
    // 결제 전 취소된 신청은 백엔드 목록에서 빠진다
    mockedGetMyApplications.mockResolvedValue({ status: "success", applications: [] });
    mockedCancelPendingPayment.mockResolvedValue({
      status: "success",
      application: { ...pendingApplication, status: "CANCELLED" },
    });

    renderWithQueryClient(<ApplicationsContent />);

    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, cancel" }));

    await waitFor(() => expect(mockedCancelPendingPayment).toHaveBeenCalledWith("11"));
    await waitFor(() => expect(screen.queryByText("Bukchon Hidden Gems")).not.toBeInTheDocument());
  });

  it("hides superseded applications from the list", async () => {
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [
        confirmedApplication,
        {
          ...confirmedApplication,
          applicationId: 12,
          activityTitle: "Old superseded application",
          status: "SUPERSEDED",
        },
      ],
    });

    renderWithQueryClient(<ApplicationsContent />);

    expect(await screen.findByText("Bukchon Hidden Gems")).toBeInTheDocument();
    expect(screen.queryByText("Old superseded application")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Past" }));
    expect(screen.queryByText("Old superseded application")).not.toBeInTheDocument();
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
