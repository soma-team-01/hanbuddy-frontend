import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { putBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { PUT } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, putBackend: vi.fn() };
});

const mockedPutBackend = vi.mocked(putBackend);
const proof = `granted.v1.123e4567-e89b-12d3-a456-426614174000.1700000000.1999999999.policy_1.${"A".repeat(43)}`;

function enablePolicy() {
  vi.stubEnv("GA_ENABLED", "true");
  vi.stubEnv("GA_DESTINATION_VERIFIED", "true");
  vi.stubEnv("GA_AUTOMATIC_COLLECTION_DISABLED", "true");
  vi.stubEnv("GA_MEASUREMENT_ID", "G-TEST123");
  vi.stubEnv("GA_ORIGIN", "https://app.hanbuddy.test");
  vi.stubEnv("GA_POLICY_VERSION", "policy_1");
  vi.stubEnv("GA_CONSENT_MAX_AGE_SECONDS", "3600");
  vi.stubEnv("GA_COOKIE_MAX_AGE_SECONDS", "3600");
}

function linkRequest(context: string) {
  return new NextRequest("https://app.hanbuddy.test/api/applications/me/11/analytics-link", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      origin: "https://app.hanbuddy.test",
      "x-analytics-request": "1",
      "x-analytics-context": context,
      cookie: `${AUTH_COOKIES.accessToken}=access-token; __Host-hb_ga_consent=${proof}; other=secret`,
    },
    body: JSON.stringify({ clientId: "12345.67890", sessionId: "123456", ignored: "drop" }),
  });
}

describe("PUT /api/applications/me/[applicationId]/analytics-link", () => {
  beforeEach(() => mockedPutBackend.mockReset());
  afterEach(() => vi.unstubAllEnvs());

  it("forwards projected identifiers when the auth context matches", async () => {
    enablePolicy();
    mockedPutBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { linked: true } },
      setCookies: [],
    });
    const context = createHash("sha256").update("access-token", "utf8").digest("hex");

    const response = await PUT(linkRequest(context), {
      params: Promise.resolve({ applicationId: "11" }),
    });

    expect(mockedPutBackend).toHaveBeenCalledWith(
      "/applications/me/11/analytics-link",
      { clientId: "12345.67890", sessionId: "123456" },
      {
        bearerToken: "access-token",
        cookieHeader: `__Host-hb_ga_consent=${proof}`,
        origin: "https://app.hanbuddy.test",
        analyticsRequest: true,
      },
    );
    expect(response.status).toBe(200);
  });

  it("rejects a stale auth context without calling the backend", async () => {
    enablePolicy();
    const stale = createHash("sha256").update("old-token", "utf8").digest("hex");

    const response = await PUT(linkRequest(stale), {
      params: Promise.resolve({ applicationId: "11" }),
    });

    expect(response.status).toBe(409);
    expect(mockedPutBackend).not.toHaveBeenCalled();
  });

  it("rejects session identifiers outside the backend positive-long contract", async () => {
    enablePolicy();
    const context = createHash("sha256").update("access-token", "utf8").digest("hex");
    const request = linkRequest(context);
    const body = await request.json();
    body.sessionId = "99999999999999999999";

    const response = await PUT(
      new NextRequest(request.url, {
        method: "PUT",
        headers: request.headers,
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ applicationId: "11" }) },
    );

    expect(response.status).toBe(400);
    expect(mockedPutBackend).not.toHaveBeenCalled();
  });
});

it("preserves terminal outbox 409 and safe code without reflecting backend details or cookies", async () => {
  enablePolicy();
  mockedPutBackend.mockReset();
  mockedPutBackend.mockResolvedValue({
    status: 409,
    payload: {
      isSuccess: false,
      code: "ANALYTICS_LINK_CONFLICT",
      message: "private synthetic backend diagnostic",
    },
    setCookies: ["unrelated=synthetic; Path=/"],
  });
  try {
    const context = createHash("sha256").update("access-token", "utf8").digest("hex");
    const response = await PUT(linkRequest(context), {
      params: Promise.resolve({ applicationId: "11" }),
    });
    expect(response.status).toBe(409);
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(response.json()).resolves.toEqual({
      isSuccess: false,
      code: "ANALYTICS_LINK_CONFLICT",
      message: "Analytics request unavailable",
    });
    expect(mockedPutBackend).toHaveBeenCalledTimes(1);
  } finally {
    vi.unstubAllEnvs();
  }
});
