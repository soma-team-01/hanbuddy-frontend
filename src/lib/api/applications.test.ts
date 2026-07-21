import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cancelMyApplication,
  captureApplicationPayment,
  continueApplicationPayment,
  createApplication,
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
  price: 45000,
  totalPrice: 90000,
  currency: "KRW",
  status: "CONFIRMED",
  cancellationReason: null,
  cancellationDetail: null,
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

  it("captures an approved payment through the internal API", async () => {
    const confirmed = { ...application, status: "CONFIRMED" };
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        isSuccess: true,
        code: "200",
        message: "ok",
        result: confirmed,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(captureApplicationPayment(11, "5O190127TN364715T")).resolves.toEqual({
      status: "success",
      application: confirmed,
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/applications/me/11/payment/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paypalOrderId: "5O190127TN364715T" }),
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

  it("returns structured backend metadata when payment capture fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse(
        {
          isSuccess: false,
          code: "PAYMENT400_ORDER",
          message: "요청한 PayPal order id가 신청의 결제 정보와 일치하지 않습니다.",
        },
        400,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(captureApplicationPayment(11, "WRONG_ORDER_ID")).resolves.toEqual({
      status: "error",
      error: expect.objectContaining({
        code: "PAYMENT400_ORDER",
        status: 400,
        backendMessage: "요청한 PayPal order id가 신청의 결제 정보와 일치하지 않습니다.",
      }),
    });
  });
});
