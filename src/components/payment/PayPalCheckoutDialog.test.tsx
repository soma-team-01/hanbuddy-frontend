import { act, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { capturePayPalApplicationPayment, getMyApplications } from "@/lib/api/applications";
import { renderWithIntl } from "@/test/render-with-intl";
import type { ApplicationResponse, PaymentReadyResponse } from "@/types/application";
import { PayPalCheckoutDialog } from "./PayPalCheckoutDialog";

const sdkState = vi.hoisted(() => ({
  loadingStatus: "resolved",
  buttonProps: null as Record<string, unknown> | null,
}));

vi.mock("@paypal/react-paypal-js/sdk-v6", () => ({
  INSTANCE_LOADING_STATE: {
    PENDING: "pending",
    REJECTED: "rejected",
    RESOLVED: "resolved",
  },
  PayPalProvider: ({ children }: { children: React.ReactNode }) => children,
  PayPalOneTimePaymentButton: (props: Record<string, unknown>) => {
    sdkState.buttonProps = props;
    return <button type="button">PayPal SDK</button>;
  },
  usePayPal: () => ({ loadingStatus: sdkState.loadingStatus }),
}));

vi.mock("@/lib/api/applications", () => ({
  capturePayPalApplicationPayment: vi.fn(),
  getMyApplications: vi.fn(),
}));

vi.mock("@/lib/api/use-api-error-message", () => ({
  useApiErrorMessage: () => (_error: unknown, fallback: string) => fallback,
}));

const mockedCapture = vi.mocked(capturePayPalApplicationPayment);
const mockedGetMyApplications = vi.mocked(getMyApplications);

const application: ApplicationResponse = {
  applicationId: 11,
  activityId: 3,
  activityScheduleId: 27,
  activityTitle: "Korean Professional Baseball Cheering",
  thumbnailImageUrl: null,
  buddyName: "버디",
  guestCount: 1,
  specialRequest: null,
  startAt: "2026-08-27T19:23:00+09:00",
  endAt: "2026-08-27T20:23:00+09:00",
  price: 40_000,
  totalPrice: 40_000,
  currency: "KRW",
  paymentAmount: 28.5,
  paymentCurrency: "USD",
  status: "PENDING_PAYMENT",
  cancellationReason: null,
  cancellationDetail: null,
  cancelledAt: null,
  holdExpiresAt: "2026-08-27T19:00:00+09:00",
  myReview: null,
  createdAt: "2026-08-27T18:45:00+09:00",
};

const payment: PaymentReadyResponse = {
  application,
  paymentId: 7,
  paymentProvider: "PAYPAL",
  paymentAttemptId: 9,
  providerOrderId: "5O190127TN364715T",
  approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T",
  orderNumber: "hanbuddy-11-order",
  clientKey: null,
  orderName: application.activityTitle,
  paymentStatus: "CREATED",
  paymentAmount: 28.5,
  paymentCurrency: "USD",
  orderExpiresAt: "2026-08-27T19:00:00+09:00",
};

function apiApplicationResult(nextApplication: ApplicationResponse) {
  return {
    status: "success" as const,
    application: nextApplication,
  };
}

function apiApplicationsResult(applications: ApplicationResponse[]) {
  return {
    status: "success" as const,
    applications,
  };
}

describe("PayPalCheckoutDialog", () => {
  beforeEach(() => {
    sdkState.loadingStatus = "resolved";
    sdkState.buttonProps = null;
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "sandbox-client-id");
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_ENVIRONMENT", "sandbox");
    mockedCapture.mockReset();
    mockedGetMyApplications.mockReset();
  });

  it("uses the backend order in the PayPal SDK popup without showing redirect by default", () => {
    renderWithIntl(
      <PayPalCheckoutDialog payment={payment} onConfirmed={vi.fn()} onClose={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "PayPal SDK" })).toBeInTheDocument();
    expect(sdkState.buttonProps).toMatchObject({
      orderId: payment.providerOrderId,
      presentationMode: "popup",
    });
    expect(screen.queryByRole("link", { name: "Continue on the PayPal website" })).toBeNull();
  });

  it("shows approvalUrl only when the SDK cannot load", () => {
    sdkState.loadingStatus = "rejected";
    renderWithIntl(
      <PayPalCheckoutDialog payment={payment} onConfirmed={vi.fn()} onClose={vi.fn()} />,
    );

    expect(screen.queryByRole("button", { name: "PayPal SDK" })).toBeNull();
    expect(screen.getByRole("link", { name: "Continue on the PayPal website" })).toHaveAttribute(
      "href",
      payment.approvalUrl,
    );
  });

  it("captures the order ID returned by onApprove and confirms only a confirmed application", async () => {
    const onConfirmed = vi.fn();
    const confirmedApplication = { ...application, status: "CONFIRMED" as const };
    mockedCapture.mockResolvedValue(apiApplicationResult(confirmedApplication));
    renderWithIntl(
      <PayPalCheckoutDialog payment={payment} onConfirmed={onConfirmed} onClose={vi.fn()} />,
    );

    await act(async () => {
      await (sdkState.buttonProps?.onApprove as (data: { orderId: string }) => Promise<void>)({
        orderId: "APPROVED-ORDER-ID",
      });
    });

    expect(mockedCapture).toHaveBeenCalledWith(
      application.applicationId,
      { orderId: "APPROVED-ORDER-ID" },
      "EN",
    );
    expect(onConfirmed).toHaveBeenCalledWith(confirmedApplication);
  });

  it("rechecks applications after a lost capture response before reporting failure", async () => {
    const onConfirmed = vi.fn();
    const confirmedApplication = { ...application, status: "CONFIRMED" as const };
    mockedCapture.mockRejectedValue(new Error("network disconnected"));
    mockedGetMyApplications.mockResolvedValue(apiApplicationsResult([confirmedApplication]));
    renderWithIntl(
      <PayPalCheckoutDialog payment={payment} onConfirmed={onConfirmed} onClose={vi.fn()} />,
    );

    await act(async () => {
      await (sdkState.buttonProps?.onApprove as (data: { orderId: string }) => Promise<void>)({
        orderId: payment.providerOrderId,
      });
    });

    expect(mockedGetMyApplications).toHaveBeenCalledWith("EN");
    expect(onConfirmed).toHaveBeenCalledWith(confirmedApplication);
    expect(screen.queryByText("PayPal payment could not be completed.")).toBeNull();
  });

  it("does not offer redirect after approval when capture remains uncertain", async () => {
    mockedCapture.mockRejectedValue(new Error("capture failed"));
    mockedGetMyApplications.mockResolvedValue(apiApplicationsResult([application]));
    renderWithIntl(
      <PayPalCheckoutDialog payment={payment} onConfirmed={vi.fn()} onClose={vi.fn()} />,
    );

    let captureError: unknown;
    await act(async () => {
      try {
        await (sdkState.buttonProps?.onApprove as (data: { orderId: string }) => Promise<void>)({
          orderId: payment.providerOrderId,
        });
      } catch (error) {
        captureError = error;
      }
    });

    expect(captureError).toEqual(new Error("capture failed"));
    expect(screen.queryByRole("link", { name: "Continue on the PayPal website" })).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "We could not verify the PayPal payment. Check My Applications before trying again.",
    );
  });

  it("offers redirect fallback when the popup cannot be opened before approval", async () => {
    renderWithIntl(
      <PayPalCheckoutDialog payment={payment} onConfirmed={vi.fn()} onClose={vi.fn()} />,
    );

    act(() => {
      (sdkState.buttonProps?.onError as (error: Error) => void)(new Error("popup blocked"));
    });

    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: "Continue on the PayPal website" }),
      ).toBeInTheDocument(),
    );
  });
});
