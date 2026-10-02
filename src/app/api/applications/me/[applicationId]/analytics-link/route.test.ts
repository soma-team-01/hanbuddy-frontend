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
const proof = `granted.v3.${"A".repeat(43)}`;

function enablePolicy() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("GA_ENABLED", "true");
  vi.stubEnv("GA_MEASUREMENT_ID", "G-TEST");
}

function enableMeta() {
  vi.stubEnv("META_PIXEL_ENABLED", "true");
  vi.stubEnv("META_PIXEL_ID", "123456789012345");
}

function linkRequest(context: string, body: Record<string, unknown> = {}) {
  return new NextRequest("https://hanbuddy.kr/api/applications/me/11/analytics-link", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      origin: "https://hanbuddy.kr",
      "x-analytics-request": "1",
      "x-analytics-context": context,
      cookie: `${AUTH_COOKIES.accessToken}=access-token; __Host-hb_measurement_consent=${proof}; other=secret`,
    },
    body: JSON.stringify({
      clientId: "12345.67890",
      sessionId: "123456",
      ignored: "drop",
      ...body,
    }),
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
        cookieHeader: `__Host-hb_measurement_consent=${proof}`,
        origin: "https://hanbuddy.kr",
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

  it("accepts any positive 1-19 digit session identifier", async () => {
    enablePolicy();
    const context = createHash("sha256").update("access-token", "utf8").digest("hex");
    mockedPutBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { linked: true } },
      setCookies: [],
    });

    const response = await PUT(linkRequest(context, { sessionId: "9999999999999999999" }), {
      params: Promise.resolve({ applicationId: "11" }),
    });

    expect(response.status).toBe(200);
    expect(mockedPutBackend.mock.calls[0][1]).toMatchObject({
      sessionId: "9999999999999999999",
    });
  });

  it.each(["0", "01", "10000000000000000000"])(
    "rejects session identifier outside the positive 1-19 digit contract: %s",
    async (sessionId) => {
      enablePolicy();
      const context = createHash("sha256").update("access-token", "utf8").digest("hex");

      const response = await PUT(linkRequest(context, { sessionId }), {
        params: Promise.resolve({ applicationId: "11" }),
      });

      expect(response.status).toBe(400);
      expect(mockedPutBackend).not.toHaveBeenCalled();
    },
  );

  it("projects allowlisted Meta attribution only with a same-origin query-free HTTPS URL", async () => {
    enablePolicy();
    enableMeta();
    mockedPutBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { linked: true } },
      setCookies: [],
    });
    const context = createHash("sha256").update("access-token", "utf8").digest("hex");
    const fbp = "fb.1.1720000000000.123456789";
    const fbc = "fb.1.1720000000000.AbCd_12-X";

    const response = await PUT(
      linkRequest(context, {
        fbp,
        fbc,
        eventSourceUrl: "https://hanbuddy.kr/activities/detail",
      }),
      { params: Promise.resolve({ applicationId: "11" }) },
    );

    expect(response.status).toBe(200);
    expect(mockedPutBackend.mock.calls[0][1]).toEqual({
      clientId: "12345.67890",
      sessionId: "123456",
      fbp,
      fbc,
      eventSourceUrl: "https://hanbuddy.kr/activities/detail",
    });
  });

  it.each([
    [{ fbp: "fb.1.1720000000000.123", eventSourceUrl: undefined }, "missing URL"],
    [{ eventSourceUrl: "https://hanbuddy.kr/explore" }, "URL without a Meta ID"],
    [
      { fbc: "fb.1.1720000000000.Click", eventSourceUrl: "https://hanbuddy.kr/explore?q=raw" },
      "query",
    ],
    [
      { fbp: "fb.1.1720000000000.123", eventSourceUrl: "https://evil.example/explore" },
      "different origin",
    ],
    [
      {
        fbp: "fb.1.1720000000000.123",
        eventSourceUrl: "https://hanbuddy.kr/private-token/../explore",
      },
      "noncanonical dot segment",
    ],
    [
      {
        fbp: "fb.1.1720000000000.123",
        eventSourceUrl: "https://hanbuddy.kr/private-token/%2e%2e/explore",
      },
      "noncanonical encoded dot segment",
    ],
    [
      { fbp: "fb.1.1720000000000.bad", eventSourceUrl: "https://hanbuddy.kr/explore" },
      "invalid fbp",
    ],
  ])("rejects unsafe Meta attribution: %s (%s)", async (body, reason) => {
    enablePolicy();
    enableMeta();
    const context = createHash("sha256").update("access-token", "utf8").digest("hex");
    const response = await PUT(linkRequest(context, body), {
      params: Promise.resolve({ applicationId: "11" }),
    });
    expect(response.status, reason).toBe(400);
    expect(mockedPutBackend).not.toHaveBeenCalled();
  });

  it("fails closed when GA is not configured for the required client identifier", async () => {
    vi.stubEnv("NODE_ENV", "production");
    enableMeta();
    mockedPutBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { linked: true } },
      setCookies: [],
    });
    const context = createHash("sha256").update("access-token", "utf8").digest("hex");

    const response = await PUT(linkRequest(context), {
      params: Promise.resolve({ applicationId: "11" }),
    });

    expect(response.status).toBe(503);
    expect(mockedPutBackend).not.toHaveBeenCalled();
  });

  it("fails closed when Meta attribution is supplied without Pixel configuration", async () => {
    enablePolicy();
    mockedPutBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { linked: true } },
      setCookies: [],
    });
    const context = createHash("sha256").update("access-token", "utf8").digest("hex");

    const response = await PUT(
      linkRequest(context, {
        fbp: "fb.1.1720000000000.123456789",
        eventSourceUrl: "https://hanbuddy.kr/activities/booking",
      }),
      { params: Promise.resolve({ applicationId: "11" }) },
    );

    expect(response.status).toBe(503);
    expect(mockedPutBackend).not.toHaveBeenCalled();
  });

  it("rejects a same-origin URL outside the fixed analytics route templates", async () => {
    enablePolicy();
    enableMeta();
    const context = createHash("sha256").update("access-token", "utf8").digest("hex");

    const response = await PUT(
      linkRequest(context, {
        fbc: "fb.1.1720000000000.Click",
        eventSourceUrl: "https://hanbuddy.kr/users/private-path",
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
