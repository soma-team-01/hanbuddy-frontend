import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { LOCALES } from "@/i18n/routing";
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
  paymentProvider: "TOSS",
  paymentAttemptId: 12,
  providerOrderId: "hanbuddy-11-order",
  approvalUrl: null,
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

  it.each(LOCALES)("opens the same domestic payment window for %s", async (locale) => {
    await requestTossPayment(paymentReady, locale);

    expect(mockedLoadTossPayments).toHaveBeenCalledWith("test_ck_client-key");
    expect(requestPayment).toHaveBeenCalledExactlyOnceWith({
      method: "CARD",
      amount: { currency: "KRW", value: 90000 },
      orderId: "hanbuddy-11-order",
      orderName: "Bukchon Hidden Gems",
      successUrl: `${window.location.origin}/${locale}/payments/success?applicationId=11`,
      failUrl: `${window.location.origin}/${locale}/payments/fail?applicationId=11`,
    });
    expect(requestPayment.mock.calls[0][0]).not.toHaveProperty("card");
  });

  it("rejects payment data created for another provider", async () => {
    await expect(
      requestTossPayment({ ...paymentReady, paymentProvider: "PAYPAL", clientKey: null }, "en"),
    ).rejects.toThrow("토스 결제 준비 정보가 올바르지 않습니다.");
    expect(mockedLoadTossPayments).not.toHaveBeenCalled();
  });
});

describe("isTossUserCancel", () => {
  it("detects only the user-cancel error code", () => {
    expect(isTossUserCancel({ code: "PAY_PROCESS_CANCELED" })).toBe(true);
    expect(isTossUserCancel({ code: "INVALID_CARD" })).toBe(false);
    expect(isTossUserCancel(new Error("boom"))).toBe(false);
  });
});
