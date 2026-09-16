import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { postBackend } from "@/lib/auth/backend";
import { POST } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, postBackend: vi.fn() };
});

const mockedPostBackend = vi.mocked(postBackend);
const signature = "A".repeat(43);
const grantedProof = `granted.v1.123e4567-e89b-12d3-a456-426614174000.1700000000.1999999999.policy_1.${signature}`;

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

function request(action: string, cookie?: string) {
  return new NextRequest("https://app.hanbuddy.test/api/analytics/purchase-consent-proof", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://app.hanbuddy.test",
      "x-analytics-request": "1",
      ...(cookie ? { cookie: `__Host-hb_ga_consent=${cookie}; unrelated=secret` } : {}),
    },
    body: JSON.stringify({ action, ignored: "not-forwarded" }),
  });
}

describe("POST /api/analytics/purchase-consent-proof", () => {
  beforeEach(() => mockedPostBackend.mockReset());
  afterEach(() => vi.unstubAllEnvs());

  it("keeps the route disabled and avoids backend calls without a complete policy", async () => {
    const response = await POST(request("ACCEPT"));

    expect(response.status).toBe(503);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it("forwards only the projected ACCEPT action and safe analytics headers", async () => {
    enablePolicy();
    mockedPostBackend.mockResolvedValue({
      status: 200,
      payload: {
        isSuccess: true,
        code: "200",
        message: "ok",
        result: { proof: grantedProof, expiresAt: "2033-05-18T03:33:19Z" },
      },
      setCookies: ["unexpected=must-not-pass; Path=/"],
    });

    const response = await POST(request("ACCEPT", "denied"));

    expect(mockedPostBackend).toHaveBeenCalledWith(
      "/analytics/purchase-consent-proof",
      { action: "ACCEPT" },
      { origin: "https://app.hanbuddy.test", analyticsRequest: true },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(response.json()).resolves.toMatchObject({
      isSuccess: true,
      result: { proof: grantedProof, expiresAt: "2033-05-18T03:33:19Z" },
    });
  });

  it("forwards a valid granted cookie for RESTORE and rejects a missing proof locally", async () => {
    enablePolicy();
    mockedPostBackend.mockResolvedValue({
      status: 200,
      payload: {
        isSuccess: true,
        code: "200",
        message: "ok",
        result: { proof: grantedProof, expiresAt: "2033-05-18T03:33:19Z" },
      },
      setCookies: [],
    });

    await POST(request("RESTORE", grantedProof));
    expect(mockedPostBackend).toHaveBeenCalledWith(
      "/analytics/purchase-consent-proof",
      { action: "RESTORE" },
      {
        cookieHeader: `__Host-hb_ga_consent=${grantedProof}`,
        origin: "https://app.hanbuddy.test",
        analyticsRequest: true,
      },
    );

    mockedPostBackend.mockClear();
    const missing = await POST(request("RESTORE"));
    expect(missing.status).toBe(410);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it("rejects an untrusted origin before the backend call", async () => {
    enablePolicy();
    const unsafe = request("ACCEPT");
    unsafe.headers.set("origin", "https://evil.example");

    const response = await POST(unsafe);

    expect(response.status).toBe(403);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });

  it("maps a malformed successful-status error envelope to a fixed proxy error", async () => {
    enablePolicy();
    mockedPostBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: false, code: "UNEXPECTED", message: "do not reflect this" },
      setCookies: [],
    });

    const response = await POST(request("ACCEPT"));

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      isSuccess: false,
      code: "ANALYTICS_PROXY_ERROR",
      message: "Analytics request unavailable",
    });
  });
});
