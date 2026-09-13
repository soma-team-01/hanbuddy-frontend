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

describe("GET /api/applications/[applicationId]/activity", () => {
  beforeEach(() => mockedGetBackend.mockReset());

  it("returns 401 without forwarding when unauthenticated", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/applications/11/activity"),
      context,
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mockedGetBackend).not.toHaveBeenCalled();
  });

  it("forwards the private activity request with language and display currency", async () => {
    mockedGetBackend.mockResolvedValue({
      status: 200,
      payload: { isSuccess: true, code: "200", message: "ok", result: { applicationId: 11 } },
      setCookies: [],
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/applications/11/activity?language=KO&displayCurrency=KRW",
        { headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` } },
      ),
      context,
    );

    expect(mockedGetBackend).toHaveBeenCalledWith(
      "/applications/11/activity?language=KO&displayCurrency=KRW",
      { bearerToken: "access-token" },
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects non-numeric application ids", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/applications/nope/activity", {
        headers: { cookie: `${AUTH_COOKIES.accessToken}=access-token` },
      }),
      { params: Promise.resolve({ applicationId: "nope" }) },
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mockedGetBackend).not.toHaveBeenCalled();
  });
});
