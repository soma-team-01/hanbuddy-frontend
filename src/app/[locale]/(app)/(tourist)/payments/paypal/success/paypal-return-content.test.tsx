import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  authorizePayPalApplicationPayment,
  capturePayPalApplicationPayment,
  getMyApplications,
} from "@/lib/api/applications";
import {
  clearPayPalRedirectContext,
  readPayPalRedirectContext,
} from "@/lib/payments/paypal-redirect-context";
import { renderWithQueryClient } from "@/test/render-with-query-client";
import { PayPalReturnContent } from "./paypal-return-content";

const replace = vi.fn();

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ replace }),
}));

vi.mock("@/lib/api/applications", () => ({
  authorizePayPalApplicationPayment: vi.fn(),
  capturePayPalApplicationPayment: vi.fn(),
  getMyApplications: vi.fn(),
}));

vi.mock("@/lib/payments/paypal-redirect-context", () => ({
  clearPayPalRedirectContext: vi.fn(),
  readPayPalRedirectContext: vi.fn(),
  storePayPalRedirectContext: vi.fn(),
}));

const mockedCapture = vi.mocked(capturePayPalApplicationPayment);
const mockedGetMyApplications = vi.mocked(getMyApplications);
const mockedReadContext = vi.mocked(readPayPalRedirectContext);
const mockedClearContext = vi.mocked(clearPayPalRedirectContext);

describe("PayPalReturnContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedReadContext.mockReturnValue({ applicationId: "11", orderId: "ORDER-123" });
    mockedCapture.mockResolvedValue({
      status: "success",
      application: {
        applicationId: 11,
        status: "CONFIRMED",
      } as never,
    });
    mockedGetMyApplications.mockResolvedValue({ status: "success", applications: [] });
  });

  it("only reads server status after a previously submitted return is refreshed", async () => {
    mockedReadContext.mockReturnValue({
      applicationId: "11",
      orderId: "ORDER-123",
      paypalIntent: "AUTHORIZE",
      checkoutSubmitted: true,
    });
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [
        {
          applicationId: 11,
          status: "PENDING_APPROVAL",
          paymentStatus: "AUTHORIZED",
          paypalAuthorization: { state: "AUTHORIZED" },
        } as never,
      ],
    });
    renderWithQueryClient(<PayPalReturnContent token="ORDER-123" />);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/en/payments/success?applicationId=11"),
    );
    expect(authorizePayPalApplicationPayment).not.toHaveBeenCalled();
    expect(mockedCapture).not.toHaveBeenCalled();
  });

  it.each(["CONFIRMED", "PENDING_APPROVAL"] as const)(
    "captures %s once and moves to the common completion screen",
    async (status) => {
      mockedCapture.mockResolvedValue({
        status: "success",
        application: { applicationId: 11, status } as never,
      });
      renderWithQueryClient(<PayPalReturnContent token="ORDER-123" />);

      expect(screen.getByRole("status")).toHaveTextContent("Confirming your payment");
      await waitFor(() =>
        expect(mockedCapture).toHaveBeenCalledWith("11", { orderId: "ORDER-123" }, "EN"),
      );
      await waitFor(() =>
        expect(replace).toHaveBeenCalledWith("/en/payments/success?applicationId=11"),
      );
      expect(mockedClearContext).toHaveBeenCalledTimes(1);
    },
  );

  it("does not capture when the redirect context does not match", async () => {
    mockedReadContext.mockReturnValue(null);
    renderWithQueryClient(<PayPalReturnContent token="OTHER-ORDER" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't identify this PayPal payment",
    );
    expect(mockedCapture).not.toHaveBeenCalled();
  });

  it("uses authorize for a saved AUTHORIZE order and waits for server receipt", async () => {
    mockedReadContext.mockReturnValue({
      applicationId: "11",
      orderId: "ORDER-123",
      paypalIntent: "AUTHORIZE",
    });
    vi.mocked(authorizePayPalApplicationPayment).mockResolvedValue({
      status: "success",
      application: {
        applicationId: 11,
        status: "PENDING_APPROVAL",
        paymentStatus: "AUTHORIZED",
        paypalAuthorization: {
          state: "AUTHORIZED",
          authorizedAt: null,
          expiresAt: null,
          releasedAt: null,
        },
      } as never,
    });
    renderWithQueryClient(<PayPalReturnContent token="ORDER-123" />);
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/en/payments/success?applicationId=11"),
    );
    expect(authorizePayPalApplicationPayment).toHaveBeenCalledExactlyOnceWith(
      "11",
      { orderId: "ORDER-123" },
      "EN",
    );
    expect(mockedCapture).not.toHaveBeenCalled();
  });

  it("does not complete when capture succeeds without a confirmed application", async () => {
    mockedCapture.mockResolvedValue({
      status: "success",
      application: {
        applicationId: 11,
        status: "PENDING_PAYMENT",
      } as never,
    });
    mockedGetMyApplications.mockResolvedValue({
      status: "success",
      applications: [
        {
          applicationId: 11,
          status: "PENDING_PAYMENT",
        } as never,
      ],
    });

    renderWithQueryClient(<PayPalReturnContent token="ORDER-123" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We are checking the PayPal result. Check My Applications before attempting another payment.",
    );
    expect(mockedGetMyApplications).toHaveBeenCalledWith("EN");
    expect(replace).not.toHaveBeenCalled();
    expect(mockedClearContext).not.toHaveBeenCalled();
  });
});
