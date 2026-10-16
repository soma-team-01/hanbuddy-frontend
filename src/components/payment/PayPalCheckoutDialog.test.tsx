import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authorizePayPalApplicationPayment,
  capturePayPalApplicationPayment,
  getMyApplications,
} from "@/lib/api/applications";
import { renderWithIntl } from "@/test/render-with-intl";
import type { ApplicationResponse, PaymentReadyResponse } from "@/types/application";
import { PayPalCheckoutButton, PayPalCheckoutDialog } from "./PayPalCheckoutDialog";

const sdkState = vi.hoisted(() => ({
  loadingStatus: "resolved",
  isHydrated: true,
  sessionOptions: null as Record<string, unknown> | null,
  createSession: vi.fn(),
  start: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock("@paypal/react-paypal-js/sdk-v6", () => ({
  INSTANCE_LOADING_STATE: {
    PENDING: "pending",
    REJECTED: "rejected",
    RESOLVED: "resolved",
  },
  PayPalProvider: ({ children }: { children: React.ReactNode }) => children,
  usePayPal: () => ({
    isHydrated: sdkState.isHydrated,
    loadingStatus: sdkState.loadingStatus,
    sdkInstance: sdkState.loadingStatus === "resolved" ? stableSdkInstance : null,
  }),
}));

const stableSdkInstance = { createPayPalOneTimePaymentSession: sdkState.createSession };

vi.mock("@/lib/api/applications", () => ({
  authorizePayPalApplicationPayment: vi.fn(),
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
  it("keeps the open session across parent rerenders and uses the latest cancel callback", async () => {
    sdkState.start.mockImplementation(() => new Promise(() => {}));
    const originalCancel = vi.fn();
    const latestCancel = vi.fn();
    const { rerender, unmount } = renderWithIntl(
      <PayPalCheckoutButton
        payment={payment}
        autoStart
        onConfirmed={vi.fn()}
        onCancel={originalCancel}
      />,
    );
    await waitFor(() => expect(sdkState.start).toHaveBeenCalledTimes(1));
    const sessionOptions = sdkState.sessionOptions!;
    rerender(
      <PayPalCheckoutButton
        payment={{ ...payment }}
        autoStart
        onConfirmed={vi.fn()}
        onCancel={latestCancel}
      />,
    );
    expect(sdkState.destroy).not.toHaveBeenCalled();
    expect(sdkState.createSession).toHaveBeenCalledTimes(1);
    expect(sdkState.start).toHaveBeenCalledTimes(1);
    act(() => (sessionOptions.onCancel as () => void)());
    expect(originalCancel).not.toHaveBeenCalled();
    expect(latestCancel).toHaveBeenCalledTimes(1);
    unmount();
    expect(sdkState.destroy).toHaveBeenCalledTimes(1);
    act(() => (sessionOptions.onCancel as () => void)());
    expect(latestCancel).toHaveBeenCalledTimes(1);
  });

  it("keeps the session during approval and notifies the latest parent callback once", async () => {
    let completeCapture!: (value: ReturnType<typeof apiApplicationResult>) => void;
    mockedCapture.mockImplementation(
      () =>
        new Promise((resolve) => {
          completeCapture = resolve;
        }),
    );
    const originalConfirmed = vi.fn();
    const latestConfirmed = vi.fn();
    const { rerender } = renderWithIntl(
      <PayPalCheckoutButton payment={payment} onConfirmed={originalConfirmed} />,
    );
    const approve = sdkState.sessionOptions!.onApprove as (data: {
      orderId: string;
    }) => Promise<void>;
    let approval!: Promise<void>;
    act(() => {
      approval = approve({ orderId: payment.providerOrderId });
    });
    rerender(<PayPalCheckoutButton payment={payment} onConfirmed={latestConfirmed} />);
    expect(sdkState.destroy).not.toHaveBeenCalled();
    const confirmed = { ...application, status: "PENDING_APPROVAL" as const };
    await act(async () => {
      completeCapture(apiApplicationResult(confirmed));
      await approval;
    });
    expect(mockedCapture).toHaveBeenCalledTimes(1);
    expect(originalConfirmed).not.toHaveBeenCalled();
    expect(latestConfirmed).toHaveBeenCalledExactlyOnceWith(confirmed);
    expect(sdkState.destroy).not.toHaveBeenCalled();
  });

  it("replaces the session and auto-starts once for a different order", async () => {
    const { rerender } = renderWithIntl(
      <PayPalCheckoutButton payment={payment} autoStart onConfirmed={vi.fn()} />,
    );
    await waitFor(() => expect(sdkState.start).toHaveBeenCalledTimes(1));
    rerender(
      <PayPalCheckoutButton
        payment={{ ...payment, providerOrderId: "NEW-ORDER" }}
        autoStart
        onConfirmed={vi.fn()}
      />,
    );
    await waitFor(() => expect(sdkState.start).toHaveBeenCalledTimes(2));
    expect(sdkState.destroy).toHaveBeenCalledTimes(1);
    expect(sdkState.sessionOptions).toMatchObject({ orderId: "NEW-ORDER" });
  });

  it("starts only the live session in Strict Mode", async () => {
    renderWithIntl(<PayPalCheckoutButton payment={payment} autoStart onConfirmed={vi.fn()} />, {
      reactStrictMode: true,
    });
    await waitFor(() => expect(sdkState.start).toHaveBeenCalledTimes(1));
    expect(sdkState.createSession).toHaveBeenCalledTimes(2);
    expect(sdkState.destroy).toHaveBeenCalledTimes(1);
  });
  it("submits AUTHORIZE once and reports receipt only after the backend authorizes", async () => {
    const received = {
      ...application,
      status: "PENDING_APPROVAL",
      paymentStatus: "AUTHORIZED",
      paypalAuthorization: {
        state: "AUTHORIZED",
        authorizedAt: null,
        expiresAt: null,
        releasedAt: null,
      },
    } as ApplicationResponse;
    vi.mocked(authorizePayPalApplicationPayment).mockResolvedValue(apiApplicationResult(received));
    const onConfirmed = vi.fn();
    renderWithIntl(
      <PayPalCheckoutDialog
        payment={{ ...payment, paypalIntent: "AUTHORIZE" }}
        onConfirmed={onConfirmed}
        onClose={vi.fn()}
      />,
    );
    const approve = sdkState.sessionOptions!.onApprove as (data: {
      orderId: string;
    }) => Promise<void>;
    await act(async () => {
      await Promise.all([
        approve({ orderId: payment.providerOrderId }),
        approve({ orderId: payment.providerOrderId }),
      ]);
    });
    expect(authorizePayPalApplicationPayment).toHaveBeenCalledTimes(1);
    expect(mockedCapture).not.toHaveBeenCalled();
    expect(onConfirmed).toHaveBeenCalledWith(received);
  });
  beforeEach(() => {
    sdkState.loadingStatus = "resolved";
    sdkState.isHydrated = true;
    sdkState.sessionOptions = null;
    sdkState.start.mockReset().mockResolvedValue(undefined);
    sdkState.destroy.mockReset();
    sdkState.createSession.mockReset().mockImplementation((options: Record<string, unknown>) => {
      sdkState.sessionOptions = options;
      return {
        start: sdkState.start,
        destroy: sdkState.destroy,
        cancel: vi.fn(),
      };
    });
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID", "sandbox-client-id");
    vi.stubEnv("NEXT_PUBLIC_PAYPAL_ENVIRONMENT", "sandbox");
    mockedCapture.mockReset();
    vi.mocked(authorizePayPalApplicationPayment).mockReset();
    mockedGetMyApplications.mockReset();
  });

  it("creates one SDK session with the backend order without showing redirect by default", () => {
    renderWithIntl(
      <PayPalCheckoutDialog payment={payment} onConfirmed={vi.fn()} onClose={vi.fn()} />,
    );

    expect(screen.getByTestId("paypal-sdk-button")).toBeInTheDocument();
    expect(sdkState.createSession).toHaveBeenCalledTimes(1);
    expect(sdkState.sessionOptions).toMatchObject({
      orderId: payment.providerOrderId,
    });
    expect(screen.queryByRole("link", { name: "Continue on the PayPal website" })).toBeNull();
  });

  it("renders the SDK action directly without an intermediate HanBuddy dialog", () => {
    renderWithIntl(
      <PayPalCheckoutButton payment={payment} onConfirmed={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(screen.getByTestId("paypal-sdk-button")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows an unavailable message instead of throwing for invalid payment data", () => {
    renderWithIntl(
      <PayPalCheckoutDialog
        payment={{ ...payment, providerOrderId: "" }}
        onConfirmed={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("PayPal is temporarily unavailable.");
    expect(sdkState.createSession).not.toHaveBeenCalled();
  });

  it("formats the approval amount using the backend payment currency", () => {
    renderWithIntl(
      <PayPalCheckoutDialog
        payment={{ ...payment, paymentAmount: 28.5, paymentCurrency: "EUR" }}
        onConfirmed={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/€28\.50/)).toBeInTheDocument();
  });

  it("opens the PayPal modal automatically without rendering an intermediate button", async () => {
    renderWithIntl(
      <PayPalCheckoutButton payment={payment} autoStart onConfirmed={vi.fn()} onCancel={vi.fn()} />,
    );

    await waitFor(() => expect(sdkState.start).toHaveBeenCalledWith({ presentationMode: "modal" }));
    expect(screen.queryByTestId("paypal-sdk-button")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("tries the modal first and falls back to a popup for a recoverable presentation error", async () => {
    sdkState.start
      .mockRejectedValueOnce(Object.assign(new Error("modal unavailable"), { isRecoverable: true }))
      .mockResolvedValueOnce(undefined);
    renderWithIntl(
      <PayPalCheckoutDialog payment={payment} onConfirmed={vi.fn()} onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByTestId("paypal-sdk-button"));

    await waitFor(() => expect(sdkState.start).toHaveBeenCalledTimes(2));
    expect(sdkState.start).toHaveBeenNthCalledWith(1, { presentationMode: "modal" });
    expect(sdkState.start).toHaveBeenNthCalledWith(2, { presentationMode: "popup" });
    expect(screen.queryByRole("link", { name: "Continue on the PayPal website" })).toBeNull();
  });

  it("shows approvalUrl only when the SDK cannot load", () => {
    sdkState.loadingStatus = "rejected";
    renderWithIntl(
      <PayPalCheckoutDialog payment={payment} onConfirmed={vi.fn()} onClose={vi.fn()} />,
    );

    expect(screen.queryByTestId("paypal-sdk-button")).toBeNull();
    expect(screen.getByRole("link", { name: "Continue on the PayPal website" })).toHaveAttribute(
      "href",
      payment.approvalUrl,
    );
  });

  it.each(["CONFIRMED", "PENDING_APPROVAL"] as const)(
    "accepts captured %s without charging again",
    async (status) => {
      const onConfirmed = vi.fn();
      const confirmedApplication = { ...application, status };
      mockedCapture.mockResolvedValue(apiApplicationResult(confirmedApplication));
      renderWithIntl(
        <PayPalCheckoutDialog payment={payment} onConfirmed={onConfirmed} onClose={vi.fn()} />,
      );

      await act(async () => {
        await (sdkState.sessionOptions?.onApprove as (data: { orderId: string }) => Promise<void>)({
          orderId: payment.providerOrderId,
        });
      });

      expect(mockedCapture).toHaveBeenCalledWith(
        application.applicationId,
        { orderId: payment.providerOrderId },
        "EN",
      );
      expect(onConfirmed).toHaveBeenCalledWith(confirmedApplication);
    },
  );

  it("rechecks applications after a lost capture response before reporting failure", async () => {
    const onConfirmed = vi.fn();
    const confirmedApplication = { ...application, status: "CONFIRMED" as const };
    mockedCapture.mockRejectedValue(new Error("network disconnected"));
    mockedGetMyApplications.mockResolvedValue(apiApplicationsResult([confirmedApplication]));
    renderWithIntl(
      <PayPalCheckoutDialog payment={payment} onConfirmed={onConfirmed} onClose={vi.fn()} />,
    );

    await act(async () => {
      await (sdkState.sessionOptions?.onApprove as (data: { orderId: string }) => Promise<void>)({
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
        await (sdkState.sessionOptions?.onApprove as (data: { orderId: string }) => Promise<void>)({
          orderId: payment.providerOrderId,
        });
      } catch (error) {
        captureError = error;
      }
    });

    expect(captureError).toEqual(new Error("capture failed"));
    expect(screen.queryByRole("link", { name: "Continue on the PayPal website" })).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "We are checking the PayPal result. Check My Applications before attempting another payment.",
    );
  });

  it("offers redirect fallback when neither modal nor popup can be opened", async () => {
    sdkState.start.mockRejectedValue(
      Object.assign(new Error("presentation unavailable"), { isRecoverable: true }),
    );
    renderWithIntl(
      <PayPalCheckoutDialog payment={payment} onConfirmed={vi.fn()} onClose={vi.fn()} />,
    );

    fireEvent.click(screen.getByTestId("paypal-sdk-button"));

    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: "Continue on the PayPal website" }),
      ).toBeInTheDocument(),
    );
    expect(sdkState.start).toHaveBeenNthCalledWith(1, { presentationMode: "modal" });
    expect(sdkState.start).toHaveBeenNthCalledWith(2, { presentationMode: "popup" });
  });
});
