import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getBackend } from "@/lib/auth/backend";
import { AUTH_COOKIES } from "@/lib/auth/cookies";
import { GET } from "./route";

vi.mock("@/lib/auth/backend", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/backend")>();
  return { ...actual, getBackend: vi.fn() };
});

const mockedGetBackend = vi.mocked(getBackend);
const context = { params: Promise.resolve({ applicationId: "11" }) };

describe("GET /api/applications/me/[applicationId]/cancellation-quote", () => {
  beforeEach(() => mockedGetBackend.mockReset());

  it("returns 401 without forwarding when unauthenticated", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/applications/me/11/cancellation-quote"),
      context,
    );

    expect(response.status).toBe(401);
    expect(mockedGetBackend).not.toHaveBeenCalled();
  });

  it("proxies the quote request without locale parameters", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { refundAmount: 36.5 } },
      setCookies: [],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/applications/me/11/cancellation-quote", {
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      context,
    );

    expect(mockedGetBackend).toHaveBeenCalledWith("/applications/me/11/cancellation-quote", {
      bearerToken: "access-token",
    });
    expect(response.status).toBe(200);
  });

  it("rejects non-numeric ids before forwarding", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/applications/me/nope/cancellation-quote", {
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      { params: Promise.resolve({ applicationId: "nope" }) },
    );

    expect(response.status).toBe(400);
    expect(mockedGetBackend).not.toHaveBeenCalled();
  });
});
