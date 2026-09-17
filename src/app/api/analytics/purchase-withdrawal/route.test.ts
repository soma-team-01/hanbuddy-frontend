import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { postBackend } from "@/lib/auth/backend";
import { POST } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, postBackend: vi.fn() };
});

const mockedPostBackend = vi.mocked(postBackend);
const deniedProof = `denied.v1.123e4567-e89b-12d3-a456-426614174000.1700000000.1999999999.policy_1.${"A".repeat(43)}`;

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

describe("POST /api/analytics/purchase-withdrawal", () => {
  beforeEach(() => mockedPostBackend.mockReset());
  afterEach(() => vi.unstubAllEnvs());

  it("uses only the explicit late denied proof as the backend cookie", async () => {
    enablePolicy();
    mockedPostBackend.mockResolvedValue({
      status: 200,
      payload: {
        isSuccess: true,
        code: "200",
        message: "ok",
        result: { withdrawalAcknowledged: true },
      },
      setCookies: [],
    });
    const response = await POST(
      new NextRequest("https://app.hanbuddy.test/api/analytics/purchase-withdrawal", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://app.hanbuddy.test",
          "x-analytics-request": "1",
          "x-analytics-proof": deniedProof,
          cookie: "__Host-hb_ga_consent=pending.123; session=secret",
        },
        body: "{}",
      }),
    );

    expect(mockedPostBackend).toHaveBeenCalledWith(
      "/analytics/purchase-withdrawal",
      {},
      {
        cookieHeader: `__Host-hb_ga_consent=${deniedProof}`,
        origin: "https://app.hanbuddy.test",
        analyticsRequest: true,
      },
    );
    expect(response.status).toBe(200);
  });

  it("rejects granted or malformed explicit proofs before the backend call", async () => {
    enablePolicy();
    const response = await POST(
      new NextRequest("https://app.hanbuddy.test/api/analytics/purchase-withdrawal", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://app.hanbuddy.test",
          "x-analytics-request": "1",
          "x-analytics-proof": deniedProof.replace("denied", "granted"),
        },
        body: "{}",
      }),
    );

    expect(response.status).toBe(400);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });
});
