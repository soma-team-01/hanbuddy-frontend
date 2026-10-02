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
const proof = `granted.v3.${"A".repeat(43)}`;

function enablePolicy() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("GA_ENABLED", "true");
  vi.stubEnv("GA_MEASUREMENT_ID", "G-TEST");
}

function request(cookie = proof) {
  return new NextRequest("https://hanbuddy.kr/api/applications/me/11/analytics-consent", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://hanbuddy.kr",
      "x-analytics-request": "1",
      cookie: `${AUTH_COOKIES.accessToken}=access-token; __Host-hb_measurement_consent=${cookie}`,
    },
    body: JSON.stringify({ ignored: "drop" }),
  });
}

describe("POST /api/applications/me/[applicationId]/analytics-consent", () => {
  beforeEach(() => mockedPostBackend.mockReset());
  afterEach(() => vi.unstubAllEnvs());

  it("forwards an empty body with bearer and the granted v3 proof", async () => {
    enablePolicy();
    mockedPostBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { registered: true } },
      setCookies: ["private=discard"],
    });

    const response = await POST(request(), {
      params: Promise.resolve({ applicationId: "11" }),
    });

    expect(mockedPostBackend).toHaveBeenCalledExactlyOnceWith(
      "/applications/me/11/analytics-consent",
      {},
      {
        bearerToken: "access-token",
        cookieHeader: `__Host-hb_measurement_consent=${proof}`,
        origin: "https://hanbuddy.kr",
        analyticsRequest: true,
      },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    await expect(response.json()).resolves.toMatchObject({ result: { registered: true } });
  });

  it.each([
    [`granted.v2.${"A".repeat(43)}`, 400],
    [`denied.v3.${"A".repeat(43)}`, 400],
  ])("rejects an ineligible proof %s", async (cookie, status) => {
    enablePolicy();
    expect(
      (await POST(request(cookie), { params: Promise.resolve({ applicationId: "11" }) })).status,
    ).toBe(status);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  });
});
