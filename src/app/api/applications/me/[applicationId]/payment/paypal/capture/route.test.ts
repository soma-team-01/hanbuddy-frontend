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

describe("POST /api/applications/me/[applicationId]/payment/paypal/capture", () => {
  beforeEach(() => {
    mockedPostBackend.mockReset();
  });

  it("proxies a valid PayPal capture request", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { status: "CONFIRMED" } },
      setCookies: [],
    });

    const response = await POST(
      new NextRequest(
        "http://localhost/api/applications/me/11/payment/paypal/capture?language=EN",
        {
          method: "POST",
          body: JSON.stringify({ orderId: " 5O190127TN364715T " }),
          headers: {
            "Content-Type": "application/json",
            cookie: `${AUTH_COOKIES.accessToken}=access-token`,
          },
        },
      ),
      context,
    );

    expect(mockedPostBackend).toHaveBeenCalledWith(
      "/applications/me/11/payment/paypal/capture?language=EN",
      { orderId: "5O190127TN364715T" },
      { bearerToken: "access-token" },
    );
    expect(response.status).toBe(200);
  });

  it("rejects a missing order id before proxying", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/applications/me/11/payment/paypal/capture", {
        method: "POST",
        body: JSON.stringify({ orderId: " " }),
        headers: {
          "Content-Type": "application/json",
          cookie: `${AUTH_COOKIES.accessToken}=access-token`,
        },
      }),
      context,
    );

    expect(response.status).toBe(400);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });
});
