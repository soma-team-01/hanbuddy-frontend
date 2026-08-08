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
const context = { params: Promise.resolve({ applicationId: "11" }) };

describe("POST /api/applications/me/[applicationId]/payment/continue", () => {
  beforeEach(() => {
    mockedPostBackend.mockReset();
  });

  it("returns 401 without calling the backend when the access token cookie is missing", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/applications/me/11/payment/continue", {
        method: "POST",
      }),
      context,
    );

    expect(response.status).toBe(401);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it("proxies the payment continue request with the access token as bearer", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      payload: {
        isSuccess: true,
        code: "200",
        message: "ok",
        result: { paymentId: 7, orderNumber: "hanbuddy-11-order", clientKey: "test_ck_client-key" },
      },
      setCookies: [],
    });

    const response = await POST(
      new NextRequest("http://localhost/api/applications/me/11/payment/continue", {
        method: "POST",
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      context,
    );

    expect(mockedPostBackend).toHaveBeenCalledWith(
      "/applications/me/11/payment/continue",
      undefined,
      { bearerToken: "access-token" },
    );
    expect(response.status).toBe(200);
  });

  it("rejects non-numeric application ids before proxying", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/applications/me/not-a-number/payment/continue", {
        method: "POST",
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      { params: Promise.resolve({ applicationId: "not-a-number" }) },
    );

    expect(response.status).toBe(400);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });
});
