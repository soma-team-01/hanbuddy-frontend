import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cancelMyApplication,
  cancelPendingPayment,
  confirmApplicationPayment,
  continueApplicationPayment,
  createApplication,
  getApplicationConflicts,
  getMyApplications,
} from "./applications";

const application = {
  applicationId: 11,
  activityId: 42,
  activityScheduleId: 101,
  activityTitle: "Bukchon Hidden Gems",
  thumbnailImageUrl: "https://static.hanbuddy.com/activities/bukchon.webp",
  buddyName: "Jihoon Kim",
  guestCount: 2,
  specialRequest: "Vegetarian snacks, please.",
  startAt: "2026-07-20T10:00:00+09:00",
  endAt: "2026-07-20T10:00:00+09:00",
  price: 45000,
  totalPrice: 90000,
  currency: "KRW",
  status: "CONFIRMED",
  cancellationReason: null,
  cancellationDetail: null,
  holdExpiresAt: null,
  cancelledAt: null,
  createdAt: "2026-07-07T10:00:00Z",
};

const paymentReady = {
  application: { ...application, status: "PENDING_PAYMENT" },
  paymentId: 7,
  paypalOrderId: "5O190127TN364715T",
  approvalUrl: "https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T",
  paymentStatus: "CREATED",
  paymentAmount: 68.97,
  paymentCurrency: "USD",
  orderExpiresAt: "2026-07-14T13:00:00+09:00",
};

function createJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("application API client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("checks schedule conflicts through the internal API", async () => {
    const conflicts = {
      blocking: false,
      conflicts: [],
      sameDayWarnings: [
        {
          type: "OTHER_ACTIVITY_SAME_DAY",
          applicationId: 10,
          activityId: 41,
          activityScheduleId: 100,
          activityTitle: "Palace Walk",
          startAt: "2026-07-20T08:00:00+09:00",
          endAt: "2026-07-20T09:00:00+09:00",
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        createJsonResponse({ isSuccess: true, code: "200", message: "ok", result: conflicts }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getApplicationConflicts(101)).resolves.toEqual({
      status: "success",
      conflicts,
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/applications/conflicts?activityScheduleId=101", {
      credentials: "same-origin",
    });
  });

  it("creates an application and returns the PayPal payment info", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          isSuccess: true,
          code: "201",
          message: "created",
          result: paymentReady,
        },
        201,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createApplication({
        activityScheduleId: 101,
        guestCount: 2,
        specialRequest: "Vegetarian snacks, please.",
      }),
    ).resolves.toEqual({ status: "success", payment: paymentReady });

    expect(fetchMock).toHaveBeenCalledWith("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        activityScheduleId: 101,
        guestCount: 2,
        specialRequest: "Vegetarian snacks, please.",
      }),
      credentials: "same-origin",
    });
  });

  it("continues a pending payment through the internal API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        isSuccess: true,
        code: "200",
        message: "ok",
        result: paymentReady,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(continueApplicationPayment(11)).resolves.toEqual({
      status: "success",
      payment: paymentReady,
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/applications/me/11/payment/continue", {
      method: "POST",
      credentials: "same-origin",
    });
  });

  it("confirms an authorized payment through the internal API", async () => {
    const confirmed = { ...application, status: "CONFIRMED" };
    const confirmRequest = {
      paymentKey: "tviva20260809abcdef",
      orderId: "hanbuddy-1-550e8400-e29b-41d4-a716-446655440000",
      amount: 90000,
    };
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        isSuccess: true,
        code: "200",
        message: "ok",
        result: confirmed,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(confirmApplicationPayment(11, confirmRequest)).resolves.toEqual({
      status: "success",
      application: confirmed,
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/applications/me/11/payment/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(confirmRequest),
      credentials: "same-origin",
    });
  });

  it("loads my applications through the internal API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        isSuccess: true,
        code: "200",
        message: "ok",
        result: [application],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(getMyApplications()).resolves.toEqual({
      status: "success",
      applications: [application],
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/applications/me", {
      credentials: "same-origin",
    });
  });

  it("cancels my application through the internal API", async () => {
    const cancelled = {
      ...application,
      status: "CANCELLED",
      cancellationReason: "SCHEDULE_CONFLICT",
    };
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        isSuccess: true,
        code: "200",
        message: "ok",
        result: cancelled,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(cancelMyApplication(11, "SCHEDULE_CONFLICT")).resolves.toEqual({
      status: "success",
      application: cancelled,
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/applications/me/11/cancel", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancellationReason: "SCHEDULE_CONFLICT" }),
      credentials: "same-origin",
    });
  });

  it("returns structured backend metadata when application creation fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          isSuccess: false,
          code: "APPLICATION400_CAPACITY_EXCEEDED",
          message: "남은 자리가 부족합니다.",
        },
        400,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(createApplication({ activityScheduleId: 101, guestCount: 9 })).resolves.toEqual({
      status: "error",
      error: expect.objectContaining({
        code: "APPLICATION400_CAPACITY_EXCEEDED",
        status: 400,
        backendMessage: "남은 자리가 부족합니다.",
      }),
    });
  });

  it("cancels a pending payment through the internal API without a body", async () => {
    const cancelled = { ...application, status: "CANCELLED" };
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        isSuccess: true,
        code: "200",
        message: "ok",
        result: cancelled,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(cancelPendingPayment(11)).resolves.toEqual({
      status: "success",
      application: cancelled,
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/applications/me/11/payment/cancel", {
      method: "PATCH",
      credentials: "same-origin",
    });
  });

  it("returns structured backend metadata when payment confirmation fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          isSuccess: false,
          code: "PAYMENT400_ORDER",
          message: "요청한 주문번호가 신청의 결제 정보와 일치하지 않습니다.",
        },
        400,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      confirmApplicationPayment(11, {
        paymentKey: "tviva20260809abcdef",
        orderId: "WRONG_ORDER_ID",
        amount: 90000,
      }),
    ).resolves.toEqual({
      status: "error",
      error: expect.objectContaining({
        code: "PAYMENT400_ORDER",
        status: 400,
        backendMessage: "요청한 주문번호가 신청의 결제 정보와 일치하지 않습니다.",
      }),
    });
  });
});
