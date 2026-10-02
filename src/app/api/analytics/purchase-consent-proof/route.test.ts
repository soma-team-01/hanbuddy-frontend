import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { postBackend } from "@/lib/auth/backend";
import { POST } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, postBackend: vi.fn() };
});

const mockedPostBackend = vi.mocked(postBackend);
afterEach(() => vi.unstubAllEnvs());
const opaqueId = "A".repeat(43);
const grantedProof = `granted.v3.${opaqueId}`;

function enablePolicy() {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("GA_ENABLED", "true");
  vi.stubEnv("GA_MEASUREMENT_ID", "G-TEST");
}

function request(action: string, cookie?: string) {
  return new NextRequest("https://hanbuddy.kr/api/analytics/purchase-consent-proof", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://hanbuddy.kr",
      "x-analytics-request": "1",
      ...(cookie ? { cookie: `__Host-hb_measurement_consent=${cookie}; unrelated=secret` } : {}),
    },
    body: JSON.stringify({ action, ignored: "not-forwarded" }),
  });
}

describe("POST /api/analytics/purchase-consent-proof", () => {
  beforeEach(() => mockedPostBackend.mockReset());
  afterEach(() => vi.unstubAllEnvs());

  it("fails closed without enabled configuration before forwarding", async () => {
    const req = new NextRequest("https://hanbuddy.kr/api/analytics/purchase-consent-proof", {
      method: "POST",
      headers: {
        origin: "https://hanbuddy.kr",
        "content-type": "application/json",
        "x-analytics-request": "1",
      },
      body: JSON.stringify({ action: "ACCEPT" }),
    });
    expect((await POST(req)).status).toBe(503);
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

    const response = await POST(request("ACCEPT"));

    expect(mockedPostBackend).toHaveBeenCalledWith(
      "/analytics/purchase-consent-proof",
      { action: "ACCEPT" },
      { origin: "https://hanbuddy.kr", analyticsRequest: true },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
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
        cookieHeader: `__Host-hb_measurement_consent=${grantedProof}`,
        origin: "https://hanbuddy.kr",
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

it.each(["granted.v1.legacy", `granted.v3.${"A".repeat(42)}B`])(
  "rejects legacy/noncanonical IDs without automatic migration: %s",
  async (proof) => {
    enablePolicy();
    mockedPostBackend.mockReset();
    const response = await POST(request("ACCEPT", proof));
    expect(response.status).toBe(410);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  },
);
it("forwards denied v3 on explicit ACCEPT so the server enforces revocation ACK", async () => {
  enablePolicy();
  mockedPostBackend.mockReset();
  mockedPostBackend.mockResolvedValue({
    status: 409,
    payload: { isSuccess: false, code: "ANALYTICS_LINK_CONFLICT", message: "private" },
    setCookies: [],
  });
  const denied = grantedProof.replace("granted", "denied");
  const response = await POST(request("ACCEPT", denied));
  expect(response.status).toBe(409);
  expect(mockedPostBackend).toHaveBeenCalledExactlyOnceWith(
    "/analytics/purchase-consent-proof",
    { action: "ACCEPT" },
    {
      cookieHeader: `__Host-hb_measurement_consent=${denied}`,
      origin: "https://hanbuddy.kr",
      analyticsRequest: true,
    },
  );
});

it.each(["https://preview.example", "http://localhost:3000", "https://evil.example"])(
  "does not trust Host/forwarded headers over browser Origin %s",
  async (origin) => {
    enablePolicy();
    mockedPostBackend.mockReset();
    const req = request("ACCEPT");
    req.headers.set("origin", origin);
    req.headers.set("host", "hanbuddy.kr");
    req.headers.set("x-forwarded-host", "hanbuddy.kr");
    expect((await POST(req)).status).toBe(403);
    expect(mockedPostBackend).not.toHaveBeenCalled();
  },
);
it("keeps server policy mismatch410 terminal without issuing a new acceptance", async () => {
  enablePolicy();
  mockedPostBackend.mockReset();
  mockedPostBackend.mockResolvedValue({
    status: 410,
    payload: { isSuccess: false, code: "ANALYTICS_REVOKED_OR_EXPIRED", message: "policy mismatch" },
    setCookies: [],
  });
  const response = await POST(request("RESTORE", grantedProof));
  expect(response.status).toBe(410);
  expect(mockedPostBackend).toHaveBeenCalledTimes(1);
  expect(mockedPostBackend.mock.calls[0][1]).toEqual({
    action: "RESTORE",
  });
});
