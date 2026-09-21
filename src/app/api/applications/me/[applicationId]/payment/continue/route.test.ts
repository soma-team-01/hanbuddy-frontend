import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  afterEach(() => vi.unstubAllEnvs());

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
      new NextRequest(
        "http://localhost/api/applications/me/11/payment/continue?paymentProvider=PAYPAL&language=EN",
        {
          method: "POST",
          headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
        },
      ),
      context,
    );

    expect(mockedPostBackend).toHaveBeenCalledWith(
      "/applications/me/11/payment/continue?paymentProvider=PAYPAL&language=EN",
      undefined,
      { bearerToken: "access-token" },
    );
    expect(response.status).toBe(200);
  });

  it("rejects unsupported payment providers before proxying", async () => {
    const response = await POST(
      new NextRequest(
        "http://localhost/api/applications/me/11/payment/continue?paymentProvider=CARD",
        {
          method: "POST",
          headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
        },
      ),
      context,
    );

    expect(response.status).toBe(400);
    expect(mockedPostBackend).not.toHaveBeenCalled();
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

  it("forwards eligible analytics capture context before continuing payment", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("GA_ENABLED", "true");
    vi.stubEnv("GA_MEASUREMENT_ID", "G-TEST");

    const proof = `granted.v3.${"A".repeat(43)}`;
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
      new NextRequest("https://hanbuddy.kr/api/applications/me/11/payment/continue", {
        method: "POST",
        headers: {
          origin: "https://hanbuddy.kr",
          "x-analytics-request": "1",
          cookie: `${AUTH_COOKIES.accessToken}=access-token; __Host-hb_measurement_consent=${proof}; other=secret`,
        },
      }),
      context,
    );

    expect(mockedPostBackend).toHaveBeenCalledWith(
      "/applications/me/11/payment/continue",
      undefined,
      {
        bearerToken: "access-token",
        cookieHeader: `__Host-hb_measurement_consent=${proof}`,
        origin: "https://hanbuddy.kr",
        analyticsRequest: true,
      },
    );
    expect(response.headers.get("x-analytics-context")).toBe(
      createHash("sha256").update("access-token", "utf8").digest("hex"),
    );
  });
});
