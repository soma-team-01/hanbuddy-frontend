import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { postBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { POST } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, postBackend: vi.fn() };
});

const mockedPostBackend = vi.mocked(postBackend);
const confirmRequest = {
  paymentKey: "tviva20260809abcdef",
  orderId: "hanbuddy-1-550e8400-e29b-41d4-a716-446655440000",
  amount: 100000,
};
const context = { params: Promise.resolve({ applicationId: "11" }) };

describe("POST /api/applications/me/[applicationId]/payment/confirm", () => {
  beforeEach(() => {
    mockedPostBackend.mockReset();
  });

  it("returns 401 without calling the backend when the access token cookie is missing", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/applications/me/11/payment/confirm", {
        method: "POST",
        body: JSON.stringify(confirmRequest),
      }),
      context,
    );

    expect(response.status).toBe(401);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it("proxies the payment confirmation with the access token as bearer", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      payload: {
        isSuccess: true,
        code: "200",
        message: "ok",
        result: { applicationId: 11, status: "CONFIRMED" },
      },
      setCookies: [],
    });

    const response = await POST(
      new NextRequest("http://localhost/api/applications/me/11/payment/confirm", {
        method: "POST",
        body: JSON.stringify(confirmRequest),
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      context,
    );

    expect(mockedPostBackend).toHaveBeenCalledWith(
      "/applications/me/11/payment/confirm",
      confirmRequest,
      { bearerToken: "access-token" },
    );
    expect(response.status).toBe(200);
  });

  it("rejects non-numeric application ids before proxying", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/applications/me/not-a-number/payment/confirm", {
        method: "POST",
        body: JSON.stringify(confirmRequest),
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      { params: Promise.resolve({ applicationId: "not-a-number" }) },
    );

    expect(response.status).toBe(400);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it("rejects an unreadable request body before proxying", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/applications/me/11/payment/confirm", {
        method: "POST",
        body: "not-json",
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      context,
    );

    expect(response.status).toBe(400);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it.each([
    ["missing paymentKey", { ...confirmRequest, paymentKey: undefined }],
    ["blank paymentKey", { ...confirmRequest, paymentKey: "   " }],
    ["missing orderId", { ...confirmRequest, orderId: undefined }],
    ["blank orderId", { ...confirmRequest, orderId: "" }],
    ["missing amount", { ...confirmRequest, amount: undefined }],
    ["non-numeric amount", { ...confirmRequest, amount: "100000" }],
    ["non-positive amount", { ...confirmRequest, amount: 0 }],
    ["non-integer amount", { ...confirmRequest, amount: 100.5 }],
  ])("rejects a request with %s before proxying", async (_case, body) => {
    const response = await POST(
      new NextRequest("http://localhost/api/applications/me/11/payment/confirm", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      context,
    );

    expect(response.status).toBe(400);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });
});
