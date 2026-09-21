import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { postBackend } from "@/lib/auth/backend";
import { POST } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, postBackend: vi.fn() };
});

const mockedPostBackend = vi.mocked(postBackend);
const deniedProof = `denied.v3.${"A".repeat(43)}`;

function enablePolicy() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("GA_ENABLED", "true");
  vi.stubEnv("GA_MEASUREMENT_ID", "G-TEST");
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
      new NextRequest("https://hanbuddy.kr/api/analytics/purchase-withdrawal", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://hanbuddy.kr",
          "x-analytics-request": "1",
          "x-analytics-proof": deniedProof,
          cookie: "__Host-hb_measurement_consent=pending.123; session=secret",
        },
        body: "{}",
      }),
    );

    expect(mockedPostBackend).toHaveBeenCalledWith(
      "/analytics/purchase-withdrawal",
      {},
      {
        cookieHeader: `__Host-hb_measurement_consent=${deniedProof}`,
        origin: "https://hanbuddy.kr",
        analyticsRequest: true,
      },
    );
    expect(response.status).toBe(200);
  });

  it("rejects granted or malformed explicit proofs before the backend call", async () => {
    enablePolicy();
    const response = await POST(
      new NextRequest("https://hanbuddy.kr/api/analytics/purchase-withdrawal", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://hanbuddy.kr",
          "x-analytics-request": "1",
          "x-analytics-proof": deniedProof.replace("denied", "granted"),
        },
        body: "{}",
      }),
    );

    expect(response.status).toBe(403);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });
});

it.each(["off", "missing-id"])(
  "allows denied-ID withdrawal with %s collection settings",
  async (mode) => {
    enablePolicy();
    mockedPostBackend.mockReset();
    if (mode === "off") vi.stubEnv("GA_ENABLED", "false");
    else vi.stubEnv("GA_MEASUREMENT_ID", undefined);
    mockedPostBackend.mockResolvedValue({
      status: 200,
      payload: {
        isSuccess: true,
        code: "200",
        message: "ok",
        result: { withdrawalAcknowledged: true },
      },
      setCookies: ["must-not-pass=1"],
    });
    const response = await POST(
      new NextRequest("https://hanbuddy.kr/api/analytics/purchase-withdrawal", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://hanbuddy.kr",
          "x-analytics-request": "1",
          "x-analytics-proof": deniedProof,
        },
        body: "{}",
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mockedPostBackend).toHaveBeenCalledTimes(1);
    vi.unstubAllEnvs();
  },
);
it.each(["denied.v1.legacy", `denied.v3.${"A".repeat(42)}B`])(
  "returns 410 for invalid withdrawal: %s",
  async (proof) => {
    enablePolicy();
    mockedPostBackend.mockReset();
    const response = await POST(
      new NextRequest("https://hanbuddy.kr/api/analytics/purchase-withdrawal", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "https://hanbuddy.kr",
          "x-analytics-request": "1",
          "x-analytics-proof": proof,
        },
        body: "{}",
      }),
    );
    expect(response.status).toBe(410);
    expect(mockedPostBackend).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  },
);
