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
const createRequest = {
  activityScheduleId: 101,
  guestCount: 2,
  specialRequest: "No pork",
  refundPolicyAgreed: true,
};

describe("POST /api/applications", () => {
  beforeEach(() => {
    mockedPostBackend.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("returns 401 without calling the backend when the access token cookie is missing", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/applications", {
        method: "POST",
        body: JSON.stringify(createRequest),
      }),
    );

    expect(response.status).toBe(401);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it("proxies the application creation with the access token as bearer", async () => {
    mockedPostBackend.mockResolvedValue({
      status: 201,
      payload: {
        isSuccess: true,
        code: "201",
        message: "created",
        result: { paymentId: 7, providerOrderId: "5O190127TN364715T" },
      },
      setCookies: [],
    });

    const response = await POST(
      new NextRequest("http://localhost/api/applications?paymentProvider=PAYPAL&language=EN", {
        method: "POST",
        body: JSON.stringify(createRequest),
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
    );

    expect(mockedPostBackend).toHaveBeenCalledWith(
      "/applications?paymentProvider=PAYPAL&language=EN",
      createRequest,
      {
        bearerToken: "access-token",
      },
    );
    expect(response.status).toBe(201);
  });

  it("rejects unsupported payment providers before proxying", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/applications?paymentProvider=CARD", {
        method: "POST",
        body: JSON.stringify(createRequest),
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
    );

    expect(response.status).toBe(400);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it("forwards eligible analytics capture context and binds the response to the current login", async () => {
    vi.stubEnv("GA_ENABLED", "true");
    vi.stubEnv("GA_DESTINATION_VERIFIED", "true");
    vi.stubEnv("GA_AUTOMATIC_COLLECTION_DISABLED", "true");
    vi.stubEnv("GA_MEASUREMENT_ID", "G-TEST123");
    vi.stubEnv("GA_ORIGIN", "https://app.hanbuddy.test");
    vi.stubEnv("GA_POLICY_VERSION", "policy_1");
    vi.stubEnv("GA_CONSENT_MAX_AGE_SECONDS", "3600");
    vi.stubEnv("GA_COOKIE_MAX_AGE_SECONDS", "3600");
    const proof = `granted.v1.123e4567-e89b-12d3-a456-426614174000.1700000000.1999999999.policy_1.${"A".repeat(43)}`;
    mockedPostBackend.mockResolvedValue({
      status: 201,
      payload: {
        isSuccess: true,
        code: "201",
        message: "created",
        result: { paymentId: 7, providerOrderId: "5O190127TN364715T" },
      },
      setCookies: [],
    });

    const response = await POST(
      new NextRequest("https://app.hanbuddy.test/api/applications", {
        method: "POST",
        body: JSON.stringify(createRequest),
        headers: {
          "content-type": "application/json",
          origin: "https://app.hanbuddy.test",
          "x-analytics-request": "1",
          cookie: `${AUTH_COOKIES.accessToken}=access-token; __Host-hb_ga_consent=${proof}; other=secret`,
        },
      }),
    );

    expect(mockedPostBackend).toHaveBeenCalledWith("/applications", createRequest, {
      bearerToken: "access-token",
      cookieHeader: `__Host-hb_ga_consent=${proof}`,
      origin: "https://app.hanbuddy.test",
      analyticsRequest: true,
    });
    expect(response.headers.get("x-analytics-context")).toBe(
      createHash("sha256").update("access-token", "utf8").digest("hex"),
    );
  });

  it("ignores invalid analytics context without blocking application creation", async () => {
    vi.stubEnv("GA_ENABLED", "true");
    vi.stubEnv("GA_DESTINATION_VERIFIED", "true");
    vi.stubEnv("GA_AUTOMATIC_COLLECTION_DISABLED", "true");
    vi.stubEnv("GA_MEASUREMENT_ID", "G-TEST123");
    vi.stubEnv("GA_ORIGIN", "https://app.hanbuddy.test");
    vi.stubEnv("GA_POLICY_VERSION", "policy_1");
    vi.stubEnv("GA_CONSENT_MAX_AGE_SECONDS", "3600");
    vi.stubEnv("GA_COOKIE_MAX_AGE_SECONDS", "3600");
    mockedPostBackend.mockResolvedValue({
      status: 201,
      payload: {
        isSuccess: true,
        code: "201",
        message: "created",
        result: { paymentId: 7, providerOrderId: "5O190127TN364715T" },
      },
      setCookies: [],
    });

    const response = await POST(
      new NextRequest("https://app.hanbuddy.test/api/applications", {
        method: "POST",
        body: JSON.stringify(createRequest),
        headers: {
          origin: "https://evil.example",
          "x-analytics-request": "1",
          cookie: `${AUTH_COOKIES.accessToken}=access-token; __Host-hb_ga_consent=pending.local`,
        },
      }),
    );

    expect(mockedPostBackend).toHaveBeenCalledWith("/applications", createRequest, {
      bearerToken: "access-token",
    });
    expect(response.status).toBe(201);
    expect(response.headers.get("x-analytics-context")).toBeNull();
  });

  it("does not expose an auth context when a 2xx backend payload reports failure", async () => {
    vi.stubEnv("GA_ENABLED", "true");
    vi.stubEnv("GA_DESTINATION_VERIFIED", "true");
    vi.stubEnv("GA_AUTOMATIC_COLLECTION_DISABLED", "true");
    vi.stubEnv("GA_MEASUREMENT_ID", "G-TEST123");
    vi.stubEnv("GA_ORIGIN", "https://app.hanbuddy.test");
    vi.stubEnv("GA_POLICY_VERSION", "policy_1");
    vi.stubEnv("GA_CONSENT_MAX_AGE_SECONDS", "3600");
    vi.stubEnv("GA_COOKIE_MAX_AGE_SECONDS", "3600");
    const proof = `granted.v1.123e4567-e89b-12d3-a456-426614174000.1700000000.1999999999.policy_1.${"A".repeat(43)}`;
    mockedPostBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: false, code: "APPLICATION_FAILED", message: "failed" },
      setCookies: [],
    });

    const response = await POST(
      new NextRequest("https://app.hanbuddy.test/api/applications", {
        method: "POST",
        body: JSON.stringify(createRequest),
        headers: {
          origin: "https://app.hanbuddy.test",
          "x-analytics-request": "1",
          cookie: `${AUTH_COOKIES.accessToken}=access-token; __Host-hb_ga_consent=${proof}`,
        },
      }),
    );

    expect(response.headers.get("x-analytics-context")).toBeNull();
  });
});
