import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmApplicationPayment, getMyApplications } from "@/lib/api/applications";
import { ApiClientError } from "@/lib/api/errors";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import type { ApplicationResponse } from "@/types/application";
import { PaymentSuccessContent } from "./payment-success-content";

const routerMock = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => routerMock,
}));

vi.mock("@/lib/api/applications", () => ({
  confirmApplicationPayment: vi.fn(),
  getMyApplications: vi.fn(),
}));

const mockedConfirmApplicationPayment = vi.mocked(confirmApplicationPayment);
const mockedGetMyApplications = vi.mocked(getMyApplications);

const confirmedApplication: ApplicationResponse = {
  applicationId: 11,
  activityId: 42,
  activityScheduleId: 101,
  activityTitle: "Bukchon Hidden Gems",
  thumbnailImageUrl: null,
  buddyName: "Jihoon Kim",
  guestCount: 2,
  specialRequest: null,
  startAt: "2026-07-18T16:30:00Z",
  endAt: "2026-07-18T16:30:00Z",
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

const emptyTossParams = { paymentKey: "", orderId: "", amount: null };
const tossParams = {
  paymentKey: "tviva20260809abcdef",
  orderId: "hanbuddy-11-order",
  amount: 90000,
};

describe("PaymentSuccessContent", () => {
  beforeEach(() => {
    routerMock.replace.mockReset();
    routerMock.refresh.mockReset();
    mockedConfirmApplicationPayment.mockReset();
    mockedGetMyApplications.mockReset();
  });

  it("confirms the Toss payment with the successUrl parameters and shows the result", async () => {
    mockedConfirmApplicationPayment.mockResolvedValue({
      status: "success",
      application: confirmedApplication,
    });

    renderWithQueryClient(<PaymentSuccessContent applicationId="11" {...tossParams} />);

    expect(await screen.findByRole("heading", { name: "Payment complete" })).toBeInTheDocument();
    expect(mockedConfirmApplicationPayment).toHaveBeenCalledTimes(1);
    expect(mockedConfirmApplicationPayment).toHaveBeenCalledWith("11", {
      paymentKey: "tviva20260809abcdef",
      orderId: "hanbuddy-11-order",
      amount: 90000,
    });
    expect(mockedGetMyApplications).not.toHaveBeenCalled();
    expect(screen.getByText("Total application amount: ₩90,000")).toBeInTheDocument();
    expect(screen.getByText("Amount paid: ₩90,000")).toBeInTheDocument();
  });

  it("shows a confirming status while the approval call is in flight", () => {
    mockedConfirmApplicationPayment.mockReturnValue(new Promise(() => undefined));

    renderWithQueryClient(<PaymentSuccessContent applicationId="11" {...tossParams} />);

    expect(screen.getByRole("status")).toHaveTextContent("Confirming your payment...");
  });

  it("maps a confirmation failure without exposing the backend message", async () => {
    mockedConfirmApplicationPayment.mockResolvedValue({
      status: "error",
      error: new ApiClientError({
        code: "PAYMENT409_CONFIRM_MISMATCH",
        status: 409,
        details: null,
        backendMessage: "raw Toss failure",
      }),
    });

    renderWithQueryClient(<PaymentSuccessContent applicationId="11" {...tossParams} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The approved amount or currency does not match this payment.",
    );
    expect(screen.queryByText("raw Toss failure")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View My Applications" })).toHaveAttribute(
      "href",
      "/en/applications",
    );
  });

  it("shows the essential payment confirmation details and next actions", async () => {
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [confirmedApplication],
    });

    renderWithQueryClient(<PaymentSuccessContent applicationId="11" {...emptyTossParams} />);

    expect(await screen.findByRole("heading", { name: "Payment complete" })).toBeInTheDocument();
    expect(screen.getByTestId("payment-result")).toHaveClass("max-w-2xl", "rounded-3xl");
    expect(screen.getByText("Your application is confirmed.")).toBeInTheDocument();
    expect(screen.getByText("Bukchon Hidden Gems")).toBeInTheDocument();
    expect(screen.getByText("Jul 19, 2026, 1:30 AM")).toBeInTheDocument();
    expect(screen.getByText("Total application amount: ₩90,000")).toBeInTheDocument();
    expect(screen.getByText("Amount paid: ₩90,000")).toBeInTheDocument();
    expect(mockedConfirmApplicationPayment).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "View My Applications" })).toHaveAttribute(
      "href",
      "/en/applications",
    );
    expect(screen.getByRole("link", { name: "Explore More Activities" })).toHaveAttribute(
      "href",
      "/en/explore",
    );
  });

  it("renders the localized unavailable label for an invalid timestamp", async () => {
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [{ ...confirmedApplication, startAt: "2026-07-20T10:00" }],
    });

    renderWithQueryClient(<PaymentSuccessContent applicationId="11" {...emptyTossParams} />, {
      locale: "ko",
    });

    expect(await screen.findByText("시간 정보를 확인할 수 없습니다.")).toBeInTheDocument();
  });

  it("offers a recovery action when the payment cannot be found", async () => {
    mockedGetMyApplications.mockResolvedValue({ status: "success", applications: [] });

    renderWithQueryClient(<PaymentSuccessContent applicationId="11" {...emptyTossParams} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't find this payment confirmation.",
    );
    expect(screen.getByRole("link", { name: "View My Applications" })).toHaveAttribute(
      "href",
      "/en/applications",
    );
  });

  it("does not show a success confirmation for an unpaid application", async () => {
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [{ ...confirmedApplication, status: "PENDING_PAYMENT" }],
    });

    renderWithQueryClient(<PaymentSuccessContent applicationId="11" {...emptyTossParams} />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "This application has not been paid yet.",
    );
    expect(screen.queryByRole("heading", { name: "Payment complete" })).not.toBeInTheDocument();
  });

  it("localizes the complete Korean payment confirmation and preserves activity content", async () => {
    mockedConfirmApplicationPayment.mockResolvedValue({
      status: "success",
      application: confirmedApplication,
    });

    renderWithQueryClient(<PaymentSuccessContent applicationId="11" {...tossParams} />, {
      locale: "ko",
    });

    expect(await screen.findByRole("heading", { name: "결제 완료" })).toBeInTheDocument();
    expect(screen.getByText("신청이 확정되었습니다.")).toBeInTheDocument();
    expect(screen.getByText("내 액티비티")).toBeInTheDocument();
    expect(screen.getByText("Bukchon Hidden Gems")).toBeInTheDocument();
    expect(screen.getByText("2026. 7. 19. 오전 1:30")).toBeInTheDocument();
    expect(screen.getByText("신청 총액: ₩90,000")).toBeInTheDocument();
    expect(screen.getByText("결제 금액: ₩90,000")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "내 신청 보기" })).toHaveAttribute(
      "href",
      "/ko/applications",
    );
    expect(screen.getByRole("link", { name: "액티비티 더 둘러보기" })).toHaveAttribute(
      "href",
      "/ko/explore",
    );
  });

  it("localizes Korean confirming and recovery copy", async () => {
    mockedConfirmApplicationPayment.mockReturnValue(new Promise(() => undefined));

    const view = renderWithQueryClient(
      <PaymentSuccessContent applicationId="11" {...tossParams} />,
      { locale: "ko" },
    );

    expect(screen.getByRole("status")).toHaveTextContent("결제를 승인하는 중...");

    view.unmount();
    mockedGetMyApplications.mockResolvedValue({ status: "success", applications: [] });
    renderWithQueryClient(<PaymentSuccessContent applicationId="11" {...emptyTossParams} />, {
      locale: "ko",
    });

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("결제 확인 정보를 찾을 수 없습니다."),
    );
    expect(screen.getByRole("link", { name: "내 신청 보기" })).toHaveAttribute(
      "href",
      "/ko/applications",
    );
  });
});
