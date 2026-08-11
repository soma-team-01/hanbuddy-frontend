import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import type { PaymentReadyResponse } from "@/types/application";
import { isTossUserCancel, requestTossPayment } from "./toss";

vi.mock("@tosspayments/tosspayments-sdk", () => ({
  ANONYMOUS: "ANONYMOUS",
  loadTossPayments: vi.fn(),
}));

const mockedLoadTossPayments = vi.mocked(loadTossPayments);
const requestPayment = vi.fn();

const paymentReady: PaymentReadyResponse = {
  application: {
    applicationId: 11,
    activityId: 42,
    activityScheduleId: 101,
    activityTitle: "Bukchon Hidden Gems",
    thumbnailImageUrl: null,
    buddyName: "Jihoon Kim",
    guestCount: 2,
    specialRequest: null,
    startAt: "2026-08-20T10:00:00+09:00",
    endAt: "2026-08-20T10:00:00+09:00",
    price: 45000,
    totalPrice: 90000,
    currency: "KRW",
    paymentAmount: null,
    paymentCurrency: null,
    status: "PENDING_PAYMENT",
    cancellationReason: null,
    cancellationDetail: null,
    holdExpiresAt: null,
    myReview: null,
    cancelledAt: null,
    createdAt: "2026-08-09T10:00:00Z",
  },
  paymentId: 7,
  orderNumber: "hanbuddy-11-order",
  clientKey: "test_ck_client-key",
  orderName: "Bukchon Hidden Gems",
  paymentStatus: "CREATED",
  paymentAmount: 90000,
  paymentCurrency: "KRW",
  orderExpiresAt: "2026-08-09T13:00:00+09:00",
};

describe("requestTossPayment", () => {
  beforeEach(() => {
    requestPayment.mockReset();
    requestPayment.mockResolvedValue(undefined);
    mockedLoadTossPayments.mockReset();
    mockedLoadTossPayments.mockResolvedValue({
      payment: () => ({ requestPayment }),
    } as unknown as Awaited<ReturnType<typeof loadTossPayments>>);
  });

  it("opens the domestic payment window for the Korean locale", async () => {
    await requestTossPayment(paymentReady, "ko");

    expect(mockedLoadTossPayments).toHaveBeenCalledWith("test_ck_client-key");
    expect(requestPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "CARD",
        amount: { currency: "KRW", value: 90000 },
        orderId: "hanbuddy-11-order",
        orderName: "Bukchon Hidden Gems",
        card: undefined,
      }),
    );
    const request = requestPayment.mock.calls[0][0];
    expect(request.successUrl).toContain("/ko/payments/success?applicationId=11");
    expect(request.failUrl).toContain("/ko/payments/fail?applicationId=11");
  });

  it("opens the multilingual international window for non-Korean locales", async () => {
    await requestTossPayment(paymentReady, "en");

    expect(requestPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        card: { useInternationalCardOnly: true, showEstimatedAmount: false },
      }),
    );
    const request = requestPayment.mock.calls[0][0];
    expect(request.successUrl).toContain("/en/payments/success?applicationId=11");
  });
});

describe("isTossUserCancel", () => {
  it("detects only the user-cancel error code", () => {
    expect(isTossUserCancel({ code: "PAY_PROCESS_CANCELED" })).toBe(true);
    expect(isTossUserCancel({ code: "INVALID_CARD" })).toBe(false);
    expect(isTossUserCancel(new Error("boom"))).toBe(false);
  });
});
